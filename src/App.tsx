/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { LandingPage } from './components/LandingPage';
import { PokerTable } from './components/PokerTable';
import { useGameStore } from './store/gameStore';
import { RotateCw, Maximize, Play, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { voiceCommandService } from './services/voiceCommandService';
import { soundService } from './services/soundService';
import { AppActions } from './components/AppActions';

export default function App() {
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [interactionNeeded, setInteractionNeeded] = useState(true);
  const [fsError, setFsError] = useState<string | null>(null);
  const [isSmallLandscape, setIsSmallLandscape] = useState(false);

  const getMobileStatus = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    const isMobileAgent = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isTouchOnly = window.matchMedia('(pointer: coarse)').matches;
    const hasMaxTouch = navigator.maxTouchPoints > 0;
    
    const maxDimension = Math.max(window.innerWidth, window.innerHeight);
    const isSmartphoneSize = maxDimension <= 1440;
    
    const isSmartphone = (isMobileAgent && !isIPad) || ((hasMaxTouch || isTouchOnly) && isSmartphoneSize && !isIPad);
    return isSmartphone || isIPad;
  }, []);

  useEffect(() => {
    let resizeTimer: any;
    
    const checkOrientation = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const portrait = window.innerHeight > window.innerWidth;
        const mobile = getMobileStatus();
        const isSmallLand = !portrait && (window.innerWidth <= 1280 || window.innerHeight < 680 || mobile);
        
        setIsSmallLandscape(isSmallLand);
        setIsPortrait(portrait);
        setIsMobile(mobile);
      }, 150);
    };

    const handleFullscreenChange = () => {
      const doc = document as any;
      const isFS = !!(
        doc.fullscreenElement || 
        doc.webkitFullscreenElement || 
        doc.webkitIsFullScreen || 
        doc.mozFullScreenElement || 
        doc.msFullscreenElement
      );
      setIsFullscreen(isFS);
      if (isFS) setFsError(null);
    };

    setIsMobile(getMobileStatus());
    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [getMobileStatus]);

  const handleInteraction = async () => {
    soundService.play('click');
    setFsError(null);

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    window.scrollTo(0, 0);

    try {
      if (voiceCommandService.isSupported()) {
        await voiceCommandService.requestPermission();
      }
    } catch (e) {
      console.warn("Mic permission failed", e);
    }

    if (isIOS) {
      setInteractionNeeded(false);
      return;
    }

    const targets = [
      document.documentElement,
      document.body,
      document.querySelector('#root')
    ].filter(Boolean) as HTMLElement[];

    let success = false;
    for (const target of targets) {
      const elem = target as any;
      const requestFS = elem.requestFullscreen || 
                        elem.webkitRequestFullscreen || 
                        elem.webkitRequestFullScreen ||
                        elem.mozRequestFullScreen || 
                        elem.msRequestFullscreen;
      
      if (requestFS) {
        try {
          if (isMobile) await new Promise(r => setTimeout(r, 100));
          const res = requestFS.call(elem);
          if (res instanceof Promise) await res;
          success = true;
          break;
        } catch (err) {
          console.warn("Target FS failed", err);
        }
      }
    }

    if (success || fsError) {
      document.body.style.overflow = 'hidden';
      if (screen.orientation && (screen.orientation as any).lock) {
        try {
          await (screen.orientation as any).lock('landscape');
        } catch (e) {}
      }
      setInteractionNeeded(false);
    } else {
      setFsError("Fullscreen failed. Best experience in Chrome/Brave. Tap again to play anyway.");
    }
  };
  const phase = useGameStore((state) => state.phase);
  const players = useGameStore((state) => state.players);
  const communityCards = useGameStore((state) => state.communityCards);
  const pot = useGameStore((state) => state.pot);
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const winners = useGameStore((state) => state.winners) || [];
  const winnersInfo = useGameStore((state) => state.winnersInfo) || [];
  const handCount = useGameStore((state) => state.handCount);
  const smallBlind = useGameStore((state) => state.smallBlind);
  const bigBlind = useGameStore((state) => state.bigBlind);
  const settings = useGameStore((state) => state.settings);
  const actionLog = useGameStore((state) => state.actionLog);
  const [wakeLock, setWakeLock] = useState<any>(null);

  // Screen Wake Lock implementation
  useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
          setWakeLock(wakeLockSentinel);
          
          wakeLockSentinel.addEventListener('release', () => {
            setWakeLock(null);
          });
        } catch (err) {
          console.warn(`${err.name}, ${err.message}`);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    // Request wake lock if in fullscreen OR voice commands are enabled
    if (isFullscreen || settings.voiceCommands) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      if (wakeLockSentinel) {
        wakeLockSentinel.release();
        wakeLockSentinel = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release();
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isFullscreen, settings.voiceCommands]);

  const isGameOver = useGameStore((state) => state.isGameOver);
  const winnerPlayerId = useGameStore((state) => state.winnerPlayerId);
  const minBet = useGameStore((state) => state.minBet);

  const initGame = useGameStore((state) => state.initGame);
  const performAction = useGameStore((state) => state.performAction);
  const resetGame = useGameStore((state) => state.resetGame);
  const restartSession = useGameStore((state) => state.restartSession);
  const setPhase = useGameStore((state) => state.setPhase);

  // Combine into a memoized object for the prop
  const gameState = useMemo(() => ({
    players,
    communityCards,
    pot,
    phase,
    currentPlayerIndex,
    winners,
    winnersInfo,
    handCount,
    smallBlind,
    bigBlind,
    settings,
    actionLog,
    isGameOver,
    winnerPlayerId,
    minBet,
    enableInsights: settings.enableInsights // shortcut for backward compatibility
  }), [
    players, communityCards, pot, phase, currentPlayerIndex, 
    winners, winnersInfo, handCount, smallBlind, bigBlind, 
    settings, actionLog, isGameOver, winnerPlayerId, minBet
  ]);

  const handleStart = useCallback((opp: number, chips: number, diff: any, names: string[], design: string, insights: boolean, settings: any) => {
    initGame(opp, chips, diff, names, design, insights, settings);
  }, [initGame]);

  const handleQuit = useCallback(() => {
    setPhase('setup');
  }, [setPhase]);

  return (
    <div className="w-full h-[100dvh] bg-[#0a0a0a] touch-none overflow-hidden relative">
      <AnimatePresence mode="wait">
        {isMobile && isPortrait ? (
          <motion.div 
            key="portrait-gatekeeper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20000] bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center"
          >
            {/* Game Brand / Logo */}
            <div className="mb-16">
              <div className="flex flex-col items-center">
                <span className="text-sm font-black uppercase tracking-[0.4em] text-zinc-500 mb-1">Elite Stakes</span>
                <h1 className="text-6xl font-black tracking-tighter uppercase gold-glow leading-none bg-gradient-to-b from-[#f5e492] via-[#d4af37] to-[#b8860b] bg-clip-text text-transparent">River's Edge</h1>
                <span className="text-xl font-bold text-[#d4af37] uppercase tracking-[0.3em] mt-1 italic">Poker</span>
              </div>
            </div>

            <motion.div
              animate={{ rotate: 90 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="mb-8"
            >
              <RotateCw className="w-12 h-12 text-[#d4af37]" />
            </motion.div>
            
            <div className="space-y-4 max-w-xs mx-auto">
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Landscape Mode Required</h2>
              <p className="text-zinc-500 leading-relaxed text-xs font-bold uppercase tracking-widest px-4">
                This game is optimized for landscape mode. Please rotate your phone to landscape to begin.
              </p>
            </div>
          </motion.div>
        ) : isMobile && interactionNeeded ? (
          <motion.div 
            key="interaction-gatekeeper"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[20001] bg-black flex flex-col items-center justify-center p-4 md:p-6 text-center"
          >
            {/* Game Logo on splash */}
            <div className={`mb-6 md:mb-12 transition-all duration-500 flex flex-col items-center ${isSmallLandscape ? 'scale-75' : ''}`}>
              <div className="flex -space-x-3 mb-2">
                <div className="w-8 h-12 bg-gradient-to-br from-[#f5e492] via-[#d4af37] to-[#b8860b] rounded-[4px] border border-white/20 shadow-lg flex flex-col items-center justify-between p-1 z-10 -rotate-12">
                  <span className="text-[10px] font-black self-start leading-none text-black">A</span>
                  <span className="text-sm leading-none text-black select-none">♠</span>
                  <span className="text-[10px] font-black self-end rotate-180 leading-none text-black">A</span>
                </div>
                <div className="w-8 h-12 bg-gradient-to-br from-[#f5e492] via-[#d4af37] to-[#b8860b] rounded-[4px] border border-white/20 shadow-lg flex flex-col items-center justify-between p-1 rotate-12">
                  <span className="text-[10px] font-black self-start leading-none text-red-900">A</span>
                  <span className="text-sm leading-none text-red-900 select-none">♥</span>
                  <span className="text-[10px] font-black self-end rotate-180 leading-none text-red-900">A</span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mb-0.5">Elite Stakes</span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase gold-glow leading-none bg-gradient-to-b from-[#f5e492] via-[#d4af37] to-[#b8860b] bg-clip-text text-transparent">River's Edge</h1>
              <span className="text-sm md:text-base font-bold text-[#d4af37] uppercase tracking-[0.3em] mt-0.5 italic">Poker</span>
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleInteraction()}
              className="group relative flex flex-col items-center gap-4"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 bg-[#d4af37] rounded-full flex items-center justify-center border-4 border-black shadow-[0_0_50px_rgba(212,175,55,0.4)]">
                <Play className="w-8 h-8 md:w-10 md:h-10 text-black fill-current ml-1" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">TAP TO PLAY</h2>
                <p className="text-[#d4af37] text-[10px] md:text-xs font-black uppercase tracking-[0.3em] animate-pulse">Enter Arena Full Screen</p>
              </div>
            </motion.button>
            
            {fsError && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-red-500 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-6 py-2 rounded-full"
              >
                {fsError}
              </motion.p>
            )}

            <div className="absolute bottom-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-zinc-600">
                 <Maximize className="w-3 h-3" />
                 <span className="text-[8px] font-black uppercase tracking-[0.2em]">Fullscreen Experience Optimized</span>
              </div>
              <p className="text-zinc-700 text-[7px] font-bold uppercase tracking-[0.4em]">Works best on Brave & Chrome</p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="game-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full overflow-hidden"
          >
            {phase === 'setup' ? (
              <LandingPage onStart={(...args) => {
                handleStart(...args);
              }} />
            ) : (
              <PokerTable 
                gameState={gameState} 
                onAction={performAction} 
                onReset={resetGame}
                onRestart={restartSession}
                onQuit={handleQuit}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Install + Share: on the start screens only, never over a hand in play */}
      {(phase === 'setup' || (isMobile && (isPortrait || interactionNeeded))) && <AppActions />}
    </div>
  );
}

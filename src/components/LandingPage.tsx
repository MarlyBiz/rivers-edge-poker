import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import { User, Bot, HelpCircle, Settings, Play, Music, Volume2, Moon, Sun, Heart, RotateCcw, Info, Minimize, Maximize, ShieldCheck, Zap, TrendingUp, MessageSquare, Sparkles, Gauge, Monitor, FastForward } from "lucide-react";
import { CardBack } from "./Card";
import { HowToPlayModal } from "./HowToPlayModal";
import { BOT_NAMES } from "../lib/gameLogic";
import { soundService } from "../services/soundService";
import { voiceCommandService } from "../services/voiceCommandService";
import { GameSettings, GameDifficulty } from "../types";
import { Mic } from "lucide-react";

interface LandingPageProps {
  onStart: (opponents: number, startingChips: number, difficulty: GameDifficulty, names: string[], design: string, enableInsights: boolean, settings: GameSettings) => void;
}

export function LandingPage({ onStart }: LandingPageProps) {
  const [activeTab, setActiveTab] = useState<'main' | 'settings'>('main');
  const [opponents, setOpponents] = useState(3);
  const [chips, setChips] = useState(10000);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const [userName, setUserName] = useState("Player 1");
  const [botNames, setBotNames] = useState<string[]>([]);
  const [cardDesign, setCardDesign] = useState("classic-red");
  const [showTutorial, setShowTutorial] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallLandscape, setIsSmallLandscape] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);

  useEffect(() => {
    const checkMedia = () => {
      const isMobileAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const iPhone = /iPhone/i.test(navigator.userAgent);
      setIsIPhone(iPhone);
      const isTouchOnly = window.matchMedia('(pointer: coarse)').matches;
      const maxDimension = Math.max(window.innerWidth, window.innerHeight);
      // Catch high-end flagship phones (1440p logically scaled to high DPI widths)
      const isSmartphoneSize = maxDimension <= 1440;
      const hasMaxTouch = navigator.maxTouchPoints > 0;
      
      // If screen is physically smaller than 1025px wide or 600px high, it is ALWAYS mobile/tablet size
      const isSmallScreen = window.innerWidth < 1025 || window.innerHeight < 600;
      
      const mobile = isMobileAgent || (hasMaxTouch && isSmartphoneSize) || (isTouchOnly && isSmartphoneSize) || isSmallScreen;
      setIsMobile(mobile);
      
      const isSmallLand = (isSmartphoneSize || window.innerWidth <= 1280 || window.innerHeight < 780 || mobile) && window.innerWidth > window.innerHeight;
      setIsSmallLandscape(isSmallLand);
    };
    checkMedia();
    window.addEventListener('resize', checkMedia);
    return () => window.removeEventListener('resize', checkMedia);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      setIsFullscreen(!!(
        doc.fullscreenElement || 
        doc.webkitFullscreenElement || 
        doc.webkitIsFullScreen || 
        doc.mozFullScreenElement || 
        doc.msFullscreenElement
      ));
    };
    
    handleFullscreenChange();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    soundService.play('click');

    // Handle iPhone specifically as it doesn't support the Fullscreen API for elements
    if (isIPhone) {
      setShowFullscreenHint(true);
      setTimeout(() => setShowFullscreenHint(false), 5000);
      return;
    }

    const doc = document as any;
    const isCurrentlyFullscreen = !!(
      doc.fullscreenElement || 
      doc.webkitFullscreenElement || 
      doc.webkitIsFullScreen || 
      doc.mozFullScreenElement || 
      doc.msFullscreenElement
    );
    
    if (!isCurrentlyFullscreen) {
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
            // A tiny delay helps mobile browsers successfully transition
            await new Promise(r => setTimeout(r, 100));
            const res = requestFS.call(elem);
            if (res instanceof Promise) await res;
            success = true;
            break;
          } catch (err) {
            console.warn("Fullscreen attempt failed", err);
          }
        }
      }

      if (!success) {
        setShowFullscreenHint(true);
        setTimeout(() => setShowFullscreenHint(false), 4000);
      }
    } else {
      const exitFS = doc.exitFullscreen || 
                     doc.webkitExitFullscreen || 
                     doc.webkitCancelFullScreen ||
                     doc.mozCancelFullScreen || 
                     doc.msExitFullscreen;
      if (exitFS) {
        try {
          await exitFS.call(doc);
        } catch (err) {
          console.warn("Exit fullscreen failed", err);
        }
      }
    }
  };

  const [settings, setSettings] = useState<GameSettings>({
    soundEffects: true,
    showPotOdds: true,
    highlightBestHand: true,
    turboMode: false,
    showHandRankingsHelper: true,
    enableAiChat: true,
    animationIntensity: 'medium',
    theme: 'dark',
    tableColor: 'green',
    showTips: false,
    enableInsights: true,
    enableTimer: false,
    showTooltips: false,
    voiceCommands: true,
    rabbitHunting: true,
    cardBackDesign: 'classic-red'
  });

  const tableColors = [
    { id: 'green', hex: '#0a4225', label: 'Classic Green' },
    { id: 'red', hex: '#630a0a', label: 'Casino Red' },
    { id: 'blue', hex: '#0a2342', label: 'Navy Blue' },
    { id: 'burgundy', hex: '#420a1c', label: 'Burgundy' },
    { id: 'black', hex: '#111111', label: 'Black' },
    { id: 'purple', hex: '#280a42', label: 'Purple' },
    { id: 'forest', hex: '#143306', label: 'Forest' },
    { id: 'chocolate', hex: '#3d1c02', label: 'Chocolate' },
    { id: 'charcoal', hex: '#222222', label: 'Charcoal' },
    { id: 'teal', hex: '#063333', label: 'Teal' },
    { id: 'olive', hex: '#333306', label: 'Olive' },
    { id: 'navy', hex: '#000033', label: 'True Navy' },
  ];

  const designs = [
    'classic-red', 'classic-blue', 'classic-green', 'classic-black', 
    'royal-gold', 'royal-silver', 'carbon-fiber', 'geometric-blue', 
    'geometric-red', 'midnight-lace', 'casino-vintage', 'diamond-minimal',
    'abstract-wave', 'floral-regal', 'neon-circuit', 'dragon-scale',
    'poker-lattice', 'marina-blue', 'executive-grey', 'imperial-purple'
  ];

  useEffect(() => {
    // Randomize initial bot names
    const shuffled = [...BOT_NAMES].sort(() => 0.5 - Math.random());
    setBotNames(shuffled.slice(0, 5));
  }, []);

  const handleStart = () => {
    soundService.play('click');
    const allNames = [userName, ...botNames.slice(0, opponents)];
    onStart(opponents, chips, difficulty, allNames, cardDesign, settings.enableInsights, settings);
  };

  const updateBotName = (index: number, name: string) => {
    const newNames = [...botNames];
    newNames[index] = name;
    setBotNames(newNames);
  };

  const toggleSetting = (key: keyof GameSettings) => {
    soundService.play('click');
    
    setSettings(prev => {
      const newVal = !prev[key];
      
      if (key === 'voiceCommands' && newVal) {
        voiceCommandService.requestPermission().catch(console.error);
      }

      if (key === 'showTips') {
        return { ...prev, showTips: newVal, showTooltips: newVal };
      }
      return { ...prev, [key]: newVal };
    });
  };

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center bg-background relative overflow-y-auto custom-scrollbar ${isSmallLandscape ? 'p-0.5' : 'p-2 sm:p-4 md:p-6'}`}>
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] border-[1px] border-[#d4af37] rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-[1000px] w-full h-fit max-h-full z-10 flex flex-col items-center justify-center min-h-0 py-4"
      >
        <div className={`shrink-0 flex items-center justify-center transition-all duration-300 ${isSmallLandscape ? 'h-8 mb-0.5 mt-0.5 scale-75' : 'flex-col mb-2.5 md:mb-4'}`}>
           {/* Left Ace (Landscape only) */}
           {isSmallLandscape && (
              <motion.div 
                initial={{ rotate: -15, x: -20, opacity: 0 }}
                animate={{ rotate: -15, x: 0, opacity: 1 }}
                className="scale-[0.25] origin-right mr-1"
              >
                <div className="w-10 h-14 bg-gradient-to-br from-[#f5e492] via-[#d4af37] to-[#b8860b] rounded-[4px] border border-white/20 shadow-lg flex flex-col items-center justify-between p-1">
                  <span className="text-xs font-black self-start leading-none text-black/90">A</span>
                  <span className="text-base leading-none text-black/90 select-none">♠</span>
                  <span className="text-xs font-black self-end rotate-180 leading-none text-black/90">A</span>
                </div>
              </motion.div>
           )}

           {/* Logo Group (Standard View) */}
           {!isSmallLandscape && (
              <div className="flex -space-x-3 mb-2">
                <motion.div 
                  initial={{ rotate: -15, y: 10, opacity: 0 }}
                  animate={{ rotate: -15, y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="w-8 h-12 md:w-10 md:h-14 bg-gradient-to-br from-[#f5e492] via-[#d4af37] to-[#b8860b] rounded-[4px] border border-white/20 shadow-lg flex flex-col items-center justify-between p-1 z-10"
                >
                  <span className="text-[10px] md:text-xs font-black self-start leading-none text-black/90">A</span>
                  <span className="text-sm md:text-base leading-none text-black/90 select-none">♠</span>
                  <span className="text-[10px] md:text-xs font-black self-end rotate-180 leading-none text-black/90">A</span>
                </motion.div>
                <motion.div 
                  initial={{ rotate: 10, y: 10, opacity: 0 }}
                  animate={{ rotate: 10, y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-8 h-12 md:w-10 md:h-14 bg-gradient-to-br from-[#f5e492] via-[#d4af37] to-[#b8860b] rounded-[4px] border border-white/20 shadow-lg flex flex-col items-center justify-between p-1"
                >
                  <span className="text-[10px] md:text-xs font-black self-start leading-none text-red-900">A</span>
                  <span className="text-sm md:text-base leading-none text-red-900 select-none">♥</span>
                  <span className="text-[10px] md:text-xs font-black self-end rotate-180 leading-none text-red-900">A</span>
                </motion.div>
              </div>
           )}

           {/* Game Title */}
           <div className={`flex flex-col items-center transition-all duration-300 ${isSmallLandscape ? 'scale-[0.55] -my-3' : 'mb-2 md:mb-6'}`}>
             <span className={`${isSmallLandscape ? 'text-[8px]' : 'text-[10px] md:text-sm'} font-black uppercase tracking-[0.4em] text-zinc-500 mb-0.5`}>Elite Stakes</span>
             <h1 className={`${isSmallLandscape ? 'text-2xl' : 'text-3xl md:text-6xl'} font-black tracking-tighter uppercase gold-glow leading-none bg-gradient-to-b from-[#f5e492] via-[#d4af37] to-[#b8860b] bg-clip-text text-transparent`}>
               River's Edge
             </h1>
             <span className={`${isSmallLandscape ? 'text-xs' : 'text-base md:text-xl'} font-bold text-[#d4af37] uppercase tracking-[0.3em] mt-0.5 italic`}>Poker</span>
           </div>

           {/* Right Ace (Landscape only) */}
           {isSmallLandscape && (
              <motion.div 
                initial={{ rotate: 10, x: 20, opacity: 0 }}
                animate={{ rotate: 10, x: 0, opacity: 1 }}
                className="scale-[0.25] origin-left ml-1"
              >
                <div className="w-10 h-14 bg-gradient-to-br from-[#f5e492] via-[#d4af37] to-[#b8860b] rounded-[4px] border border-white/20 shadow-lg flex flex-col items-center justify-between p-1">
                  <span className="text-xs font-black self-start leading-none text-red-900">A</span>
                  <span className="text-base leading-none text-red-900 select-none">♥</span>
                  <span className="text-xs font-black self-end rotate-180 leading-none text-red-900">A</span>
                </div>
              </motion.div>
           )}
        </div>

        <UICard className={`w-full border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isSmallLandscape ? 'flex-1 rounded-t-xl overflow-hidden border-b-0' : 'rounded-2xl p-1 md:p-2 flex-1 min-h-0'}`}>
          <div className="flex border-b border-white/5 relative shrink-0 overflow-x-auto no-scrollbar bg-black/40">
            <button 
              onClick={() => setActiveTab('main')}
              className={`flex-1 ${isSmallLandscape ? 'py-1.5' : 'py-4'} text-[8px] md:text-[10px] uppercase font-bold tracking-[0.1em] md:tracking-[0.2em] transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'main' ? 'text-[#d4af37] border-[#d4af37] bg-[#d4af37]/5' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
            >
              <Play className="w-2.5 h-2.5" /> <span className={isSmallLandscape ? "hidden xs:inline" : ""}>Configuration</span><span className={isSmallLandscape ? "xs:hidden" : "hidden"}>Config</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 ${isSmallLandscape ? 'py-1.5' : 'py-4'} text-[8px] md:text-[10px] uppercase font-bold tracking-[0.1em] md:tracking-[0.2em] transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === 'settings' ? 'text-[#d4af37] border-[#d4af37] bg-[#d4af37]/5' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
            >
              <Settings className="w-2.5 h-2.5" /> <span className={isSmallLandscape ? "hidden xs:inline" : ""}>Preferences</span><span className={isSmallLandscape ? "xs:hidden" : "hidden"}>Prefs</span>
            </button>
            <button 
              onClick={() => {
                soundService.play('click');
                setShowTutorial(true);
              }}
              className={`flex-1 ${isSmallLandscape ? 'py-1.5' : 'py-4'} text-[8px] md:text-[10px] uppercase font-bold tracking-[0.1em] md:tracking-[0.2em] transition-colors border-b-2 border-transparent text-zinc-500 hover:text-white flex items-center justify-center gap-2 whitespace-nowrap`}
            >
              <Info className="w-2.5 h-2.5" /> How to Play
            </button>
            <button 
              onClick={toggleFullscreen}
              className={`flex-1 ${isSmallLandscape ? 'py-1.5' : 'py-4'} text-[8px] md:text-[10px] uppercase font-bold tracking-[0.1em] md:tracking-[0.2em] transition-all border-b-2 flex items-center justify-center gap-2 ${
                isFullscreen 
                  ? 'text-red-500 border-red-500 bg-red-500/5' 
                  : 'text-[#d4af37] border-transparent hover:bg-white/5'
              }`}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-2.5 h-2.5 shrink-0" /> : <Maximize className="w-2.5 h-2.5 shrink-0" />}
              <span className={isSmallLandscape ? "hidden xs:inline" : ""}>{isFullscreen ? "Exit Full Screen" : "Full Screen"}</span>
              {isSmallLandscape && <span className="xs:hidden">{isFullscreen ? "Exit" : "Full"}</span>}
            </button>
          </div>

          <CardContent className={`${isSmallLandscape ? 'p-1.5 space-y-2' : 'p-4 md:p-6 space-y-4 md:space-y-6'} flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scroll-smooth`}>
            <AnimatePresence mode="wait">
              {activeTab === 'main' ? (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={isSmallLandscape ? "space-y-2" : "space-y-8"}
                >
                  <div className={`grid grid-cols-1 md:grid-cols-2 ${isSmallLandscape ? 'gap-2' : 'gap-6'}`}>
                    <div className={isSmallLandscape ? "space-y-1" : "space-y-3"}>
                      <Label className="text-[9px] uppercase text-[#d4af37] font-bold tracking-wider flex items-center gap-2">
                        <User className="w-2.5 h-2.5" /> Hero Name
                      </Label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Your Name"
                        className="w-full bg-[#111] border border-zinc-800 rounded px-2 py-1 md:py-2 text-xs focus:border-[#d4af37] transition-all outline-none"
                      />
                    </div>

                    <div className={isSmallLandscape ? "space-y-1" : "space-y-3"}>
                      <Label className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider">Starting Chips</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-xs">$</span>
                        <input
                          type="text"
                          value={chips.toLocaleString()}
                          onChange={(e) => {
                             const rawVal = e.target.value.replace(/[^0-9]/g, '');
                             const val = parseInt(rawVal) || 0;
                             setChips(Math.min(1000000, val));
                          }}
                          onBlur={() => {
                             setChips(prev => Math.max(100, Math.min(1000000, prev)));
                          }}
                          className="w-full bg-[#111] border border-zinc-800 rounded px-2 py-1 md:py-2 pl-6 text-xs font-mono focus:border-[#d4af37] outline-none text-white transition-all focus:ring-1 focus:ring-[#d4af37]/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={isSmallLandscape ? "space-y-1" : "space-y-4"}>
                    <Label className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider flex items-center gap-2">
                       <ShieldCheck className="w-2.5 h-2.5 text-[#d4af37]" /> AI Difficulty
                    </Label>
                    <div className={isSmallLandscape ? "grid grid-cols-3 gap-1" : "grid grid-cols-3 gap-3"}>
                      {(['easy', 'medium', 'hard'] as const).map((level) => (
                        <button
                          key={level}
                          className={`${isSmallLandscape ? 'py-1' : 'py-3'} rounded-lg text-xs transition-all duration-200 border flex flex-col items-center gap-1 ${
                            difficulty === level 
                              ? "bg-[#d4af37]/10 border-[#d4af37] text-[#d4af37]" 
                              : "bg-[#111] border-zinc-800 text-zinc-500 hover:border-[#d4af37]"
                          }`}
                          onClick={() => {
                            soundService.play('click');
                            setDifficulty(level);
                          }}
                        >
                          <span className="uppercase font-bold tracking-widest">{level}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={isSmallLandscape ? "space-y-1" : "space-y-4"}>
                    <Label className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider">Table Size ({opponents + 1})</Label>
                    <div className={isSmallLandscape ? "grid grid-cols-5 gap-1" : "grid grid-cols-5 gap-2"}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          className={`py-1.5 rounded text-xs transition-all duration-200 border ${
                            opponents === n 
                              ? "bg-[#d4af37]/10 border-[#d4af37] text-[#d4af37]" 
                              : "bg-[#111] border-zinc-800 text-zinc-500 hover:border-[#d4af37]"
                          }`}
                          onClick={() => {
                            soundService.play('click');
                            setOpponents(n);
                          }}
                        >
                          {n + 1}
                        </button>
                      ))}
                    </div>
                    
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isSmallLandscape ? 'gap-1 pt-0.5' : 'gap-3 pt-2'}`}>
                      {Array.from({ length: opponents }).map((_, i) => (
                        <div key={i} className={`flex items-center gap-2 bg-[#111] border border-zinc-800 ${isSmallLandscape ? 'p-1' : 'p-2'} rounded`}>
                          <Bot className="w-2.5 h-2.5 text-zinc-600" />
                          <input
                            type="text"
                            value={botNames[i] || ""}
                            onChange={(e) => updateBotName(i, e.target.value)}
                            placeholder={`Bot ${i+1}`}
                            className="bg-transparent border-none text-[10px] md:text-[12px] focus:ring-0 outline-none w-full text-zinc-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={isSmallLandscape ? "space-y-4" : "space-y-10"}
                >
                  {/* Gameplay & Sound Group */}
                  <div className={isSmallLandscape ? "space-y-2" : "space-y-4"}>
                    <h3 className="text-[10px] uppercase text-[#d4af37] font-bold tracking-[0.2em] flex items-center gap-2 text-zinc-500">
                       Gameplay & Sound
                    </h3>
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isSmallLandscape ? 'gap-2' : 'gap-4'}`}>
                      {[
                        { key: 'soundEffects', label: 'Mute All Sound Effects', icon: <Volume2 className="w-4 h-4 text-zinc-500" />, invert: true },
                        { key: 'turboMode', label: 'Turbo Mode (Faster)', icon: <Zap className="w-4 h-4 text-zinc-500" /> },
                        { key: 'showTips', label: 'Gameplay Tips & Tooltips', icon: <HelpCircle className="w-4 h-4 text-[#d4af37]" /> },
                        { key: 'voiceCommands', label: 'Voice Commands (BETA)', icon: <Mic className="w-4 h-4 text-zinc-500" /> },
                      ].map((pkg) => (
                        <label key={pkg.key} className={`flex items-center justify-between bg-[#111] border border-zinc-800 ${isSmallLandscape ? 'p-2' : 'p-3'} rounded cursor-pointer hover:border-zinc-700 transition-colors`}>
                          <div className="flex items-center gap-3">
                            <span className={isSmallLandscape ? "scale-75 origin-left" : ""}>{pkg.icon}</span>
                            <span className={`${isSmallLandscape ? 'text-[9px]' : 'text-xs'} text-zinc-300 uppercase tracking-wider font-medium`}>{pkg.label}</span>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={pkg.invert ? !(settings as any)[pkg.key] : (settings as any)[pkg.key]} 
                            onChange={() => toggleSetting(pkg.key as any)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 accent-[#d4af37]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Assistance & HUD Group */}
                  <div className={isSmallLandscape ? "space-y-2" : "space-y-4"}>
                    <h3 className="text-[10px] uppercase text-[#d4af37] font-bold tracking-[0.2em] flex items-center gap-2 text-zinc-500">
                      Assistance & HUD
                    </h3>
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isSmallLandscape ? 'gap-2' : 'gap-4'}`}>
                      {[
                        { key: 'enableInsights', label: 'Win Probability', icon: <TrendingUp className="w-4 h-4 text-zinc-500" /> },
                        { key: 'showPotOdds', label: 'Pot Odds Percentage', icon: <HelpCircle className="w-4 h-4 text-zinc-500" /> },
                        { key: 'enableAiChat', label: 'AI Chat Phrases', icon: <MessageSquare className="w-4 h-4 text-zinc-500" /> },
                        { key: 'highlightBestHand', label: 'Highlight Hand Results', icon: <Sparkles className="w-4 h-4 text-zinc-500" /> },
                        { 
                          key: 'enableTimer', 
                          label: '20 Second Timer', 
                          icon: <Gauge className="w-4 h-4 text-zinc-500" />
                        },
                        { key: 'showHandRankingsHelper', label: 'Hand Guide Button', icon: <Monitor className="w-4 h-4 text-zinc-500" /> },
                        { key: 'rabbitHunting', label: 'Rabbit Hunting', icon: <FastForward className="w-4 h-4 text-zinc-500" /> },
                      ].map((pkg) => (
                        <label key={pkg.key} className={`flex items-center justify-between bg-[#111] border border-zinc-800 ${isSmallLandscape ? 'p-2' : 'p-3'} rounded cursor-pointer hover:border-zinc-700 transition-colors`}>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <span className={isSmallLandscape ? "scale-75 origin-left" : ""}>{pkg.icon}</span>
                              <span className={`${isSmallLandscape ? 'text-[9px]' : 'text-xs'} text-zinc-300 uppercase tracking-wider font-medium`}>{pkg.label}</span>
                            </div>
                            {(pkg as any).note && !isSmallLandscape && (
                              <span className="text-[10px] text-zinc-500 ml-7 leading-tight max-w-[200px]">
                                {(pkg as any).note}
                              </span>
                            )}
                          </div>
                          <input 
                            type="checkbox" 
                            checked={(settings as any)[pkg.key]} 
                            onChange={() => toggleSetting(pkg.key as any)}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 accent-[#d4af37]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Visuals Group */}
                  <div className={isSmallLandscape ? "space-y-3" : "space-y-4"}>
                    <h3 className="text-[10px] uppercase text-[#d4af37] font-bold tracking-[0.2em] flex items-center gap-2 text-zinc-500">
                       Visual Environment
                    </h3>
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${isSmallLandscape ? 'gap-2' : 'gap-4'}`}>
                      <div className={`bg-[#111] border border-zinc-800 ${isSmallLandscape ? 'p-2' : 'p-3'} rounded space-y-2 md:col-span-2`}>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Interface Theme</span>
                        <div className="flex gap-2">
                          {[
                            { val: 'dark', icon: <Moon className="w-3 h-3" /> },
                            { val: 'light', icon: <Sun className="w-3 h-3" /> }
                          ].map(t => (
                            <button
                              key={t.val}
                              onClick={() => setSettings(prev => ({ ...prev, theme: t.val as any }))}
                              className={`flex-1 py-4 md:py-3 rounded-[12px] flex items-center justify-center gap-3 text-[10px] uppercase font-black border transition-all ${settings.theme === t.val ? 'bg-white text-black border-transparent shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                            >
                              {t.icon} {t.val} Mode
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={`bg-[#111] border border-zinc-800 ${isSmallLandscape ? 'p-2' : 'p-3'} rounded space-y-2 md:col-span-2`}>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Table Felt Color Selection</span>
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1 md:gap-2">
                          {tableColors.map(color => (
                            <button
                              key={color.id}
                              onClick={() => {
                                soundService.play('tick');
                                setSettings(prev => ({ ...prev, tableColor: color.id as any }));
                              }}
                              className={`group relative flex flex-col items-center gap-1 p-1 rounded-lg border transition-all ${settings.tableColor === color.id ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-zinc-800 bg-[#0a0a0a] hover:border-zinc-600'}`}
                            >
                              <div 
                                className="w-4 h-4 md:w-5 md:h-5 rounded-full border border-white/10 shadow-inner" 
                                style={{ backgroundColor: color.hex }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={`bg-[#111] border border-zinc-800 ${isSmallLandscape ? 'p-1.5' : 'p-3'} rounded space-y-1.5 md:col-span-2`}>
                        <span className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-wider font-bold block text-center">Card Design Selection</span>
                        <div className={`grid grid-cols-10 ${isSmallLandscape ? 'gap-0.5' : 'gap-1'}`}>
                          {designs.map((design) => (
                            <button
                              key={design}
                              onClick={() => {
                                soundService.play('tick');
                                setCardDesign(design);
                              }}
                              className={`relative aspect-[2.5/4] rounded-sm overflow-hidden border-2 transition-all group ${
                                cardDesign === design 
                                  ? "border-[#d4af37] scale-110 shadow-[0_0_10px_rgba(212,175,55,0.3)] z-10" 
                                  : "border-zinc-900 opacity-40 hover:opacity-100"
                              }`}
                              title={design.replace('-', ' ')}
                            >
                              <div className="absolute inset-0 scale-[0.55] origin-center">
                                <CardBack design={design} />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={`bg-[#111] border border-zinc-800 ${isSmallLandscape ? 'p-2' : 'p-3'} rounded space-y-2 md:col-span-2`}>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">Animation Flow</span>
                        <div className="flex gap-2">
                          {(['low', 'medium', 'high'] as const).map(tier => (
                            <button
                              key={tier}
                              onClick={() => setSettings(prev => ({ ...prev, animationIntensity: tier }))}
                              className={`flex-1 py-1 rounded text-[8px] md:text-[9px] uppercase font-bold border transition-all ${settings.animationIntensity === tier ? 'bg-[#d4af37] text-black border-transparent' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                            >
                              {tier}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <div className={`shrink-0 border-t border-white/5 bg-[#0a0a0a] transition-all ${isSmallLandscape ? 'p-1 px-4' : 'p-4 md:p-8 pt-0 mt-auto'}`}>
            {isSmallLandscape ? (
              <div className="flex items-center justify-between w-full py-0.5 gap-4">
                <label className="flex items-center gap-2 cursor-pointer group shrink-0">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={settings.showTips}
                      onChange={() => toggleSetting('showTips')}
                    />
                    <div className={`w-7 h-3.5 rounded-full transition-colors ${settings.showTips ? 'bg-[#d4af37]' : 'bg-zinc-800'}`} />
                    <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${settings.showTips ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className={`text-[9px] uppercase font-black tracking-widest transition-colors ${settings.showTips ? 'text-[#d4af37]' : 'text-zinc-600 group-hover:text-zinc-400'}`}>Tips</span>
                </label>

                <div className="flex-1 max-w-[200px]">
                  <button 
                    onClick={handleStart}
                    className="w-full bg-[#d4af37] text-black font-black uppercase tracking-[0.1em] py-1.5 rounded-md text-[10px] hover:bg-[#c29d2f] transition-all shadow-lg active:scale-95 whitespace-nowrap"
                  >
                    Start Game
                  </button>
                </div>

                <div>
                  <a
                    href="https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=Marlonhanson@me.com&currency_code=USD"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-zinc-900 border border-[#d4af37]/30 text-[#d4af37] font-black uppercase tracking-widest px-4 py-1.5 rounded-md text-[9px] hover:bg-zinc-800 hover:border-[#d4af37]/60 flex items-center gap-2 transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    onClick={() => soundService.play('click')}
                  >
                    <Heart className="w-2.5 h-2.5 fill-current" />
                    Support
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 items-center gap-4 md:gap-8 max-w-5xl mx-auto pt-4 md:pt-6 pb-2">
                <div className="flex justify-center">
                  <label className="flex items-center gap-2 md:gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={settings.showTips}
                        onChange={() => toggleSetting('showTips')}
                      />
                      <div className={`w-8 h-4 md:w-10 md:h-5 rounded-full transition-colors ${settings.showTips ? 'bg-[#d4af37]' : 'bg-zinc-800 group-hover:bg-zinc-700'}`} />
                      <div className={`absolute top-0.5 md:top-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.showTips ? 'translate-x-4 md:translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className={`text-[10px] md:text-xs uppercase font-bold tracking-widest transition-colors ${settings.showTips ? 'text-[#d4af37]' : 'text-zinc-500 group-hover:text-zinc-400'}`}>
                      Game Tips
                    </span>
                  </label>
                </div>
                
                <div className="flex justify-center">
                  <Button 
                    className="w-full bg-[#d4af37] hover:bg-[#c29d2f] text-black font-extrabold uppercase tracking-[0.2em] md:tracking-[0.3em] rounded-xl transition-all border-none shadow-[0_0_40px_rgba(212,175,55,0.2)] flex items-center justify-center h-12 md:h-14 text-xs md:text-sm px-4 md:px-8"
                    onClick={handleStart}
                  >
                    Enter High Stakes Room
                  </Button>
                </div>

                <div className="flex justify-center">
                  <a
                    href="https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=Marlonhanson@me.com&currency_code=USD"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-zinc-900 border border-[#d4af37]/30 hover:border-[#d4af37]/60 text-[#d4af37] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group h-12 md:h-14 text-xs px-2 shadow-lg"
                    onClick={() => soundService.play('click')}
                  >
                    <Heart className="w-3 md:w-4 h-3 md:h-4 fill-current transition-transform group-hover:scale-125" />
                    <span className="hidden sm:inline">Support Creator</span>
                    <span className="sm:hidden text-[10px]">Support Creator</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </UICard>
      </motion.div>

      {/* Fullscreen Hint for iOS */}
      <AnimatePresence>
        {showFullscreenHint && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-[320px]"
          >
            <div className="bg-[#0f0f0f] border border-[#d4af37]/40 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden">
               {/* Internal Glow */}
               <div className="absolute inset-0 bg-[#d4af37]/5 pointer-events-none" />
               
               <div className="relative flex flex-col items-center text-center gap-3">
                 <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/20 flex items-center justify-center border border-[#d4af37]/30 shadow-lg">
                   <RotateCcw className="w-6 h-6 text-[#d4af37] animate-pulse" />
                 </div>
                 
                 <div className="space-y-1">
                   <p className="text-white text-sm font-black uppercase tracking-widest">Landscape Mode</p>
                   <p className="text-zinc-400 text-[11px] leading-relaxed">
                     {isIPhone 
                       ? "True Fullscreen is limited on iPhone. Simply rotate your device to landscape for the best experience!" 
                       : "Your browser blocked the fullscreen request. Please rotate or adjust your settings."}
                   </p>
                 </div>

                 <button 
                   onClick={() => setShowFullscreenHint(false)}
                   className="mt-1 w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[#d4af37] text-[10px] uppercase font-black tracking-[0.2em] transition-all border border-white/5"
                 >
                   Got it
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HowToPlayModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}

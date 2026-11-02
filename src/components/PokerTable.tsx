import { useState, useEffect, useRef, useMemo, useCallback, type CSSProperties } from "react";
import { feltColor } from './table/felt';
import { motion, AnimatePresence } from "motion/react";
import { GameState, PokerCard as PokerCardType, Player, PlayerAction } from "../types";
import { Card, CardBack } from "./Card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Coins, ChevronUp, ChevronDown, Menu, Monitor, Trophy, TrendingUp, Volume2, VolumeX, Music, Zap, Spade, Skull, Sparkles, FastForward, Info, X, HelpCircle, Settings, Check, Maximize, Minimize, Pause, Play, MessageSquare, MessageSquareOff, ArrowRight, Mic, MicOff, Gauge, Sun, Moon, RotateCcw } from "lucide-react";
import { evaluateHand, calculateWinProbability, getAIDecision } from "../lib/gameLogic";
import { useGameStore } from "../store/gameStore";
import { soundService } from "../services/soundService";
import { voiceCommandService, VoiceStatus, VoiceCommandResult } from "../services/voiceCommandService";
import { HowToPlayModal } from "./HowToPlayModal";
import { ChipStack } from "./ChipStack";
import { CHIP_DENOMINATIONS } from "../constants";
import { SaloonTable } from "./table/SaloonTable";
import type { SaloonCtx } from "./table/types";

function getSeatCoordinates(relIdx: number, totalPlayers: number) {
  // Balanced percentage coordinates relative to the oval table felt container (1000px aspect-ratio canvas):
  if (totalPlayers === 2) {
    const coords = [
      { left: '50%', top: '102%' }, // Bottom-Center (User) - Lower, closer to HUD
      { left: '50%', top: '-11%' }  // Top-Center - Higher, closer to screen top
    ];
    return coords[relIdx] || coords[0];
  }
  if (totalPlayers === 3) {
    const coords = [
      { left: '50%', top: '102%' }, // Bottom-Center (User) - Lower, closer to HUD
      { left: '80%', top: '-8%' },  // Top-Right - Higher
      { left: '20%', top: '-8%' }   // Top-Left - Higher
    ];
    return coords[relIdx] || coords[0];
  }
  if (totalPlayers === 4) {
    const coords = [
      { left: '50%', top: '102%' }, // Bottom-Center (User) - Lower, closer to HUD
      { left: '96%', top: '50%' },  // Middle-Right (Right Flank)
      { left: '50%', top: '-11%' }, // Top-Center - Higher, closer to screen top
      { left: '4%', top: '50%' }    // Middle-Left (Left Flank)
    ];
    return coords[relIdx] || coords[0];
  }
  if (totalPlayers === 5) {
    const coords = [
      { left: '70%', top: '102%' }, // Bottom-Right (User / bottom-right) - Lower
      { left: '80%', top: '-8%' },  // Top-Right (top-right) - Higher
      { left: '20%', top: '-8%' },  // Top-Left (top-left) - Higher
      { left: '4%', top: '50%' },   // Middle-Left (middle-left)
      { left: '30%', top: '102%' }  // Bottom-Left (bottom-left) - Lower
    ];
    return coords[relIdx] || coords[0];
  }
  if (totalPlayers === 6) {
    const coords = [
      { left: '70%', top: '102%' }, // Bottom-Right (User / Bottom curve right) - Lower
      { left: '96%', top: '50%' },  // Middle-Right (Right Flank)
      { left: '70%', top: '-11%' }, // Top-Right (Top curve right) - Higher
      { left: '30%', top: '-11%' }, // Top-Left (Top curve left) - Higher
      { left: '4%', top: '50%' },   // Middle-Left (Left Flank)
      { left: '30%', top: '102%' }  // Bottom-Left (Bottom curve left) - Lower
    ];
    return coords[relIdx] || coords[0];
  }

  // Robust fallback for other counts
  const all8Seats = [
    { left: '70%', top: '102%' }, 
    { left: '96%', top: '65%' }, 
    { left: '96%', top: '35%' }, 
    { left: '70%', top: '-11%' }, 
    { left: '30%', top: '-11%' }, 
    { left: '4%', top: '35%' }, 
    { left: '4%', top: '65%' }, 
    { left: '30%', top: '102%' }  
  ];
  return all8Seats[relIdx % 8];
}

interface PokerTableProps {
  gameState: GameState;
  onAction: (action: PlayerAction, amount?: number) => void;
  onReset: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export function PokerTable({ gameState, onAction, onReset, onRestart, onQuit }: PokerTableProps) {
  const [tableScale, setTableScale] = useState(1);
  const [isSmallLandscape, setIsSmallLandscape] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const pauseGame = () => {
    soundService.play('click');
    setIsPaused(true);
  };

  const resumeGame = () => {
    soundService.play('click');
    setIsPaused(false);
  };

  // Show toast or hint on load if voice commands are likely to be used
  useEffect(() => {
    if (voiceCommandService.isSupported()) {
      // Voice hint logic removed for clean UI, but service is ready
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
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

  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent;
      const isMobileAgent = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const iPhone = /iPhone/i.test(ua);
      setIsIPhone(iPhone);
      const isTouchOnly = window.matchMedia('(pointer: coarse)').matches;
      // Broad threshold (1440px) to catch high-res phones and foldables
      const maxDimension = Math.max(window.innerWidth, window.innerHeight);
      const isSmartphoneSize = maxDimension <= 1440;
      const hasMaxTouch = navigator.maxTouchPoints > 0;
      
      // If screen is physically smaller than 1025px wide or 600px high, it is ALWAYS mobile size
      const isSmallScreen = window.innerWidth < 1025 || window.innerHeight < 600;
      
      const isSmartphone = (isMobileAgent && !isIPad) || ((hasMaxTouch || isTouchOnly) && isSmartphoneSize && !isIPad) || isSmallScreen;
      setIsMobile(isSmartphone || isIPad);
      // We store isSmartphone on window for easier access in resize observer updateScale
      (window as any).__pokerIsSmartphone = isSmartphone;
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        const isPortrait = offsetHeight > offsetWidth;
        setIsPortrait(isPortrait);
        
        // Consistent mobile detection - if it's a smartphone and in landscape, use the mobile layout
        const maxDimension = Math.max(offsetWidth, offsetHeight);
        const isSmartphoneSize = maxDimension <= 1440;
        const isSmartphone = (window as any).__pokerIsSmartphone || isSmartphoneSize;
        const isSmallLand = (isSmartphone || offsetWidth <= 1280 || offsetHeight < 680 || isMobile) && offsetWidth > offsetHeight;
        
        setIsSmallLandscape(isSmallLand);
        
        // Base dimensions for the game stage - increased widths to ensure room for side panels
        // On mobile/portrait, we need much more horizontal clear space for the side-docked panels
        const baseWidth = (isPortrait || isSmallLand) ? 1750 : 1450; 
        const baseHeight = (isPortrait || isSmallLand) ? 950 : 800;
        
        // Calculate scale factor
        const scale = Math.min(offsetWidth / baseWidth, offsetHeight / baseHeight);
        
        // More aggressive scaling for small screens to prevent cut-offs
        let finalScale = scale;
        if (isSmallLand) {
           const landBaseHeight = 700;
           finalScale = Math.min(offsetWidth / baseWidth, (offsetHeight * 1.05) / landBaseHeight);
        }
        
        setTableScale(Math.max(finalScale, isPortrait ? 0.25 : 0.3));
      }
    };
    
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      observer.disconnect();
    };
  }, []);

  const winnersInfo = useGameStore(state => state.winnersInfo);
  const rabbitHuntCards = useGameStore(state => state.rabbitHuntCards);
  const isRabbitHuntActive = useGameStore(state => state.isRabbitHuntActive);
  const rabbitHunt = useGameStore(state => state.rabbitHunt);
  const { settings } = gameState;
  const currentHandLogs = useMemo(() => {
    const lastWinIndex = [...gameState.actionLog].reverse().findIndex(log => log.id.startsWith('win-'));
    if (lastWinIndex !== -1) {
      const idxFromStart = gameState.actionLog.length - 1 - lastWinIndex;
      return gameState.actionLog.slice(idxFromStart + 1);
    }
    return gameState.actionLog;
  }, [gameState.actionLog]);
  const updateSettings = useGameStore(state => state.updateSettings);
  const setPreAction = useGameStore(state => state.setPreAction);
  const [betAmount, setBetAmount] = useState(gameState.minBet);
  const [showHandHelper, setShowHandHelper] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [wasPausedBeforeSettings, setWasPausedBeforeSettings] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const [isSkippingHand, setIsSkippingHand] = useState(false);
  const [isHeaderButtonsHovered, setIsHeaderButtonsHovered] = useState(false);
  const [flashingPlayerId, setFlashingPlayerId] = useState<string | null>(null);
  const [lastActionsMap, setLastActionsMap] = useState<Record<string, string | undefined>>({});
  const logEndRef = useRef<HTMLDivElement>(null);
  const mobileLogEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Action Flash Logic
  useEffect(() => {
    gameState.players.forEach(player => {
      const prevAction = lastActionsMap[player.id];
      if (player.lastAction && player.lastAction !== prevAction) {
        setFlashingPlayerId(player.id);
        setLastActionsMap(prev => ({ ...prev, [player.id]: player.lastAction }));
        setTimeout(() => setFlashingPlayerId(null), 600);
      } else if (!player.lastAction && prevAction) {
        setLastActionsMap(prev => ({ ...prev, [player.id]: undefined }));
      }
    });
  }, [gameState.players, lastActionsMap]);
 
  // Auto-scroll logic for Live Action
  useEffect(() => {
    const scrollToBottom = () => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      mobileLogEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };
    // Ensure DOM is ready after potential animations
    const timer = setTimeout(scrollToBottom, 200);
    return () => clearTimeout(timer);
  }, [gameState.actionLog]);

  const handleLogScroll = () => {
    // User is manually scrolling
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
  };

  const user = gameState.players.find(p => p.isUser);
  const isShowdown = gameState.phase === 'showdown';
  const winners = gameState.winners || [];
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  // All-in runout: at most one player can still bet and bets are matched -> no more decisions this hand.
  const isAllInSituation = useMemo(() => {
    if (gameState.phase === 'setup' || gameState.phase === 'showdown') return false;
    const playersInHand = gameState.players.filter(p => !p.isFolded && !p.isEliminated);
    if (playersInHand.length < 2) return false;
    const maxRoundBet = Math.max(...playersInHand.map(p => p.currentBet || 0), 0);
    const bettingSettled = playersInHand.every(p => p.chips === 0 || (p.currentBet || 0) === maxRoundBet);
    return bettingSettled && playersInHand.filter(p => p.chips > 0).length <= 1;
  }, [gameState.players, gameState.phase]);
  const isUserTurn = currentPlayer?.isUser && !isShowdown && !isAllInSituation;

  const activePlayers = useMemo(() => gameState.players.filter(p => !p.isFolded), [gameState.players]);
  const maxBetInProgress = useMemo(() => Math.max(...activePlayers.map(p => p.currentBet || 0), 0), [activePlayers]);
  const callAmount = useMemo(() => Math.max(0, maxBetInProgress - (user?.currentBet || 0)), [maxBetInProgress, user?.currentBet]);
  const canCheck = callAmount === 0;

  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [showFirstHandGuide, setShowFirstHandGuide] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [pendingVoiceAction, setPendingVoiceAction] = useState<VoiceCommandResult | null>(null);

  const TURN_DURATION = 20;

  // Turn timer logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const isTimerActive = isUserTurn && !isShowdown && !isPaused && !isSettingsOpen && !showHowToPlay && !showHandHelper && settings.enableTimer && !showFirstHandGuide;
    
    if (isTimerActive) {
      timer = setInterval(() => {
        setTurnTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isUserTurn, isShowdown, isPaused, isSettingsOpen, showHowToPlay, showHandHelper, settings.enableTimer, showFirstHandGuide]);

  const prevPhase = useRef(gameState.phase);
  useEffect(() => {
    if (gameState.phase === 'showdown' && prevPhase.current !== 'showdown') {
      soundService.play('win');
    }
    prevPhase.current = gameState.phase;
  }, [gameState.phase]);

  // Handle turn expiration
  useEffect(() => {
    if (turnTimeLeft === 0 && isUserTurn && !isShowdown && !isPaused && settings.enableTimer && !showFirstHandGuide) {
      onAction(canCheck ? 'check' : 'fold');
    }
  }, [turnTimeLeft, isUserTurn, isShowdown, isPaused, canCheck, onAction, settings.enableTimer, showFirstHandGuide]);

  // Handle turn start and resets separately to avoid timer jumps on minor prop changes
  useEffect(() => {
    if (isUserTurn && !isShowdown) {
       setTurnTimeLeft(TURN_DURATION);
    }
  }, [isUserTurn, isShowdown, gameState.handCount]);

  const TABLE_COLORS: Record<string, string> = {
    green: '#0a4225',
    red: '#630a0a',
    blue: '#0a2342',
    burgundy: '#420a1c',
    black: '#111111',
    purple: '#280a42',
    forest: '#143306',
    chocolate: '#3d1c02',
    charcoal: '#222222',
    teal: '#063333',
    olive: '#333306',
    navy: '#000033',
  };

  const designs = [
    'classic-red', 'classic-blue', 'classic-green', 'classic-black', 
    'royal-gold', 'royal-silver', 'carbon-fiber', 'geometric-blue', 
    'geometric-red', 'midnight-lace', 'casino-vintage', 'diamond-minimal',
    'abstract-wave', 'floral-regal', 'neon-circuit', 'dragon-scale',
    'poker-lattice', 'marina-blue', 'executive-grey', 'imperial-purple'
  ];

  const actionTooltips: Record<string, string> = {
    fold: "Give up your hand and the current pot to avoid losing more chips.",
    check: "Pass the action to the next player without betting. Only possible if no one has bet yet.",
    call: `Match the current bet of $${callAmount.toLocaleString()} to stay in the hand.`,
    raise: `Increase the current bet. More chips more pressure!`,
    allin: "Bet everything! Use this when you have a monster hand or want to bluff big."
  };

  // Show guide on first few hands
  useEffect(() => {
    if (gameState.handCount <= 3 && isUserTurn && !guideDismissed && settings.showTips) {
      setShowFirstHandGuide(true);
    } else if (!isUserTurn || !settings.showTips) {
      setShowFirstHandGuide(false);
    }
  }, [gameState.handCount, isUserTurn, guideDismissed, settings.showTips]);

  // Reset guide dismissal when turn ends to allow it to reappear on next turn/action
  useEffect(() => {
    if (!isUserTurn) {
      setGuideDismissed(false);
    }
  }, [isUserTurn]);


  // Auto-advance streets in all-in situations
  useEffect(() => {
    // Re-arms on every street (phase / board change), so the whole runout deals itself to showdown.
    if (isAllInSituation && !isShowdown && !isPaused) {
      const timer = setTimeout(() => {
        onAction('check', 0);
      }, 1100);
      return () => clearTimeout(timer);
    }
  }, [isAllInSituation, isShowdown, onAction, isPaused, gameState.phase, gameState.communityCards.length, gameState.currentPlayerIndex]);

  const potOdds = useMemo(() => {
    if (!settings.showPotOdds || callAmount <= 0) return null;
    const futurePot = gameState.pot + callAmount;
    return Math.round((callAmount / futurePot) * 100);
  }, [callAmount, gameState.pot, settings.showPotOdds]);

  // AI automation delay - slowed down for natural feel
  const aiDelay = isSkippingHand ? 50 : (settings.turboMode ? 600 : 2500);

  // Animation intensity mapper
  const animDurations = {
    low: 0.1,
    medium: 0.3,
    high: 0.6
  };
  const duration = animDurations[settings.animationIntensity];

  // Slider bounds safety
  const minRaiseAmount = useMemo(() => Math.max(gameState.minBet, maxBetInProgress + gameState.smallBlind), [gameState.minBet, maxBetInProgress, gameState.smallBlind]);
  const playerMaxChips = (user?.chips || 0) + (user?.currentBet || 0);
  const sliderMin = useMemo(() => Math.min(minRaiseAmount, playerMaxChips), [minRaiseAmount, playerMaxChips]);
  const sliderMax = playerMaxChips;

  const handleVoiceAction = useCallback((result: VoiceCommandResult) => {
    if (!result.action) return;

    // Handle Meta-Actions first
    if (result.action === 'skip') {
      if (user?.isFolded && !isShowdown && !isSkippingHand) {
        setVoiceFeedback(`Voice recognized: Skip Hand`);
        soundService.play('click');
        setIsSkippingHand(true);
        setPendingVoiceAction(null);
        setTimeout(() => setVoiceFeedback(null), 3000);
      }
      return;
    }

    if (result.action === 'next') {
      if (isShowdown) {
        setVoiceFeedback(`Voice recognized: Next Hand`);
        setIsSkippingHand(false);
        onReset();
        setPendingVoiceAction(null);
        setTimeout(() => setVoiceFeedback(null), 3000);
      }
      return;
    }

    if (result.action === 'rabbit') {
      const isRabbitHuntAvailable = isShowdown && gameState.communityCards.length < 5 && !isRabbitHuntActive && (!user?.isEliminated || isSpectating);
      if (isRabbitHuntAvailable) {
        soundService.play('click');
        rabbitHunt();
        setVoiceFeedback(`Voice recognized: Rabbit Hunt 🐰`);
        setTimeout(() => setVoiceFeedback(null), 3000);
      }
      return;
    }

    if (result.action === 'guide') {
      soundService.play('click');
      const lowerT = result.transcript.toLowerCase();
      const isClosing = lowerT.includes('close') || lowerT.includes('hide');
      const isOpening = lowerT.includes('open') || lowerT.includes('show');
      
      let nextState = !showHandHelper;
      if (isClosing) nextState = false;
      if (isOpening) nextState = true;
      
      setShowHandHelper(nextState);
      setVoiceFeedback(`Voice recognized: ${nextState ? 'Open' : 'Close'} Hand Guide`);
      setTimeout(() => setVoiceFeedback(null), 3000);
      return;
    }

    if (result.action === 'mute') {
      const lowerT = result.transcript.toLowerCase();
      const wantMute = lowerT.includes('mute') || lowerT.includes('off') || lowerT.includes('silence') || lowerT.includes('silent');
      const wantUnmute = lowerT.includes('unmute') || lowerT.includes('on');
      
      let nextState = !settings.soundEffects;
      if (wantMute) nextState = false;
      if (wantUnmute) nextState = true;

      soundService.play('click');
      updateSettings({ soundEffects: nextState });
      setVoiceFeedback(`Voice recognized: Audio ${nextState ? 'On' : 'Off'}`);
      setTimeout(() => setVoiceFeedback(null), 3000);
      return;
    }

    if (result.action === 'voice') {
      const lowerT = result.transcript.toLowerCase();
      const wantOff = lowerT.includes('off') || lowerT.includes('disable') || lowerT.includes('mute');
      const wantOn = lowerT.includes('on') || lowerT.includes('enable') || lowerT.includes('unmute');
      
      let nextState = !settings.voiceCommands;
      if (wantOff) nextState = false;
      if (wantOn) nextState = true;

      soundService.play('click');
      updateSettings({ voiceCommands: nextState });
      setVoiceFeedback(`Voice recognized: Voice Commands ${nextState ? 'On' : 'Off'}`);
      setTimeout(() => setVoiceFeedback(null), 3000);
      return;
    }

    let finalAmount = result.amount || 0;

    // Handle 'call' specifically to ensure it matches the actual call amount
    if (result.action === 'call') {
      finalAmount = callAmount;
    }

    // Handle 'raise' specifically
    if (result.action === 'raise') {
      if (result.amount === undefined || result.amount === 0) {
        // Use the current bet amount shown on the slider/raise button
        finalAmount = betAmount - (user?.currentBet || 0);
      } else if (result.amount === -0.5) {
        finalAmount = Math.max(sliderMin, Math.floor(gameState.pot * 0.5));
      } else if (result.amount === -1.0) {
        finalAmount = Math.max(sliderMin, gameState.pot);
      } else if (result.amount === -2.0) {
        finalAmount = Math.max(sliderMin, gameState.pot * 2);
      } else if (result.amount === -999) {
        finalAmount = (user?.chips || 0);
      } else if (result.amount > 0) {
        // If they specify a number, treat it as a "Raise To" value (matching the button)
        // We need to calculate the difference from current bet
        finalAmount = Math.max(0, result.amount - (user?.currentBet || 0));
      }
      setVoiceFeedback(`Voice recognized: Raise to $${finalAmount + (user?.currentBet || 0)}`);
    } else if (result.action === 'call') {
      finalAmount = callAmount;
      setVoiceFeedback(`Voice recognized: Call $${callAmount}`);
    } else if (result.action === 'fold') {
      setVoiceFeedback(`Voice recognized: Fold`);
    } else if (result.action === 'check') {
      setVoiceFeedback(`Voice recognized: Check`);
    } else if (result.action === 'all-in') {
      setVoiceFeedback(`Voice recognized: ALL IN!`);
    } else if (result.action === 'restart') {
      setVoiceFeedback(`Voice recognized: New Game`);
      soundService.play('click');
      onRestart();
      return;
    } else if (result.action === 'spectate') {
      if (user?.isEliminated && !isSpectating && !gameState.isGameOver && gameState.players.filter(p => !p.isEliminated).length >= 2) {
        setVoiceFeedback(`Voice recognized: Spectate Mode`);
        soundService.play('click');
        setIsSpectating(true);
      } else {
        setVoiceFeedback(`Spectate not available`);
      }
      return;
    } else if (result.action === 'lobby') {
      setVoiceFeedback(`Voice recognized: Exit to Lobby`);
      onQuit();
      return;
    }

    // Call native onAction
    onAction(result.action as PlayerAction, finalAmount);
    setPendingVoiceAction(null);
    setTimeout(() => setVoiceFeedback(null), 3000);
  }, [onAction, callAmount, betAmount, user?.currentBet, user?.chips, sliderMin, gameState.pot, isShowdown, user?.isFolded, isSkippingHand, onReset]);

  // Voice Command Integration
  useEffect(() => {
    if (!voiceCommandService.isSupported()) {
      setVoiceStatus('unsupported');
      return;
    }

    voiceCommandService.setOnStatus((status) => {
      setVoiceStatus(status);
    });

    voiceCommandService.setOnResult((result) => {
      if (result.action) {
        // Handle standard actions (feedback is set inside handleVoiceAction)
        handleVoiceAction(result);
      } else {
        setVoiceFeedback(`Not recognized: "${result.transcript}"`);
        setTimeout(() => setVoiceFeedback(null), 3000);
      }
    });
  }, [handleVoiceAction]);

  // Effect to automatically start listening when it's user's turn OR relevant actions available, and voice is enabled
  useEffect(() => {
    const canSkip = user?.isFolded && !isShowdown && !isSkippingHand;
    const canNextOrRabbit = isShowdown && (!user?.isEliminated || isSpectating);
    const isGameOver = gameState.isGameOver || (user?.isEliminated && !isSpectating);
    
    if (settings.voiceCommands && !isPaused && (isUserTurn || canSkip || canNextOrRabbit || isGameOver)) {
      voiceCommandService.start();
    } else {
      voiceCommandService.stop();
    }
  }, [isUserTurn, settings.voiceCommands, isPaused, isShowdown, user?.isFolded, isSkippingHand, user?.isEliminated, isSpectating, gameState.isGameOver]);

  useEffect(() => {
    if (isUserTurn && sliderMin !== undefined && sliderMax !== undefined) {
        setBetAmount(prev => {
          const next = Math.max(sliderMin, Math.min(prev, sliderMax));
          return next === prev ? prev : next;
        });
    }
  }, [isUserTurn, sliderMin, sliderMax]);

  // Pre-action execution logic
  useEffect(() => {
    if (isUserTurn && gameState.preAction && !isShowdown && !isPaused) {
       const preAction = gameState.preAction;
       // Clear it immediately to avoid loops
       useGameStore.getState().setPreAction(null);
       
       const delay = settings.turboMode ? 200 : 800;
       
       const timer = setTimeout(() => {
         if (preAction === 'fold') {
           onAction('fold');
         } else if (preAction === 'check') {
           if (canCheck) {
             onAction('check');
           }
         } else if (preAction === 'auto-call') {
           onAction(canCheck ? 'check' : 'call', callAmount);
         } else if (preAction === 'check-fold') {
           if (canCheck) {
             onAction('check');
           } else {
             onAction('fold');
           }
         }
       }, delay);
       return () => clearTimeout(timer);
    }
  }, [isUserTurn, gameState.preAction, isShowdown, isPaused, canCheck, onAction, settings.turboMode]);

  // Reactive pre-action cancellation: if someone raises, untoggle the 'Check' pre-action
  useEffect(() => {
    if (!isUserTurn && gameState.preAction === 'check' && callAmount > 0) {
      setPreAction(null);
    }
  }, [isUserTurn, gameState.preAction, callAmount, setPreAction]);

  // AI automation logic
  useEffect(() => {
    if (gameState.phase === 'setup' || gameState.phase === 'showdown' || isPaused) {
      if (isSkippingHand) setIsSkippingHand(false);
      return;
    }

    if (isAllInSituation) return; // runout deals itself; no bot decisions

    if (!isUserTurn && currentPlayer) {
      const timer = setTimeout(() => {
        const stateAtTimeout = useGameStore.getState();
        const currentPlayerAtTimeout = stateAtTimeout.players[stateAtTimeout.currentPlayerIndex];
        
        if (stateAtTimeout.phase === 'setup' || stateAtTimeout.phase === 'showdown' || currentPlayerAtTimeout?.isUser) return;

        const activePlayersList = stateAtTimeout.players.filter(p => !p.isFolded && !p.isEliminated);
        const maxBet = Math.max(...activePlayersList.map(p => p.currentBet || 0), 0);
        const toCall = maxBet - (currentPlayerAtTimeout.currentBet || 0);
        
        const aiType = currentPlayerAtTimeout.aiType || 'medium-iq';
        const rng = Math.random();

        // Professional AI decision making
        const decision = getAIDecision(
          currentPlayerAtTimeout.cards,
          stateAtTimeout.communityCards,
          activePlayersList.length,
          toCall,
          stateAtTimeout.pot,
          currentPlayerAtTimeout.chips,
          aiType,
          stateAtTimeout.bigBlind,
          stateAtTimeout.handCount
        );
        
        // Execute action with human-like variability in timing
        const executionDelay = (settings.turboMode || isSkippingHand) ? 0 : 500 + Math.random() * 1000;
        setTimeout(() => {
          onAction(decision.action, decision.amount);
        }, executionDelay);
      }, aiDelay);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayerIndex, gameState.phase, isShowdown, isUserTurn, currentPlayer?.id, onAction, aiDelay, settings.enableAiChat, isPaused, isAllInSituation]);

  const winnerNames = gameState.players
    .filter(p => winners.includes(p.id))
    .map(p => p.name)
    .join(' & ');

  const winnerLabel = winnersInfo.length > 0 && isShowdown
    ? winnersInfo[0].handLabel
    : '';

  const winningPlayer = useMemo(() => {
    if (winnersInfo.length === 0) return null;
    return gameState.players.find(p => p.id === winnersInfo[0].id);
  }, [winnersInfo, gameState.players]);

  const winProbability = useMemo(() => {
    if (!gameState.enableInsights || !user || user.isFolded || isShowdown) return null;
    const activeOpponentsCount = gameState.players.filter(p => !p.isFolded).length;
    return calculateWinProbability(user.cards, gameState.communityCards, activeOpponentsCount);
  }, [user?.cards, user?.isFolded, gameState.communityCards, gameState.players, gameState.enableInsights, isShowdown]);

  // Symmetrical elliptical player positioning logic
  const getPlayerStyle = (index: number): CSSProperties => {
    const playerCount = gameState.players.length;
    // Hero (index 0) starts at the bottom center (90 degrees or PI/2)
    // We space others clockwise around the ellipse
    const angle = (Math.PI / 2) + (index * (2 * Math.PI / playerCount));
    
    // Adjust radii to fit the aspect ratio of the table (2.6:1)
    // We use percentages relative to the container
    let rx = isPortrait ? 34 : (isSmallLandscape ? 38 : 41); // horizontal radius
    let ry = isPortrait ? 39 : (isSmallLandscape ? 34 : 37); // vertical radius

    // Part 1: ADJUST 4-5 PLAYER POSITIONING
    // Pull middle-left and middle-right players inward by ~17% for 4 and 5 player games
    if (playerCount === 4 || playerCount === 5) {
      const cosAngle = Math.abs(Math.cos(angle));
      // If the player is on the far left or far right (cosAngle near 1), pull them in
      if (cosAngle > 0.7) {
        rx *= 0.83; // 17% reduction
      }
    }

    // Specific adjustments for top and bottom center players to avoid cut-offs
    const isBottomCenter = index === 0;
    const isTopCenter = index === Math.floor(playerCount / 2);
    
    // Push bottom player down and top player up to avoid community cards overlap
    // Especially important now that player one's cards are hidden on mobile
    const verticalAdjustment = isBottomCenter ? (isPortrait ? 0.95 : (isSmallLandscape ? 1.1 : 1.0)) : isTopCenter ? (isPortrait ? 0.95 : 0.85) : 1;
    
    const left = 50 + rx * Math.cos(angle);
    const top = 50 + (ry * verticalAdjustment) * Math.sin(angle);
    
    return {
      top: `${top}%`,
      left: `${left}%`,
      transform: 'translate(-50%, -50%)',
      position: 'absolute'
    };
  };

  const HAND_RANKINGS = [
    { 
      name: "Royal Flush", 
      desc: "A, K, Q, J, 10 Same Suit",
      example: [
        { rank: 'A', suit: 'spades' },
        { rank: 'K', suit: 'spades' },
        { rank: 'Q', suit: 'spades' },
        { rank: 'J', suit: 'spades' },
        { rank: '10', suit: 'spades' },
      ]
    },
    { 
      name: "Straight Flush", 
      desc: "5 cards sequence, same suit",
      example: [
        { rank: '9', suit: 'hearts' },
        { rank: '8', suit: 'hearts' },
        { rank: '7', suit: 'hearts' },
        { rank: '6', suit: 'hearts' },
        { rank: '5', suit: 'hearts' },
      ]
    },
    { 
      name: "Four of a Kind", 
      desc: "4 of the same rank",
      example: [
        { rank: '8', suit: 'spades' },
        { rank: '8', suit: 'hearts' },
        { rank: '8', suit: 'diamonds' },
        { rank: '8', suit: 'clubs' },
        { rank: 'K', suit: 'spades' },
      ]
    },
    { 
      name: "Full House", 
      desc: "3 of kind + pair",
      example: [
        { rank: 'A', suit: 'spades' },
        { rank: 'A', suit: 'hearts' },
        { rank: 'A', suit: 'diamonds' },
        { rank: 'K', suit: 'clubs' },
        { rank: 'K', suit: 'diamonds' },
      ]
    },
    { 
      name: "Flush", 
      desc: "5 cards same suit",
      example: [
        { rank: 'K', suit: 'diamonds' },
        { rank: 'J', suit: 'diamonds' },
        { rank: '8', suit: 'diamonds' },
        { rank: '4', suit: 'diamonds' },
        { rank: '2', suit: 'diamonds' },
      ]
    },
    { 
      name: "Straight", 
      desc: "5 cards sequence",
      example: [
        { rank: '9', suit: 'spades' },
        { rank: '8', suit: 'diamonds' },
        { rank: '7', suit: 'hearts' },
        { rank: '6', suit: 'clubs' },
        { rank: '5', suit: 'spades' },
      ]
    },
    { 
      name: "Three of a Kind", 
      desc: "3 of the same rank",
      example: [
        { rank: 'Q', suit: 'spades' },
        { rank: 'Q', suit: 'hearts' },
        { rank: 'Q', suit: 'diamonds' },
        { rank: '8', suit: 'clubs' },
        { rank: '5', suit: 'spades' },
      ]
    },
    { 
      name: "Two Pair", 
      desc: "2 different pairs",
      example: [
        { rank: 'J', suit: 'spades' },
        { rank: 'J', suit: 'hearts' },
        { rank: '9', suit: 'diamonds' },
        { rank: '9', suit: 'clubs' },
        { rank: '4', suit: 'spades' },
      ]
    },
    { 
      name: "One Pair", 
      desc: "2 of the same rank",
      example: [
        { rank: '10', suit: 'spades' },
        { rank: '10', suit: 'hearts' },
        { rank: 'A', suit: 'diamonds' },
        { rank: 'K', suit: 'clubs' },
        { rank: '7', suit: 'spades' },
      ]
    },
    { 
      name: "High Card", 
      desc: "Highest card",
      example: [
        { rank: 'A', suit: 'spades' },
        { rank: 'Q', suit: 'diamonds' },
        { rank: '9', suit: 'hearts' },
        { rank: '5', suit: 'clubs' },
        { rank: '2', suit: 'spades' },
      ]
    }
  ];

  const toggleSettings = () => {
    if (isSettingsOpen) {
      handleCloseSettings();
    } else {
      soundService.play('click');
      setWasPausedBeforeSettings(isPaused);
      setIsPaused(true);
      setIsSettingsOpen(true);
    }
  };

  const togglePause = () => {
    if (!isPaused) {
      pauseGame();
    } else {
      resumeGame();
    }
  };

  const handleCloseSettings = () => {
    soundService.play('click');
    setIsSettingsOpen(false);
    // Game stays paused if it was paused by opening settings, 
    // requiring manual resume via the Play button as per requirements.
  };

  const saloonCtx: SaloonCtx = {
    players: gameState.players,
    communityCards: gameState.communityCards,
    pot: gameState.pot,
    pots: gameState.pots,
    phase: gameState.phase,
    handCount: gameState.handCount,
    currentPlayerIndex: gameState.currentPlayerIndex,
    settings,
    winners,
    winnersInfo,
    winnerNames,
    logs: currentHandLogs,
    user,
    isShowdown,
    isUserTurn: !!isUserTurn,
    isAllInSituation,
    isPaused,
    isSpectating,
    isSkippingHand,
    isFullscreen,
    isRabbitHuntActive,
    rabbitHuntCards,
    rabbitHuntInsight: gameState.rabbitHuntInsight,
    flashingPlayerId,
    callAmount,
    canCheck,
    betAmount,
    sliderMin,
    sliderMax,
    turnTimeLeft,
    turnDuration: TURN_DURATION,
    winProbability: gameState.enableInsights && winProbability !== null ? winProbability : null,
    potOdds: settings.showPotOdds && potOdds !== null ? potOdds : null,
    handLabel: user && user.cards.length > 0 ? evaluateHand(user.cards, gameState.communityCards).label : '',
    feltColor: feltColor(settings.tableColor),
    voiceStatus,
    voiceSupported: voiceCommandService.isSupported(),
    showHandHelper,
    setBetAmount,
    setHoveredAction,
    fold: () => { soundService.play('fold'); onAction('fold'); },
    checkOrCall: () => { soundService.play(canCheck ? 'check' : 'chips'); onAction(canCheck ? 'check' : 'call', callAmount); },
    raise: () => { soundService.play('chips'); onAction('raise', betAmount - (user?.currentBet || 0)); },
    allIn: () => { soundService.play('chips'); onAction('all-in', user?.chips || 0); },
    skipHand: () => { soundService.play('click'); setIsSkippingHand(true); },
    nextHand: () => { setIsSkippingHand(false); onReset(); },
    rabbitHunt: () => { soundService.play('click'); rabbitHunt(); },
    togglePause,
    resume: resumeGame,
    toggleSound: () => { updateSettings({ soundEffects: !settings.soundEffects }); soundService.play('click'); },
    toggleGuide: () => {
      soundService.play('click');
      const nextState = !showHandHelper;
      if (nextState && !isPaused) { setIsPaused(true); setWasPausedBeforeSettings(false); }
      setShowHandHelper(nextState);
    },
    toggleTips: () => {
      soundService.play('click');
      const newState = !settings.showTips;
      if (newState && !isPaused) { setIsPaused(true); setWasPausedBeforeSettings(false); }
      updateSettings({ showTips: newState, showTooltips: newState });
    },
    toggleVoice: () => { soundService.play('click'); updateSettings({ voiceCommands: !settings.voiceCommands }); },
    openSettings: toggleSettings,
    openHowToPlay: () => {
      soundService.play('click');
      if (!isPaused) { setIsPaused(true); setWasPausedBeforeSettings(false); }
      setShowHowToPlay(true);
    },
    toggleFullscreen,
    forfeit: onQuit,
    click: () => soundService.play('click'),
  };

  return (
    <>
    <div className={`fixed inset-0 h-[100dvh] w-full ${settings.theme === 'light' ? 'bg-[#f4f7f8] text-zinc-900 border-zinc-200' : 'bg-gradient-to-b from-[#0a0a0a] via-[#0d1a12] to-[#0a0a0a] text-white'} font-sans overflow-hidden flex flex-col transition-colors duration-500`}>
      {/* Light Mode Specific Fades / Gradients */}
      {settings.theme === 'light' && (
        <>
          {/* Top Bar for button visibility - Darker gradient fade for better overlap handling */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/70 via-black/30 to-transparent z-[5] pointer-events-none" />
          {/* Bottom Fade: Start dark at bottom, fade up - Darker for readability */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
        </>
      )}

      {/* Main Game Interface */}
      
      {/* First Hand Guide Overlay */}
      <AnimatePresence>
        {showFirstHandGuide && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[9000] ${settings.theme === 'light' ? 'bg-white text-zinc-900 border-zinc-200' : 'bg-[#d4af37] text-black border-black/10'} p-0 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] w-[90vw] max-w-sm border-2 overflow-hidden flex flex-col max-h-[60vh]`}
          >
            <div className={`p-4 border-b ${settings.theme === 'light' ? 'border-zinc-100' : 'border-black/10'} flex items-center justify-between sticky top-0 ${settings.theme === 'light' ? 'bg-white' : 'bg-[#d4af37]'} z-10`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-widest">Interactive Game Guide</span>
              </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  setShowFirstHandGuide(false);
                  setGuideDismissed(true);
                  soundService.play('click');
                }}
                className={`p-2 -mr-2 rounded-full transition-colors ${settings.theme === 'light' ? 'hover:bg-zinc-100' : 'hover:bg-black/10'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar">
              <p className="text-sm font-bold leading-relaxed mb-6">
                Welcome to the table! It's your turn. Use the controls below to stay in the game or exert pressure. If you're unsure about hand strength, check the <span onClick={() => { soundService.play('click'); setShowHandHelper(!showHandHelper); }} className="underline font-black text-blue-800 cursor-pointer hover:opacity-70 transition-opacity">Hand Guide</span> in the top-left!
              </p>

              <div className="space-y-4">
                <h4 className={`text-[10px] uppercase font-black tracking-widest pb-1 border-b ${settings.theme === 'light' ? 'border-zinc-100 text-zinc-400' : 'border-black/5 text-black/60'}`}>Action Controls</h4>
                
                {[
                  { name: 'Fold', desc: 'Exit the hand and give up the pot. Use it if your cards are weak.' },
                  { name: 'Check', desc: 'Pass the turn without betting. Only available if no bets were made.' },
                  { name: 'Call', desc: 'Match the current highest bet to stay in the hand.' },
                  { name: 'Raise', desc: 'Increase the bet amount to build the pot or bluff.' },
                  { name: 'All-In', desc: 'Risk all your chips on a single hand. High risk, high reward.' },
                ].map(action => (
                  <div key={action.name} className="flex flex-col gap-1">
                    <span className="text-xs font-black uppercase text-blue-800">{action.name}</span>
                    <p className={`text-[11px] leading-snug font-medium ${settings.theme === 'light' ? 'text-zinc-500' : 'text-black/70'}`}>{action.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Tooltip */}
      <AnimatePresence>
        {hoveredAction && isUserTurn && settings.showTooltips && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-[190px] right-8 z-[11000] bg-[#1a1a1a] border border-[#d4af37]/30 p-3 rounded-xl shadow-2xl max-w-[240px] pointer-events-none"
          >
            <div className="text-[9px] uppercase font-black text-[#d4af37] mb-1 tracking-widest flex items-center gap-2">
              <Info className="w-3 h-3" /> {hoveredAction}
            </div>
            <p className="text-[10px] text-zinc-400 leading-snug font-medium">
              {actionTooltips[hoveredAction.toLowerCase().replace('-', '')]}
            </p>
            <div className="absolute -bottom-1.5 right-12 w-3 h-3 bg-[#1a1a1a] border-b border-r border-[#d4af37]/30 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* elimination modal or game over modal */}
      <AnimatePresence>
        {gameState.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[210] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-zinc-900 border border-[#d4af37]/30 p-10 rounded-[40px] text-center space-y-8 shadow-[0_0_100px_rgba(212,175,55,0.1)]"
            >
              <div className="relative">
                <div className="w-28 h-28 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto border border-[#d4af37]/20">
                  <Trophy className="w-14 h-14 text-[#d4af37] drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                </div>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-dashed border-[#d4af37]/20 rounded-full scale-125"
                />
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl font-serif text-white italic gold-glow">Tournament Over</h2>
                <p className="text-[#d4af37] text-sm font-bold uppercase tracking-[0.3em]">
                   {gameState.players.find(p => p.id === gameState.winnerPlayerId)?.name} is the Champion
                </p>
                <p className="text-zinc-500 text-[11px] leading-relaxed px-4 pt-2">
                  The last chip has been played. {gameState.players.find(p => p.id === gameState.winnerPlayerId)?.name} walks away from the table with the entire pot.
                </p>
              </div>

              <div className="flex flex-col gap-4 pt-4">
                <Button 
                  onClick={() => {
                    soundService.play('click');
                    onRestart();
                  }}
                  className="w-full h-16 bg-[#d4af37] hover:bg-[#c29d2f] text-black font-extrabold uppercase tracking-[0.3em] text-xs rounded-2xl shadow-[0_10px_30px_rgba(212,175,55,0.2)] transition-all"
                >
                  Start New Session
                </Button>
                <button 
                  onClick={onQuit}
                  className="text-zinc-500 text-[10px] uppercase font-bold hover:text-white transition-colors tracking-widest pt-2"
                >
                  Back to Lobby
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {user?.isEliminated && !isSpectating && !gameState.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-zinc-900 border border-[#d4af37]/30 p-8 rounded-3xl text-center space-y-8 shadow-[0_0_100px_rgba(212,175,55,0.1)]"
            >
              <div className="relative w-24 h-24 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto border border-[#d4af37]/20 shadow-inner overflow-hidden">
                <Spade className="w-12 h-12 text-[#d4af37] drop-shadow-lg" />
                {/* Crack Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-full h-[2px] bg-zinc-900 rotate-[35deg] translate-x-[-10%] translate-y-[-5%] scale-x-125 shadow-[0_0_3px_rgba(0,0,0,0.5)]"></div>
                  <div className="w-[15%] h-[2px] bg-zinc-900 absolute top-[40%] left-[45%] rotate-[-45deg]"></div>
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-serif text-white uppercase tracking-widest drop-shadow-md">You're Out</h2>
                <p className="text-zinc-500 text-sm leading-relaxed px-4">
                  The chips have all gone to your opponents. Your seat at the high stakes table is now empty.
                </p>
              </div>
              <div className="flex flex-col gap-5 py-4">
                <Button 
                  onClick={() => {
                    soundService.play('click');
                    onRestart();
                  }}
                  className="w-full h-15 bg-[#f5e492] hover:bg-[#d4af37] text-black font-black uppercase tracking-[0.25em] text-[13px] md:text-sm rounded-2xl shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center border-b-4 border-black/10"
                >
                  Start New Game
                </Button>
                
                <div className="flex items-center justify-center gap-3 w-full">
                  {gameState.players.filter(p => !p.isEliminated).length >= 2 ? (
                    <>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          soundService.play('click');
                          setIsSpectating(true);
                        }}
                        className="flex-1 h-12 bg-transparent border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 font-black uppercase tracking-[0.15em] text-[9px] md:text-[10px] rounded-xl transition-all flex items-center justify-center text-center px-1"
                      >
                        Continue as Spectator
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={onQuit}
                        className="flex-1 h-12 bg-transparent border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 font-black uppercase tracking-[0.15em] text-[9px] md:text-[10px] rounded-xl transition-all flex items-center justify-center text-center px-1"
                      >
                        Return to Lobby
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline"
                      onClick={onQuit}
                      className="w-full max-w-[240px] h-12 bg-transparent border-[#d4af37]/30 text-[#d4af37] hover:bg-[#d4af37]/10 font-black uppercase tracking-[0.15em] text-[9px] md:text-[10px] rounded-xl transition-all flex items-center justify-center text-center px-4"
                    >
                      Return to Lobby
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1000] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={handleCloseSettings}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto ${settings.theme === 'light' ? 'bg-white text-zinc-900' : 'bg-[#0f0f0f] text-white'} rounded-[32px] border ${settings.theme === 'light' ? 'border-zinc-200 shadow-2xl' : 'border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`sticky top-0 z-10 flex items-center justify-between p-6 ${settings.theme === 'light' ? 'bg-white/95' : 'bg-[#0f0f0f]/95'} backdrop-blur-md border-b ${settings.theme === 'light' ? 'border-zinc-200' : 'border-white/5'}`}>
                <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded-xl ${settings.theme === 'light' ? 'bg-[#d4af37]/20' : 'bg-[#d4af37]/10'} flex items-center justify-center border border-[#d4af37]/20`}>
                      <Settings className="w-4 h-4 text-[#d4af37]" />
                   </div>
                   <h2 className={`text-sm font-bold uppercase tracking-[0.2em] ${settings.theme === 'light' ? 'text-[#b08d2b]' : 'text-[#d4af37]'}`}>Game Experience</h2>
                </div>
                <button 
                  onClick={handleCloseSettings}
                  className={`p-2 rounded-full transition-colors ${settings.theme === 'light' ? 'hover:bg-zinc-100 text-zinc-500' : 'hover:bg-white/5 text-zinc-400'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Gameplay Settings Section */}
                <section className="space-y-4">
                  <h3 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Gameplay & Sound</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'soundEffects', label: 'Sound Effects', icon: <Volume2 className="w-4 h-4" /> },
                      { key: 'turboMode', label: 'Turbo Mode (Faster)', icon: <Zap className="w-4 h-4" /> },
                      { key: 'showTips', label: 'Gameplay Tips & Tooltips', icon: <HelpCircle className="w-4 h-4" /> },
                      { key: 'voiceCommands', label: 'Voice Commands (BETA)', icon: <Mic className="w-4 h-4" /> },
                    ].map((opt: any) => (
                      <div 
                        key={opt.key}
                        onClick={async () => {
                          soundService.play('click');
                          const newVal = !settings[opt.key as keyof typeof settings];
                          
                          if (opt.key === 'voiceCommands' && newVal) {
                            // Explicitly request permission when enabling
                            await voiceCommandService.requestPermission();
                          }

                          if (opt.key === 'showTips') {
                            updateSettings({ showTips: newVal, showTooltips: newVal });
                          } else {
                            updateSettings({ [opt.key]: newVal });
                          }
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${settings[opt.key as keyof typeof settings] ? 'bg-[#d4af37]/5 border-[#d4af37]/30' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${settings[opt.key as keyof typeof settings] ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-zinc-800 text-zinc-500'}`}>
                              {opt.icon}
                           </div>
                           <div className="flex flex-col text-left">
                             <span className="text-xs font-bold">{opt.label}</span>
                           </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${settings[opt.key as keyof typeof settings] ? 'bg-[#d4af37]' : 'bg-zinc-800'}`}>
                           <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${settings[opt.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Assistance & HUD Section */}
                <section className="space-y-4">
                  <h3 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Assistance & HUD</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'enableInsights', label: 'Win Probability', icon: <TrendingUp className="w-4 h-4" /> },
                      { key: 'showPotOdds', label: 'Pot Odds (%)', icon: <TrendingUp className="w-4 h-4" /> },
                      { key: 'enableAiChat', label: 'AI Chat Phrases', icon: <Monitor className="w-4 h-4" /> },
                      { key: 'highlightBestHand', label: 'Highlight Hand Results', icon: <Sparkles className="w-4 h-4" /> },
                      { 
                        key: 'enableTimer', 
                        label: '20 Second Timer', 
                        icon: <Gauge className="w-4 h-4" />
                      },
                      { key: 'showHandRankingsHelper', label: 'Hand Guide Button', icon: <Monitor className="w-4 h-4" /> },
                      { key: 'rabbitHunting', label: 'Rabbit Hunting', icon: <FastForward className="w-4 h-4" /> },
                    ].map((opt: any) => (
                      <div 
                        key={opt.key}
                        onClick={() => {
                          soundService.play('click');
                          updateSettings({ [opt.key]: !settings[opt.key as keyof typeof settings] });
                        }}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${settings[opt.key as keyof typeof settings] ? 'bg-[#d4af37]/5 border-[#d4af37]/30' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${settings[opt.key as keyof typeof settings] ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-zinc-800 text-zinc-500'}`}>
                              {opt.icon}
                           </div>
                           <div className="flex flex-col text-left">
                             <span className="text-xs font-bold">{opt.label}</span>
                           </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full transition-colors relative ${settings[opt.key as keyof typeof settings] ? 'bg-[#d4af37]' : 'bg-zinc-800'}`}>
                           <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${settings[opt.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Visual Settings Section */}
                <section className="space-y-4">
                  <h3 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Visuals & Environment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Theme Toggle - First Option */}
                    <div 
                      onClick={() => {
                        soundService.play('click');
                        const newTheme = settings.theme === 'light' ? 'dark' : 'light';
                        updateSettings({ theme: newTheme });
                      }}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer md:col-span-2 shadow-sm ${settings.theme === 'light' ? 'bg-[#d4af37]/10 border-[#d4af37]/40 ring-1 ring-[#d4af37]/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${settings.theme === 'light' ? 'bg-white text-[#d4af37]' : 'bg-zinc-800 text-zinc-400'}`}>
                            {settings.theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                         </div>
                         <div className="flex flex-col">
                           <span className="text-sm font-black uppercase tracking-wider">{settings.theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                         </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-all relative ${settings.theme === 'dark' ? 'bg-[#d4af37]' : 'bg-zinc-300'}`}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${settings.theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-zinc-400">Table Felt Color</span>
                      <div className="grid grid-cols-6 gap-2">
                        {Object.entries(TABLE_COLORS).map(([id, hex]) => (
                          <button
                            key={id}
                            onClick={() => {
                              soundService.play('tick');
                              updateSettings({ tableColor: id as any });
                            }}
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${settings.tableColor === id ? 'border-[#d4af37] ring-2 ring-[#d4af37]/20 ring-offset-2 ring-offset-black' : 'border-transparent'}`}
                            style={{ backgroundColor: hex }}
                            title={id}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Card Settings Section */}
                <section className="space-y-4">
                  <h3 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Card Design</h3>
                  <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                    {designs.map((design) => (
                      <button
                        key={design}
                        onClick={() => {
                          soundService.play('tick');
                          updateSettings({ cardBackDesign: design });
                        }}
                        className={`relative aspect-[2.5/4] rounded-md overflow-hidden border-2 transition-all ${
                          settings.cardBackDesign === design 
                            ? "border-[#d4af37] scale-110 z-10 shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                        title={design.replace('-', ' ')}
                      >
                         <CardBack design={design} />
                         {settings.cardBackDesign === design && (
                           <div className="absolute top-0.5 right-0.5 bg-[#d4af37] rounded-full p-0.5">
                              <Check className="w-2 h-2 text-black" />
                           </div>
                         )}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHandHelper && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`absolute right-4 top-20 bottom-24 w-80 z-[11000] p-5 rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col ${settings.theme === 'light' ? 'bg-white/95 border-black/10' : 'bg-black/95 border-white/10'}`}
          >
            <div className="flex justify-between items-center mb-5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#d4af37] rounded-full" />
                <h3 className="text-[11px] uppercase font-bold tracking-[0.2em] text-[#d4af37]">Hand Rankings</h3>
              </div>
              <button 
                onClick={() => setShowHandHelper(false)}
                className="text-zinc-500 hover:text-white transition-all hover:rotate-90"
              >
                <div className="w-5 h-5 flex items-center justify-center text-xs">✕</div>
              </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {HAND_RANKINGS.map((rank, i) => (
                <div key={i} className="flex flex-col gap-2 group p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white group-hover:text-[#d4af37] transition-colors">{rank.name}</span>
                    <span className="text-[9px] text-zinc-500 italic mt-0.5">{rank.desc}</span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {rank.example.map((card, ci) => (
                      <Card 
                        key={ci} 
                        card={card as PokerCardType} 
                        className="!w-9 !h-12 !p-1.5 !rounded-md shadow-lg border-white/5" 
                      />
                    ))}
                  </div>
                  {i < HAND_RANKINGS.length - 1 && <div className="h-[1px] w-full bg-white/5 mt-1" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saloon table: compact top bar + menu, responsive table (no shrink-to-fit), hero stack/fan, thumb-zone actions */}
      <SaloonTable containerRef={containerRef} ctx={saloonCtx} />
    </div>
    
    {/* Voice Feedback Overlay - High Z-Index to stay above everything */}
    <AnimatePresence>
      {voiceFeedback && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-32 left-0 right-0 flex justify-center z-[99999] pointer-events-none"
        >
          <div className="bg-black/90 backdrop-blur-xl border border-[#d4af37] px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_50px_rgba(0,0,0,0.8)] border-b-2 border-[#d4af37]/60">
            <div className="relative">
              {voiceStatus === 'listening' ? (
                <>
                  <motion.div 
                    animate={{ scale: [1, 1.8], opacity: [0.5, 0] }} 
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute inset-0 bg-[#d4af37] rounded-full"
                  />
                  <Mic className="w-4 h-4 text-[#d4af37] relative z-10" />
                </>
              ) : (
                <Zap className="w-4 h-4 text-[#d4af37]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#d4af37]/60 leading-none mb-1">
                {voiceStatus === 'listening' ? 'Voice Sensing' : 'Command Recognized'}
              </span>
              <span className="text-[12px] font-black uppercase tracking-widest text-[#d4af37] leading-none">{voiceFeedback}</span>
            </div>
          </div>
        </motion.div>
      )}

      {pendingVoiceAction && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed inset-0 flex items-center justify-center z-[100000] bg-black/40 backdrop-blur-sm px-4"
        >
          <motion.div 
             className="bg-zinc-950 border-2 border-[#d4af37] p-6 rounded-[32px] shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col items-center gap-5 max-w-sm w-full"
          >
            <div className="w-12 h-12 rounded-full bg-[#d4af37]/10 flex items-center justify-center border border-[#d4af37]/20">
              <Mic className="w-6 h-6 text-[#d4af37]" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-[#d4af37]">Voice Action</h3>
              <p className="text-xl font-bold text-white tracking-tight leading-tight">Confirm <span className="text-[#d4af37]">{pendingVoiceAction.action}</span>?</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button 
                onClick={() => {
                  soundService.play('click');
                  handleVoiceAction(pendingVoiceAction);
                }}
                className="py-4 bg-[#d4af37] hover:bg-[#e5c158] text-black text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Confirm
              </button>
              <button 
                onClick={() => {
                  soundService.play('click');
                  setPendingVoiceAction(null);
                  setVoiceFeedback(null);
                }}
                className="py-4 bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest border border-white/5 transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      <AnimatePresence>
        {showFullscreenHint && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-[320px]"
          >
            <div className={`${settings.theme === 'light' ? 'bg-white' : 'bg-[#0f0f0f]'} border ${settings.theme === 'light' ? 'border-zinc-200' : 'border-[#d4af37]/40'} p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden`}>
               {/* Internal Glow */}
               <div className={`absolute inset-0 ${settings.theme === 'light' ? 'bg-[#d4af37]/5' : 'bg-[#d4af37]/10'} pointer-events-none`} />
               
               <div className="relative flex flex-col items-center text-center gap-3">
                 <div className={`w-12 h-12 rounded-2xl ${settings.theme === 'light' ? 'bg-[#d4af37]/10' : 'bg-[#d4af37]/20'} flex items-center justify-center border border-[#d4af37]/30 shadow-lg`}>
                   <RotateCcw className="w-6 h-6 text-[#d4af37] animate-pulse" />
                 </div>
                 
                 <div className="space-y-1">
                   <p className={`${settings.theme === 'light' ? 'text-zinc-900' : 'text-white'} text-sm font-black uppercase tracking-widest`}>Full Screen</p>
                   <p className="text-zinc-500 text-[11px] leading-relaxed">
                     {isIPhone 
                       ? "True full screen is limited on iPhone. Install the app (Add to Home Screen) to play full screen in portrait or landscape." 
                       : "Your browser blocked the full screen request. The table still fits your screen in portrait or landscape."}
                   </p>
                 </div>

                 <button 
                   onClick={() => setShowFullscreenHint(false)}
                   className={`mt-1 w-full py-2 ${settings.theme === 'light' ? 'bg-zinc-100 hover:bg-zinc-200' : 'bg-white/5 hover:bg-white/10'} rounded-xl text-[#d4af37] text-[10px] uppercase font-black tracking-[0.2em] transition-all border border-white/5`}
                 >
                   Got it
                 </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </AnimatePresence>
    </>
  );
}

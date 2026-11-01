import { useState, useEffect, useRef, useMemo, useCallback, type CSSProperties } from "react";
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
  const isUserTurn = currentPlayer?.isUser && !isShowdown;

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

  const isAllInSituation = useMemo(() => {
    if (gameState.phase === 'setup' || gameState.phase === 'showdown') return false;
    const playersInHand = gameState.players.filter(p => !p.isFolded && !p.isEliminated);
    if (playersInHand.length < 2) return false;

    const maxRoundBet = Math.max(...playersInHand.map(p => p.currentBet || 0), 0);
    const bettingSettled = playersInHand.every(p => p.chips === 0 || p.currentBet === maxRoundBet);
    const playersWithChips = playersInHand.filter(p => p.chips > 0);

    return bettingSettled && playersWithChips.length <= 1;
  }, [gameState.players, gameState.phase]);

  // Auto-advance streets in all-in situations
  useEffect(() => {
    if (isAllInSituation && !isShowdown && !isPaused) {
      const timer = setTimeout(() => {
        onAction('check', 0);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [isAllInSituation, isShowdown, onAction, isPaused]);

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
  }, [gameState.currentPlayerIndex, gameState.phase, isShowdown, isUserTurn, currentPlayer?.id, onAction, aiDelay, settings.enableAiChat, isPaused]);

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

      {/* Header Info */}
      <div 
        className="absolute z-[250] flex items-start justify-between pointer-events-none w-full"
        style={{
          top: 'max(8px, env(safe-area-inset-top))',
          left: '0',
          right: '0',
          paddingLeft: 'max(8px, env(safe-area-inset-left))',
          paddingRight: 'max(8px, env(safe-area-inset-right))',
        }}
      >
        {/* DESKTOP HEADER (MD AND UP) */}
        <div className="hidden md:flex flex-row items-center justify-between w-full pointer-events-none">
            <div className="flex flex-row items-center gap-1.5 sm:gap-3 pointer-events-auto flex-nowrap">
              <div className="flex flex-col pr-2 border-r border-white/10 shrink-0">
                 <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#d4af37] mb-0 whitespace-nowrap">RIVER'S EDGE</span>
                 <span className="hidden sm:block text-[8px] md:text-[10px] font-black text-white uppercase tracking-wider whitespace-nowrap">Hand #{gameState.handCount}</span>
              </div>
    
              <div className="flex flex-row items-center gap-1 sm:gap-1.5">
                <button 
                  onClick={() => {
                    updateSettings({ soundEffects: !settings.soundEffects });
                    soundService.play('click');
                  }}
                  className="bg-zinc-900/50 border border-white/5 text-zinc-400 h-8 md:h-10 px-3 md:px-4 rounded transition-all hover:bg-zinc-800 hover:border-[#d4af37]/30 hover:text-[#d4af37] flex items-center justify-center gap-1.5 group w-fit shadow-sm whitespace-nowrap"
                  title={settings.soundEffects ? "Mute All Sound" : "Unmute All Sound"}
                >
                  {settings.soundEffects ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-30" />}
                  <span className="text-[9px] font-bold uppercase tracking-widest hidden sm:inline">{settings.soundEffects ? "Mute" : "Unmute"}</span>
                </button>
 
                {settings.showHandRankingsHelper && (
                  <button 
                    onClick={() => {
                      soundService.play('click');
                      const nextState = !showHandHelper;
                      if (nextState && !isPaused) {
                        setIsPaused(true);
                        setWasPausedBeforeSettings(false);
                      }
                      setShowHandHelper(nextState);
                    }}
                    className={`bg-zinc-900/50 border border-white/5 text-zinc-400 h-8 md:h-10 px-3 md:px-4 rounded transition-all hover:bg-zinc-800 hover:border-[#d4af37]/30 hover:text-[#d4af37] flex items-center justify-center gap-1.5 group w-fit shadow-sm whitespace-nowrap ${showHandHelper ? 'text-[#d4af37] border-[#d4af37]/40 bg-[#d4af37]/5' : ''}`}
                    title="Hand Rankings Guide"
                  >
                    <Monitor className={`w-3.5 h-3.5 ${showHandHelper ? 'text-[#d4af37]' : ''}`} />
                    <span className="text-[9px] font-bold uppercase tracking-widest hidden xs:inline">Guide</span>
                  </button>
                )}
 
                <button 
                  onClick={() => {
                    soundService.play('click');
                    const newState = !settings.showTips;
                    if (newState && !isPaused) {
                      setIsPaused(true);
                      setWasPausedBeforeSettings(false);
                    }
                    updateSettings({ showTips: newState, showTooltips: newState });
                  }}
                  className={`bg-zinc-900/50 border border-white/5 text-zinc-400 h-8 md:h-10 px-3 md:px-4 rounded transition-all hover:bg-zinc-800 hover:border-[#d4af37]/30 hover:text-[#d4af37] flex items-center justify-center gap-1.5 group w-fit shadow-sm whitespace-nowrap ${settings.showTips ? 'text-[#d4af37] border-[#d4af37]/40 bg-[#d4af37]/5' : ''}`}
                  title={settings.showTips ? "Gameplay Assistance: Enabled" : "Gameplay Assistance: Disabled"}
                >
                  <HelpCircle className={`w-3.5 h-3.5 ${settings.showTips ? 'text-[#d4af37]' : ''}`} />
                  <span className="text-[9px] font-bold uppercase tracking-widest hidden xs:inline">Tips</span>
                </button>
 
                <div className="relative">
                  <button 
                    onClick={() => {
                      soundService.play('click');
                      updateSettings({ voiceCommands: !settings.voiceCommands });
                    }}
                    className={`bg-zinc-900/50 border border-white/5 text-zinc-400 h-8 md:h-10 px-3 md:px-4 rounded transition-all hover:bg-zinc-800 hover:border-[#d4af37]/30 hover:text-[#d4af37] flex items-center justify-center gap-1.5 group w-fit shadow-sm whitespace-nowrap ${settings.voiceCommands ? 'text-[#d4af37] border-[#d4af37]/40 bg-[#d4af37]/5' : ''}`}
                    title={
                      !voiceCommandService.isSupported() ? "Voice Commands not supported" :
                      voiceStatus === 'permission-denied' ? "Microphone access blocked. Please check browser permissions." :
                      settings.voiceCommands ? "Voice Commands: Enabled" : "Voice Commands: Disabled"
                    }
                  >
                    {settings.voiceCommands ? (
                      <div className="relative">
                        <Mic className={`w-3.5 h-3.5 ${voiceStatus === 'permission-denied' ? 'text-red-500' : 'text-[#d4af37]'}`} />
                        {voiceStatus === 'listening' && (
                          <motion.div 
                            animate={{ scale: [1, 1.8, 1], opacity: [1, 0, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute inset-0 rounded-full bg-[#d4af37]/60"
                          />
                        )}
                      </div>
                    ) : (
                      <MicOff className="w-3.5 h-3.5 opacity-30" />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-widest hidden xs:inline">
                      {settings.voiceCommands ? (
                        voiceStatus === 'listening' ? 'Mic ON' : 
                        voiceStatus === 'permission-denied' ? 'Blkrd' :
                        voiceStatus === 'error' ? 'Err' : 'Mic'
                      ) : 'Mic'}
                    </span>
                  </button>
                </div>
              </div>
    
              {isSpectating && (
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 border border-[#d4af37]/30 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.1)] w-fit scale-75 origin-left">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                    <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Spectating</span>
                 </div>
              )}
            </div>
            
            <div className={`flex flex-row items-center gap-1 sm:gap-2 pointer-events-auto shrink-0 ${isSmallLandscape ? 'scale-[0.85] origin-right' : ''}`}>
              {/* 1. Pause / Play button */}
              <button 
                onClick={togglePause}
                className={`h-8 md:h-10 px-3 md:px-4 border transition-all flex items-center justify-center gap-1.5 rounded backdrop-blur-md ${
                  isPaused 
                    ? "bg-[#d4af37] border-[#d4af37] text-black shadow-[0_0_20px_rgba(212,175,55,0.5)] scale-105" 
                    : "bg-black/40 hover:bg-black/60 border-white/10 hover:border-[#d4af37]/30 text-[#d4af37]"
                }`}
                title={isPaused ? "Play Game" : "Pause Game"}
              >
                <div className="flex items-center gap-1.5">
                  {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
                  <span className="hidden sm:inline text-[9px] uppercase font-black tracking-widest leading-none">{isPaused ? "Play" : "Pause"}</span>
                </div>
              </button>

              {/* 2. Game Experience (Settings) button */}
              <button 
                onClick={toggleSettings}
                className="h-8 md:h-10 px-3 md:px-4 bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/10 hover:border-[#d4af37]/30 text-[9px] uppercase font-black tracking-widest text-[#d4af37] rounded transition-all flex items-center justify-center gap-1.5"
                title="Open Settings"
              >
                <div className="flex items-center gap-1.5">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline leading-none whitespace-nowrap">Exp</span>
                </div>
              </button>

              {/* 3. Guide / How to Play button */}
              <button 
                onClick={() => {
                  soundService.play('click');
                  if (!isPaused) {
                    setIsPaused(true);
                    setWasPausedBeforeSettings(false);
                  }
                  setShowHowToPlay(true);
                }}
                className="h-8 md:h-10 px-3 md:px-4 bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/10 hover:border-[#d4af37]/30 text-[9px] uppercase font-black tracking-widest text-[#d4af37] rounded transition-all flex items-center justify-center gap-1.5"
                title="How to Play"
              >
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline leading-none whitespace-nowrap">Help</span>
                </div>
              </button>

              {/* 4. Full Screen / Window button */}
              <button 
                onClick={toggleFullscreen}
                className={`h-8 md:h-10 px-3 md:px-4 border transition-all flex items-center justify-center gap-1.5 rounded uppercase font-black tracking-widest text-[9px] backdrop-blur-md ${
                  isFullscreen 
                    ? "bg-[#d4af37]/10 border-[#d4af37]/40 text-[#d4af37] hover:bg-[#d4af37]/20" 
                    : "bg-black/40 border-white/10 hover:border-[#d4af37]/30 text-[#d4af37] hover:bg-black/60"
                }`}
                title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
              >
                <div className="flex items-center gap-1.5">
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  <span className="hidden sm:inline leading-none whitespace-nowrap">{isFullscreen ? "Exit FS" : "Full Screen"}</span>
                </div>
              </button>

              {/* 4. Forfeit button (renamed Exit) */}
              <button 
                onClick={onQuit}
                className="h-8 md:h-10 px-3 md:px-5 bg-black/40 backdrop-blur-md hover:bg-black/60 border border-white/10 hover:border-red-500/50 text-[9px] uppercase font-black tracking-widest text-red-500 rounded transition-all flex items-center justify-center gap-1.5 group shadow-sm"
                title="Forfeit current game and exit"
              >
                <span className="leading-none whitespace-nowrap">Forfeit</span>
              </button>
            </div>
        </div>

        {/* MOBILE HEADER (SMALL DEVICES) */}
        <div className="flex md:hidden flex-row items-center justify-between w-full pointer-events-auto px-2">
            <div className="flex flex-row items-center gap-2">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#d4af37] leading-none mb-0.5">RIVER'S EDGE</span>
                 <span className="text-[8px] font-extrabold text-white uppercase tracking-wider leading-none">Hand #{gameState.handCount}</span>
              </div>
            </div>

            <div className="flex flex-row items-center gap-1.5 relative">
              {/* Voice Commands (Mic button directly to the left of the Pause button, swapped with Mute) */}
              <button 
                onClick={() => {
                  updateSettings({ voiceCommands: !settings.voiceCommands });
                  soundService.play('click');
                }}
                className={`h-8 w-8 border transition-all flex items-center justify-center rounded-lg backdrop-blur-md ${
                  !settings.voiceCommands 
                    ? "bg-red-500/20 border-red-500/40 text-red-500 shadow-lg scale-105" 
                    : "bg-[#d4af37]/10 border-[#d4af37]/45 text-[#d4af37]"
                }`}
                title={settings.voiceCommands ? "Disable Voice Control" : "Enable Voice Control"}
              >
                {settings.voiceCommands ? <Mic className="w-3.5 h-3.5 text-[#d4af37]" /> : <MicOff className="w-3.5 h-3.5 text-red-400" />}
              </button>

              {/* Play / Pause Toggle directly accessible */}
              <button 
                onClick={togglePause}
                className={`h-8 w-8 border transition-all flex items-center justify-center rounded-lg backdrop-blur-md ${
                  isPaused 
                    ? "bg-[#d4af37] border-[#d4af37] text-black shadow-lg scale-105" 
                    : "bg-black/60 border-white/10 text-[#d4af37]"
                }`}
                title={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
              </button>

              {/* Fullscreen Button directly accessible */}
              <button 
                onClick={toggleFullscreen}
                className={`h-8 w-8 border transition-all flex items-center justify-center rounded-lg backdrop-blur-md ${
                  isFullscreen 
                    ? "bg-[#d4af37]/20 border-[#d4af37]/40 text-[#d4af37]" 
                    : "bg-black/60 border-white/10 text-[#d4af37]"
                }`}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-3 h-3" /> : <Maximize className="w-3 h-3" />}
              </button>

              {/* Hamburger Menu Toggler */}
              <button 
                onClick={() => {
                  soundService.play('click');
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
                className={`h-8 w-8 border transition-all flex items-center justify-center rounded-lg backdrop-blur-md ${
                  isMobileMenuOpen 
                    ? "bg-[#d4af37] border-[#d4af37] text-black" 
                    : "bg-black/60 border-white/10 text-zinc-400"
                }`}
                title="Toggle Menu"
              >
                {isMobileMenuOpen ? <X className="w-3.5 h-3.5 text-[#d4af37]" /> : <Menu className="w-3.5 h-3.5 text-[#d4af37]" />}
              </button>

              {/* Mobile Collapsible Dropdown Menu Panel */}
              <AnimatePresence>
                {isMobileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 top-11 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl p-3.5 shadow-2xl z-[1000] flex flex-col gap-3 pointer-events-auto min-w-[200px]"
                  >
                    <div className="flex flex-col gap-2">
                      {/* Hand Guide */}
                      {settings.showHandRankingsHelper && (
                        <button
                          onClick={() => {
                            soundService.play('click');
                            const nextState = !showHandHelper;
                            if (nextState && !isPaused) {
                              setIsPaused(true);
                              setWasPausedBeforeSettings(false);
                            }
                            setShowHandHelper(nextState);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${showHandHelper ? 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]' : 'bg-white/5 border-white/5 text-zinc-400'}`}
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          <span className="text-[9px] uppercase font-black tracking-wider">Guide</span>
                        </button>
                      )}

                      {/* Tips */}
                      <button
                        onClick={() => {
                          soundService.play('click');
                          const newState = !settings.showTips;
                          if (newState && !isPaused) {
                            setIsPaused(true);
                            setWasPausedBeforeSettings(false);
                          }
                          updateSettings({ showTips: newState, showTooltips: newState });
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${settings.showTips ? 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]' : 'bg-white/5 border-white/5 text-zinc-400'}`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-black tracking-wider">Tips</span>
                      </button>

                      {/* Sound Toggle (Mute button, now in the dropdown menu) */}
                      <button
                        onClick={() => {
                          soundService.play('click');
                          updateSettings({ soundEffects: !settings.soundEffects });
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${settings.soundEffects ? 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]' : 'bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20'}`}
                      >
                        {settings.soundEffects ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        <span className="text-[9px] uppercase font-black tracking-wider">{settings.soundEffects ? "Mute" : "Unmute"}</span>
                      </button>

                      {/* Experience settings */}
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          toggleSettings();
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/5 bg-white/5 text-[#d4af37] text-left hover:bg-white/10"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-black tracking-wider">Experience</span>
                      </button>

                      {/* How to Play Help */}
                      <button
                        onClick={() => {
                          soundService.play('click');
                          setIsMobileMenuOpen(false);
                          if (!isPaused) {
                            setIsPaused(true);
                            setWasPausedBeforeSettings(false);
                          }
                          setShowHowToPlay(true);
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-white/5 bg-white/5 text-[#d4af37] text-left hover:bg-white/10"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span className="text-[9px] uppercase font-black tracking-wider">Help Guide</span>
                      </button>



                      {/* Forfeit game */}
                      <button
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          onQuit();
                        }}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-left hover:bg-red-500/20 transition-colors"
                      >
                        <span className="text-[9px] uppercase font-black tracking-wider">Forfeit</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 relative flex items-center justify-center z-50 px-2 md:px-4 py-2 md:py-4 lg:py-8">
        {/* Game Stage Wrapper - Everything inside this scales together */}
        <div 
          style={{ 
            transform: `scale(${tableScale})`,
            width: '1200px',
            height: isSmallLandscape ? '600px' : '750px',
            transition: 'transform 0.1s ease-out',
            filter: 'none',
            pointerEvents: isPaused ? 'none' : 'auto'
          }}
          className="relative z-[100] flex items-center justify-center flex-shrink-0 transition-all duration-500 pointer-events-none"
        >
          {isPaused && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center pointer-events-none">
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  y: [0, -15, 0],
                }}
                transition={{
                  opacity: { duration: 0.3 },
                  scale: { duration: 0.3 },
                  y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  resumeGame();
                }}
                className="pointer-events-auto bg-[#d4af37] text-black px-8 md:px-12 py-4 md:py-6 rounded-full flex items-center gap-4 shadow-[0_20px_50px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95 transition-all group border-b-4 border-black/10"
              >
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-black/10 flex items-center justify-center border border-black/5 group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 md:w-7 md:h-7 fill-current" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-base md:text-2xl font-black uppercase tracking-widest leading-none">Resume Game</span>
                  <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Back to the Action</span>
                </div>
              </motion.button>
            </div>
          )}
          {/* The Felt & Rail */}
          <div 
            className={`relative w-[1000px] aspect-[2.4/1] rounded-full poker-rail flex flex-col items-center justify-center border-[2px] pointer-events-auto ${
              settings.theme === 'light' 
                ? 'shadow-[0_25px_60px_rgba(0,0,0,0.15)] border-zinc-200' 
                : 'shadow-[0_25px_60px_rgba(0,0,0,0.8)] border-[#ffffff10]'
            }`}
            style={{ 
              backgroundColor: '#1c1712', // Rich bumper base
            }}
          >
            {/* Elegant Outer Leather Bumper Finish */}
            <div className="absolute inset-0 rounded-full border-[14px] border-[#1f1a14] bg-[#2d241d] shadow-[inset_0_4px_12px_rgba(255,255,255,0.1),_inset_0_-4px_12px_rgba(0,0,0,0.8)] pointer-events-none z-10" />
            
            {/* Rich Wooden Mahogany racetrack zone with grain feel */}
            <div 
              className="absolute inset-[14px] rounded-full shadow-[inset_0_4px_16px_rgba(0,0,0,0.8),0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none z-10"
              style={{
                background: 'linear-gradient(135deg, #602506 0%, #3a1501 50%, #1f0b00 100%)',
                borderColor: '#110500',
                borderWidth: '10px',
                borderStyle: 'solid'
              }}
            />

            {/* Internal Felt Area */}
            <div 
              className="absolute inset-[32px] rounded-full overflow-hidden shadow-[inset_0_0_120px_rgba(0,0,0,0.7)] border-2 border-black/50"
              style={{ backgroundColor: TABLE_COLORS[settings.tableColor || 'green'] }}
            >
               {/* Realistic Felt Texture Overlay */}
               <div className="absolute inset-0 opacity-15 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
               
               {/* Inner Betting Line decoration */}
               <div className="absolute inset-10 border border-white/15 rounded-full pointer-events-none opacity-40" />
            </div>
            {/* Absolute Top-Centered Pot Title and Amount (Moved to top edge of the table felt) */}
            <div className="absolute top-[28px] left-1/2 -translate-x-1/2 text-center z-40 pointer-events-none flex flex-col items-center">
              <div className="text-[18px] xs:text-[20px] md:text-[23px] uppercase tracking-[0.28em] text-[#d4af37] font-black mb-1.5 drop-shadow-2xl gold-glow leading-none opacity-95">
                Total Pot
              </div>
              <div className="text-emerald-400 font-mono font-black text-[22px] xs:text-[25px] md:text-[30px] leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)] bg-black/95 px-6 py-2.5 border-2 border-[#d4af37]/50 rounded-[1.25rem] shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-lg flex items-center justify-center min-w-[140px]">
                <span className="text-[#d4af37] font-black mr-1.5">$</span>
                {gameState.pot.toLocaleString()}
              </div>
            </div>

            {/* Interactive Player Cards & Name tags spread evenly around the table felt */}
            {gameState.players.map((player, idx) => {
              const userIndex = gameState.players.findIndex(p => p.isUser);
              const totalPlayers = gameState.players.length;
              const relIdx = (idx - userIndex + totalPlayers) % totalPlayers;
              const seat = getSeatCoordinates(relIdx, totalPlayers);
              if (!seat) return null;

              const isCurrent = gameState.currentPlayerIndex === idx;
              const isWinner = winners.includes(player.id);
              const isFolded = player.isFolded;
              const isEliminated = player.isEliminated;
              const isUser = player.isUser;
              
              const isShowdown = gameState.phase === 'showdown';

              // Show cards if is user, isShowdown, or if it is an all-in reveal scenario
              const showCardsFaceUp = isUser || isShowdown || (isAllInSituation && !isFolded && !isEliminated);

              // Parse seat coordinates
              const topPct = parseFloat(seat.top);
              const leftPct = parseFloat(seat.left);

              // Classify seat orientation based on its percentage location
              const isTop = topPct <= 20;
              const isBottom = topPct >= 80;
              const isRight = leftPct >= 80 && !isTop && !isBottom;
              const isLeft = leftPct <= 20 && !isTop && !isBottom;

              // Determine absolute placement values for the Name box relative to the Cards anchor
              let nameTagPositionClass = "";
              if (isTop) {
                // Name plate is placed below cards (resting on the table felt)
                nameTagPositionClass = "absolute top-[110%] left-1/2 -translate-x-1/2";
              } else if (isBottom) {
                // Name plate is placed above cards (resting on the table felt)
                nameTagPositionClass = "absolute bottom-[110%] left-1/2 -translate-x-1/2";
              } else if (isRight) {
                // Name plate is placed to the left of cards (pointing inside the table felt)
                nameTagPositionClass = "absolute right-[115%] top-1/2 -translate-y-1/2";
              } else {
                // Left player - Name plate is placed to the right of cards (pointing inside the table felt)
                nameTagPositionClass = "absolute left-[115%] top-1/2 -translate-y-1/2";
              }

              // Position Dealer button depending on the orientation to avoid collisions
              let dealerButtonPositionClass = "absolute -right-4 -top-3";
              if (isBottom) {
                dealerButtonPositionClass = "absolute -right-4 -bottom-2";
              } else if (isRight) {
                dealerButtonPositionClass = "absolute -right-2 -top-4";
              } else if (isLeft) {
                dealerButtonPositionClass = "absolute -left-2 -top-4";
              }

              return (
                <div
                  key={`felt-player-${player.id}`}
                  className="absolute z-40 transition-all duration-300 pointer-events-auto"
                  style={{
                    left: seat.left,
                    top: seat.top,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="relative">
                    {/* Pocket Cards Representing Each Player on Table */}
                    <div className="relative">
                      {!isEliminated ? (
                        <div className={`flex flex-row items-center -space-x-[28px] md:-space-x-[32px] justify-center relative transition-all duration-300 ${isFolded ? 'opacity-40 saturate-[0.2] scale-95' : ''}`}>
                          {player.cards.map((card, ci) => (
                            <Card
                              key={ci}
                              card={card}
                              hidden={!showCardsFaceUp}
                              className="!w-[72px] !h-[102px] md:!w-[80px] md:!h-[112px] rounded-[6px] border border-black/20 font-mono text-[11px] flex-shrink-0 shadow-lg"
                              highlight={settings.highlightBestHand && isShowdown && winnersInfo.some(w => w.id === player.id && w.bestHand.some(bc => bc.rank === card.rank && bc.suit === card.suit))}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="h-[102px] md:h-[112px] flex items-center justify-center">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-red-500/50 bg-black/40 px-2.5 py-0.5 rounded-full border border-red-500/10">OUT</span>
                        </div>
                      )}

                      {/* Dealer Button indicator */}
                      {player.isDealer && (
                        <div className={`${dealerButtonPositionClass} w-6 h-6 bg-white text-zinc-900 border-2 border-[#d4af37] font-black text-[10px] rounded-full flex items-center justify-center shadow-lg select-none scale-105 shrink-0 z-50`}>
                          D
                        </div>
                      )}
                    </div>

                    {/* Player details tag right below or above cards */}
                    <div 
                      className={`${nameTagPositionClass} px-5 py-2 rounded-full border flex flex-col items-center justify-center text-center transition-all opacity-50 hover:opacity-100 duration-200 cursor-default ${
                        isCurrent && !isPaused
                          ? 'bg-[#d4af37] border-2 border-amber-300 text-black shadow-[0_0_20px_rgba(212,175,55,0.7)] scale-105'
                          : isEliminated
                            ? 'bg-stone-300 border-dashed border-stone-400 text-zinc-500 line-through'
                            : isFolded
                              ? 'bg-stone-200 border border-stone-350 text-zinc-700 shadow-sm font-semibold'
                              : 'bg-white border-2 border-[#d4af37] text-black shadow-lg'
                      }`}
                      style={{ minWidth: '140px' }}
                    >
                      <span className="text-[22px] xs:text-[25px] md:text-[28px] uppercase font-black tracking-wide leading-none text-black whitespace-nowrap">
                        {player.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Center Area: Community Cards and chips pile (Without un-needed text overlay) */}
            <div className="relative z-30 flex flex-col items-center gap-2 mt-12">
                <div className="text-center group flex flex-col items-center">
                  <ChipStack amount={gameState.pot} showValue={false} variant="pot" className="scale-110 mb-2 z-[90] relative" />
                  {gameState.pots && gameState.pots.length > 1 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-wrap gap-1.5 justify-center max-w-[280px] mb-2 pointer-events-auto"
                    >
                      {gameState.pots.map((p, idx) => (
                        <div 
                          key={`${p.id}-${idx}`} 
                          className={`text-[8px] md:text-[9.5px] font-mono border rounded-full px-2.5 py-1 leading-none shadow-sm flex items-center gap-1 ${
                            settings.theme === 'light' 
                              ? 'bg-zinc-100 border-zinc-200 text-zinc-600 shadow-zinc-100' 
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 shadow-zinc-950/40'
                          }`}
                        >
                          <span className="font-semibold text-[#d4af37]/90">{p.name}:</span>
                          <span className="font-bold font-sans">${p.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Community Cards */}
               <div className="flex gap-2 py-1.5 justify-center">
                <AnimatePresence>
                  {Array.from({ length: 5 }).map((_, i) => {
                    if (i < gameState.communityCards.length) {
                      const card = gameState.communityCards[i];
                      return (
                        <Card 
                          key={`comm-slot-${i}-card`} 
                          card={card} 
                          className="community-card" 
                          highlight={settings.highlightBestHand && isShowdown && winnersInfo.some(w => w.bestHand.some(bc => bc.rank === card.rank && bc.suit === card.suit))}
                        />
                      );
                    } else if (isRabbitHuntActive && i < gameState.communityCards.length + rabbitHuntCards.length) {
                      const card = rabbitHuntCards[i - gameState.communityCards.length];
                      return (
                        <div key={`rabbit-slot-${i}-rabbit`} className="opacity-50 grayscale border-2 border-dashed border-[#d4af37]/30 rounded-md overflow-hidden relative community-card">
                          <Card 
                            card={card} 
                            className="w-full h-full community-card" 
                          />
                          <div className="absolute inset-0 bg-[#d4af37]/5 pointer-events-none" />
                        </div>
                      );
                    } else {
                      return (
                        <div key={`empty-slot-${i}-empty`} className={`community-card border rounded-md flex items-center justify-center backdrop-blur-sm ${settings.theme === 'light' ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                          <div className={`w-4 h-4 border border-white/10 rounded-full opacity-20 ${settings.theme === 'light' ? 'border-black' : 'border-white'}`} />
                        </div>
                      );
                    }
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Rabbit Hunt Insight Popup */}
            <AnimatePresence>
              {isRabbitHuntActive && gameState.rabbitHuntInsight && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 z-[300] w-full max-w-sm pointer-events-none px-4"
                >
                  <div className={`p-6 rounded-[32px] border backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8)] border-[#d4af37]/30 bg-black/80 flex flex-col items-center gap-4 text-center ring-1 ring-white/10`}>
                    <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/20 flex items-center justify-center border border-[#d4af37]/30 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                      <Zap className="w-6 h-6 text-[#d4af37] animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-5 w-full">
                      {(() => {
                        const parts = gameState.rabbitHuntInsight.split('|');
                        const outcome = parts[1];
                        const verdict = parts[3];
                        const vibe = parts[5];
                        const isGood = verdict.includes('RIGHT') || verdict.includes('DOMINANCE');
                        const isBad = verdict.includes('PAINFUL') || verdict.includes('TOUGH');

                        return (
                          <>
                            <div className="flex flex-col gap-1">
                              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#d4af37]/60">The Outcome</h3>
                              <p className="text-[11px] text-zinc-300 font-mono tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
                                {outcome}
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-2 items-center py-1">
                              <div className={`px-5 py-2 rounded-2xl text-[13px] font-black tracking-[0.25em] uppercase shadow-lg ${
                                isGood ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-green-900/20' : 
                                isBad ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-red-900/20' : 
                                'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30 shadow-yellow-900/20'
                              }`}>
                                {verdict}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1.5 px-2">
                              <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-[#d4af37]/60">Analyst Voice</h3>
                              <p className="text-xs md:text-[13px] text-white font-serif italic leading-relaxed drop-shadow-md">
                                "{vibe}"
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                      Based on cards that were never dealt
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div> {/* Closes The Felt & Rail */}

          {/* Sibling Elements under Game Stage Wrapper for Desktop Outer Margins */}
          
          {/* Live Action (Left side outer margin of Game Stage Wrapper) */}
          <div className={`absolute left-[8px] top-[14%] bottom-[14%] w-[114px] z-40 ${isSmallLandscape || isMobile ? 'hidden' : 'hidden lg:flex'} flex-col gap-2 pointer-events-auto`}>
            <div className="flex items-center gap-2 px-1 flex-shrink-0">
              <Zap className="w-2.5 h-2.5 text-[#d4af37]" />
              <span className="text-[8.5px] font-black uppercase tracking-[0.2em] text-[#d4af37] opacity-80">Live Action</span>
            </div>
            <div 
              className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1"
              onScroll={handleLogScroll}
            >
              <div className="flex-grow" />
              <AnimatePresence initial={false}>
                {gameState.actionLog.slice(-15).map((log, i, arr) => {
                  const isLatest = i === arr.length - 1;
                  return (
                    <motion.div
                      key={`desktop-log-${log.id}-${i}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`text-[8.5px] py-1.5 px-1.5 rounded-lg border leading-tight backdrop-blur-md transition-all duration-300 shrink-0 ${
                        isLatest 
                          ? 'bg-[#d4af37]/15 border-[#d4af37]/40 text-[#d4af37] font-bold shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
                          : settings.theme === 'light' ? 'bg-white/50 border-black/10 text-zinc-800 font-medium' : 'bg-black/50 border-white/10 text-zinc-300 font-medium'
                      }`}
                    >
                      {log.message}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={logEndRef} className="h-0" />
            </div>
          </div>

          {/* Player Standings Sidebar (Right side outer margin of Game Stage Wrapper) */}
          <div className={`absolute right-[8px] top-[4%] bottom-[4%] w-[124px] z-40 ${isSmallLandscape || isMobile ? 'hidden' : 'hidden lg:flex'} flex-col gap-2 pointer-events-auto overflow-hidden`}>
            <AnimatePresence mode="wait">
              {isShowdown ? (
                <motion.div 
                  key="desktop-result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-1.5 flex-shrink-0"
                >
                  <div className="flex items-center gap-1.5 px-1 shrink-0">
                    <Trophy className="w-2.5 h-2.5 text-[#d4af37] animate-bounce" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#d4af37]">Winners</span>
                  </div>
                  {winnersInfo.map((w, index) => {
                    const player = gameState.players.find(p => p.id === w.id);
                    if (!player) return null;
                    const winShare = winnersInfo.length > 0 ? Math.floor(gameState.pot / winnersInfo.length) : gameState.pot;
                    return (
                      <motion.div
                        key={`winner-standing-${w.id}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-1.5 rounded-xl border flex flex-col gap-1 backdrop-blur-md bg-black/60 border-white/10 text-white shadow-lg"
                      >
                        <div className="flex items-center justify-between font-bold w-full text-[8.5px]">
                          <span className="uppercase text-[#d4af37] tracking-wider font-extrabold whitespace-nowrap" title={player.name}>{player.name}</span>
                          <span className="font-mono text-emerald-400 shrink-0 font-black">${winShare.toLocaleString()}</span>
                        </div>
                        <div className="bg-[#d4af37] text-black font-black text-[8px] uppercase tracking-wider py-0.5 px-1 rounded text-center whitespace-normal break-words leading-tight">
                          {w.handLabel}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div 
                  key="desktop-standings-active"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col gap-1.5 h-full overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 px-1 shrink-0">
                    <Trophy className="w-2.5 h-2.5 text-[#d4af37] opacity-80" />
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Standings</span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1 text-left">
                    {gameState.players.filter(player => !player.isUser).map((player) => {
                      const isCurrent = gameState.currentPlayerIndex === gameState.players.indexOf(player);
                      const isFolded = player.isFolded;
                      const isEliminated = player.isEliminated;
                      return (
                        <div 
                          key={`desktop-standing-${player.id}`}
                          className={`text-[6.2px] py-0.5 px-1.5 bg-gradient-to-r rounded-xl border leading-tight transition-all duration-300 font-mono ${
                            isCurrent
                              ? 'from-[#d4af37]/10 to-transparent border-[#d4af37]/45 text-[#d4af37] font-bold shadow-[0_0_15px_rgba(212,175,55,0.08)]'
                              : isEliminated
                                ? 'opacity-30 border-dashed border-white/5 text-zinc-600 line-through'
                                : isFolded
                                  ? 'opacity-50 border-white/5 text-zinc-500'
                                  : settings.theme === 'light' ? 'bg-white/95 border-black/10 text-zinc-900 font-medium' : 'bg-[#0a0a0a]/75 border-white/5 text-[#d4af37] shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)] font-semibold'
                          }`}
                        >
                          <div className="flex flex-col uppercase font-semibold text-left">
                            <div className="flex items-center justify-between gap-1 w-full text-[6.8px] font-extrabold tracking-widest leading-none">
                              <span className="whitespace-nowrap">{player.name}</span>
                              {isCurrent && <span className="text-[5.5px] text-[#d4af37] bg-[#d4af37]/10 px-0.5 py-[1px] rounded animate-pulse shrink-0 font-sans">PLAY</span>}
                              {isFolded && !isEliminated && <span className="text-[5.5px] text-zinc-500 shrink-0 font-sans">FOLD</span>}
                              {isEliminated && <span className="text-[5.5px] text-red-500/80 shrink-0 font-sans">OUT</span>}
                            </div>
                            <div className="text-[6.0px] opacity-90 mt-0.5 font-mono tracking-tight flex items-center justify-between leading-none gap-2">
                              <span className="text-white/90 font-black">${player.chips.toLocaleString()}</span>
                              {player.currentBet > 0 && <span className="text-[#d4af37] font-black">BET: ${player.currentBet.toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>


        </div>
    <div className={`absolute left-[4px] top-[18%] bottom-[29%] w-[90px] xs:w-[105px] sm:w-[120px] md:w-[130px] ${isSmallLandscape || isMobile ? 'flex' : 'lg:hidden'} z-[200] flex flex-col gap-2 pl-1 pointer-events-none transition-all duration-500`}>
        {/* Mobile Live Action (Now on Left) */}
        <div className="pointer-events-auto h-full flex flex-col bg-transparent border-0 shadow-none overflow-hidden pb-1 justify-center">
           <div 
             className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pr-0.5 pt-1 touch-pan-y"
             onScroll={handleLogScroll}
           >
              <div className="my-auto flex flex-col gap-1 w-full">
                <AnimatePresence initial={false}>
                   {currentHandLogs.map((log, i, arr) => {
                     const isLatest = i === arr.length - 1;
                     return (
                       <motion.div
                         key={`mobile-log-${log.id}-${i}`}
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ duration: 0.2 }}
                         className={`text-[9.5px] xs:text-[10px] sm:text-[11px] py-1 px-1.5 rounded-lg border leading-tight transition-all duration-300 shrink-0 ${
                           isLatest 
                             ? 'bg-[#d4af37]/15 border-[#d4af37]/45 text-[#d4af37] font-bold shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                             : settings.theme === 'light' ? 'bg-white/50 border-black/10 text-zinc-900 font-medium' : 'bg-black/50 border-white/10 text-zinc-300 font-medium'
                         }`}
                       >
                         {log.message}
                       </motion.div>
                     );
                   })}
                </AnimatePresence>
                <div ref={mobileLogEndRef} className="h-0" />
              </div>
           </div>
        </div>
      </div>

      {/* Mobile Right Panel: Standings or Hand Result */}
      <div className={`absolute right-[4px] top-[18%] bottom-[29%] w-[90px] xs:w-[105px] sm:w-[120px] md:w-[130px] ${isSmallLandscape || isMobile ? 'flex' : 'lg:hidden'} z-[200] flex flex-col gap-2 pr-1 pointer-events-none transition-all duration-500`}>
        <div className="pointer-events-auto h-full flex flex-col bg-transparent border-0 shadow-none overflow-hidden pb-1">
          <AnimatePresence mode="wait">
            {isShowdown ? (
              <motion.div 
                key="mobile-result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col justify-center"
              >
                <div className="flex-1 flex flex-col gap-1.5 items-center justify-center overflow-y-auto custom-scrollbar pt-1 touch-pan-y animate-fade-in">
                  <div className="text-[10px] uppercase font-black tracking-widest text-[#d4af37] opacity-65">Result</div>
                  <div className="text-[#d4af37] font-serif italic text-[15px] xs:text-[17px] text-center leading-tight gold-glow line-clamp-2 px-1 font-bold">
                    {winnerNames || 'Split Pot'}
                  </div>
                  
                  {winnersInfo.length > 0 && (
                    <div className="w-full flex flex-col items-center gap-1.5">
                      <div className="w-full bg-[#d4af37] text-black font-black text-[11px] xs:text-[12.5px] uppercase tracking-wide py-1.5 px-2 rounded-xl text-center shadow-lg border border-amber-400 whitespace-normal break-words leading-tight">
                        {winnersInfo[0].handLabel}
                      </div>
                      
                      {winningPlayer && (
                        <div className="flex gap-2 p-1.5 bg-black/40 rounded-xl border border-white/10 shadow-inner">
                          {winningPlayer.cards.map((card, i) => (
                            <div key={i} className="w-[42px] xs:w-[58px] h-[60px] xs:h-[80px] bg-white rounded-lg flex flex-col justify-between p-1.5 shadow-md border border-zinc-200">
                              <div className={`text-[12px] xs:text-[15px] font-black leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                {card.rank}
                              </div>
                              <div className={`text-[20px] xs:text-[28px] self-center leading-none ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'} drop-shadow-sm font-black`}>
                                {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                              </div>
                              <div className={`text-[10px] xs:text-[13px] font-black leading-none self-end rotate-180 ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-zinc-900'}`}>
                                {card.rank}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="mobile-standings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col overflow-hidden justify-center"
              >
                <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1 pr-0.5 pt-1 text-left">
                  {gameState.players.filter(p => !p.isUser).map((player) => {
                    const isFolded = player.isFolded;
                    const isEliminated = player.isEliminated;
                    const isCurrent = gameState.currentPlayerIndex === gameState.players.indexOf(player);
                    return (
                      <div 
                        key={`mobile-standing-${player.id}`}
                        className={`text-[7.5px] xs:text-[8.2px] sm:text-[9.0px] py-1 px-1.5 rounded-lg border leading-tight transition-all duration-300 font-mono ${
                          isCurrent
                            ? 'bg-[#d4af37]/15 border-[#d4af37]/45 text-[#d4af37] font-bold shadow-[0_2px_8px_rgba(212,175,55,0.1)] scale-[1.01]'
                            : isEliminated
                              ? 'opacity-30 border-dashed border-white/5 text-zinc-600 line-through bg-transparent'
                              : isFolded
                                ? 'opacity-50 border-white/5 text-zinc-500 bg-black/30'
                                : settings.theme === 'light' ? 'bg-white/50 border-black/10 text-zinc-900 font-medium' : 'bg-black/50 border-white/10 text-[#d4af37] font-bold shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]'
                        }`}
                      >
                        <div className="flex flex-col uppercase gap-0.5">
                          <div className="flex items-center justify-between gap-1 w-full font-black tracking-wider leading-none">
                            <span className="text-[7.0px] xs:text-[7.5px] sm:text-[8.2px] font-bold text-white/95 whitespace-nowrap truncate max-w-[38px] xs:max-w-[46px] sm:max-w-[58px] md:max-w-[68px]" title={player.name}>
                              {player.name}
                            </span>
                            {isCurrent && <span className="text-[5.5px] xs:text-[6px] text-[#d4af37] font-black animate-pulse bg-[#d4af37]/10 px-0.5 py-[1px] rounded border border-[#d4af37]/20 font-sans">PLAY</span>}
                            {isFolded && !isEliminated && <span className="text-[5.5px] xs:text-[6px] text-zinc-500 font-black bg-zinc-900/40 px-0.5 py-[1px] rounded border border-white/5 font-sans">FOLD</span>}
                            {isEliminated && <span className="text-[5.5px] xs:text-[6px] text-red-500/85 font-black bg-red-950/25 px-0.5 py-[1px] rounded border border-red-500/20 font-sans">OUT</span>}
                          </div>
                          <div className="text-[6.8px] xs:text-[7.2px] sm:text-[8.0px] mt-0.5 flex flex-row items-center justify-between gap-1 opacity-90 font-bold leading-none">
                            <span className="font-extrabold text-white/90">${player.chips.toLocaleString()}</span>
                            {player.currentBet > 0 && <span className="text-[#d4af37] font-extrabold uppercase whitespace-nowrap text-[7px] xs:text-[7.5px] sm:text-[8.2px]">BET: ${player.currentBet.toLocaleString()}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* HUD / Bottom Controls Bar */}
      <div 
        className={`w-full p-1.5 md:p-4 lg:px-12 flex flex-col lg:flex-row items-center justify-between relative z-[150] transition-all duration-300 ${isSmallLandscape ? 'flex-row h-auto min-h-[80px] sm:h-[110px] p-2' : 'min-h-[110px] xs:min-h-[130px] gap-2 md:gap-3'} flex-shrink-0`}
        style={{ 
          background: 'none !important', 
          backgroundColor: 'transparent !important', 
          border: 'none !important', 
          boxShadow: 'none !important' 
        } as CSSProperties}
      >
        <AnimatePresence>
          {user?.isFolded && !isShowdown && !isSkippingHand && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`absolute left-1/2 -translate-x-1/2 z-[200] pointer-events-auto ${isSmallLandscape ? '-top-12' : 'bottom-[105%] xs:bottom-[110%]'}`}
            >
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  soundService.play('click');
                  setIsSkippingHand(true);
                }}
                className="bg-black/40 backdrop-blur-xl border-2 border-[#d4af37]/30 text-[#d4af37] px-6 md:px-10 py-2.5 md:py-4 rounded-2xl flex items-center gap-3 group transition-all hover:bg-black/60 hover:border-[#d4af37]/60 shadow-[0_0_30px_rgba(212,175,55,0.2)] hover:shadow-[0_0_50px_rgba(212,175,55,0.4)]"
              >
                 <FastForward className="w-4 h-4 md:w-5 md:h-5 fill-current animate-pulse group-hover:scale-110" />
                 <span className="font-black uppercase tracking-[0.25em] text-[10px] md:text-sm whitespace-nowrap px-1">Skip Hand</span>
                 <FastForward className="w-4 h-4 md:w-5 md:h-5 fill-current animate-pulse group-hover:scale-110" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="popLayout">
          {isShowdown && (!user?.isEliminated || isSpectating) && settings.rabbitHunting && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.15 }}
               className={`absolute inset-0 z-[250] flex items-center justify-center p-3 rounded-t-2xl md:rounded-t-3xl ${isSmallLandscape ? 'rounded-none' : ''} pointer-events-auto`}
            >
              <div className="relative z-10 flex flex-col items-center gap-2 md:gap-6">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                   <div className="w-8 md:w-12 h-[1px] bg-[#d4af37]/30" />
                   <span className="text-[8px] md:text-[11px] font-black uppercase tracking-[0.4em] text-[#d4af37]">Round Complete</span>
                   <div className="w-8 md:w-12 h-[1px] bg-[#d4af37]/30" />
                </div>

                {gameState.communityCards.length < 5 && !isRabbitHuntActive ? (
                  <div className="flex flex-row items-center gap-2 md:gap-4">
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                         soundService.play('click');
                         rabbitHunt();
                      }}
                      className="bg-[#0f0f0f] hover:bg-[#1a1a1a] border-2 border-[#d4af37]/50 hover:border-[#d4af37] px-4 md:px-10 py-2.5 md:py-4 rounded-xl md:rounded-2xl text-[9px] md:text-sm font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[#d4af37] transition-all flex items-center gap-1.5 md:gap-2 group shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] relative z-[260]"
                    >
                      <Zap className="w-3 h-3 md:w-4 md:h-4 fill-current group-hover:scale-110 transition-transform" />
                      <span className="whitespace-nowrap">Rabbit Hunt</span>
                    </motion.button>
                    
                    <button 
                      onClick={() => {
                        setIsSkippingHand(false);
                        onReset();
                      }}
                      className={`bg-[#d4af37] px-6 md:px-16 py-2.5 md:py-4 rounded-xl md:rounded-2xl text-black font-black uppercase tracking-[0.15em] md:tracking-[0.3em] shadow-[0_0_50px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all text-[9px] md:text-base border-b-2 md:border-b-4 border-black/20 whitespace-nowrap relative z-[260] ${isSmallLandscape ? 'py-2 px-8 text-[9px]' : ''}`}
                    >
                      Next Hand
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setIsSkippingHand(false);
                      onReset();
                    }}
                    className={`bg-[#d4af37] px-10 md:px-32 py-3 md:py-6 rounded-xl md:rounded-2xl text-black font-black uppercase tracking-[0.3em] md:tracking-[0.5em] shadow-[0_0_50px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all text-[10px] md:text-lg border-b-2 md:border-b-4 border-black/20 ${isSmallLandscape ? 'py-2 px-16 text-[10px]' : ''}`}
                  >
                    Next Hand
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Player Information & Controls Area */}
        <div className={`flex gap-4 md:gap-8 items-center w-full lg:w-auto justify-start mb-1 lg:mb-0 ${isSmallLandscape ? 'flex-1 mb-0' : ''}`}>

            <div className={`relative flex items-end pb-1 gap-1.5 transform origin-left transition-transform duration-500 shrink-0 ${isPortrait ? 'scale-[1.0]' : 'xl:scale-100'} ${isSmallLandscape ? 'pb-0' : ''}`}>
            {user?.cards.map((c, i) => (
              <Card 
                key={i} 
                card={c} 
                className={`${isSmallLandscape ? 'w-[57px] h-[80px]' : 'w-[76px] h-[106px]'} shadow-2xl transition-transform hover:-translate-y-3`} 
                highlight={settings.highlightBestHand && (isShowdown || (isAllInSituation && winnersInfo.length > 0)) && winnersInfo.some(w => w.id === user?.id && w.bestHand.some(bc => bc.rank === c.rank && bc.suit === c.suit))}
              />
            ))}
          </div>

          <div className="flex flex-col text-left min-w-[100px] xs:min-w-[125px] sm:min-w-[145px] lg:min-w-[170px] shrink-0 ml-2 md:ml-4">
            <div className={`text-[9.5px] md:text-[12px] uppercase ${settings.theme === 'light' ? 'text-zinc-600' : 'text-[#d4af37]'} font-black tracking-[0.2em] mb-1 drop-shadow-sm`}>Your Balance</div>
            <div className={`px-3 md:px-4 py-1.5 rounded-xl font-mono text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-black leading-tight whitespace-nowrap shadow-inner flex items-center gap-1 border ${
              settings.theme === 'light' 
                ? 'bg-zinc-950 text-emerald-400 border-zinc-800' 
                : 'bg-black text-emerald-400 border-zinc-800/80 shadow-black'
            }`}>
              <span className="text-[#d4af37] font-sans font-black select-none">$</span>
              {user?.chips.toLocaleString()}
            </div>
            {user && (
              <div className="flex flex-col gap-0 mt-0.5 md:mt-1 lg:mt-2">
                <div className={`text-[10.5px] md:text-[14px] text-[#d4af37] font-black uppercase tracking-widest leading-none drop-shadow-md`}>
                  {evaluateHand(user.cards, gameState.communityCards).label}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 md:gap-x-4">
                  {gameState.enableInsights && winProbability !== null && (
                    <div className={`flex items-center gap-1 text-[8.5px] md:text-[12px] font-black uppercase tracking-tight mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${settings.theme === 'light' ? 'text-white' : 'text-zinc-300'}`}>
                      <TrendingUp className="w-2.5 md:w-3.5 h-2.5 md:h-3.5 text-green-500" />
                      <span>Win: <span className="text-green-400 font-black">{winProbability}%</span></span>
                    </div>
                  )}
                  {settings.showPotOdds && potOdds !== null && (
                    <div className={`flex items-center gap-1 text-[8.5px] md:text-[12px] font-black uppercase tracking-tight mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${settings.theme === 'light' ? 'text-white' : 'text-zinc-300'}`}>
                      <TrendingUp className="w-2.5 md:w-3.5 h-2.5 md:h-3.5 text-blue-500" />
                      <span>Pot: <span className="text-blue-400 font-black">{potOdds}%</span></span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`flex flex-col gap-1 md:gap-4 w-full lg:w-1/2 lg:max-w-xl xl:max-w-[700px] relative ${isSmallLandscape ? 'flex-1 mb-0' : ''}`}>

          {/* Bet Area */}

          <div className={`flex items-center gap-2 md:gap-4 lg:gap-6 ${!isUserTurn ? 'opacity-30 grayscale pointer-events-none' : ''} ${isSmallLandscape ? 'gap-1' : ''}`}>
            {!isUserTurn && gameState.phase !== 'showdown' && (
              <div className={`flex items-center gap-2 text-[#d4af37] animate-pulse whitespace-nowrap ${isSmallLandscape ? 'hidden' : ''}`}>
                <Monitor className="w-3 md:w-5 h-3 md:h-5" />
                <span className="text-[7px] md:text-[11px] font-black uppercase tracking-[0.2em]">{currentPlayer?.name}...</span>
              </div>
            )}
            <div className="flex gap-1.5 flex-shrink-0">
              {[0.5, 1, 2].map((type) => {
                let amount = 0;
                if (typeof type === 'number') {
                  if (type === 0.5) amount = Math.floor(gameState.pot * 0.5);
                  if (type === 1) amount = gameState.pot;
                  if (type === 2) amount = gameState.pot * 2;
                }
                
                const isSelected = Math.abs(betAmount - amount) < 10;

                return (
                  <button 
                    key={type}
                    onClick={() => {
                      soundService.play('click');
                      setBetAmount(Math.min(user?.chips || 0, Math.max(sliderMin, amount)));
                    }}
                    className={`px-2 md:px-4 py-1 md:py-1.5 text-[7px] md:text-[11px] rounded-lg uppercase font-black transition-all border ${
                      isSelected 
                        ? 'bg-[#d4af37] text-black border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                        : settings.theme === 'light' ? 'bg-zinc-200 hover:bg-zinc-300 text-zinc-600 border-zinc-300' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-white/5'
                    }`}
                  >
                    {type}x
                  </button>
                );
              })}
            </div>
            <div className={`flex-1 min-w-[60px] md:min-w-[120px] relative flex items-center ${isUserTurn ? 'slider-thumb-glow' : ''}`}>
              <Slider 
                value={[betAmount]} 
                min={sliderMin} 
                max={sliderMax} 
                step={1} 
                onValueChange={(val) => {
                  if (Array.isArray(val)) {
                    setBetAmount(val[0]);
                  } else if (typeof val === 'number') {
                    setBetAmount(val);
                  }
                }}
                className="w-full"
              />
            </div>
            <div className={`text-[10px] md:text-lg font-mono text-[#d4af37] w-10 md:w-24 text-right ${isSmallLandscape ? 'w-10' : ''}`}>
              ${betAmount.toLocaleString()}
            </div>
          </div>

          {/* Buttons Area */}
          <div className="relative flex flex-col flex-1 gap-1">
            {/* Turn Timer Progress Bar */}
            <AnimatePresence>
              {isUserTurn && !isShowdown && settings.enableTimer && (
                <div className="flex flex-col gap-0.5 mb-1">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-1">
                      <Gauge className="w-2.5 h-2.5 text-[#d4af37] animate-pulse" />
                      <span className="text-[6.5px] md:text-[8px] uppercase font-black tracking-widest text-[#d4af37] animate-pulse">Action Timer</span>
                    </div>
                    <span className={`text-[7px] md:text-[9px] font-mono font-bold ${turnTimeLeft < 5 ? 'text-red-500 animate-bounce' : 'text-[#d4af37]'}`}>
                      {turnTimeLeft}s
                    </span>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-0.5 md:h-1 bg-black/20 rounded-full overflow-hidden"
                  >
                    <motion.div 
                      className={`h-full timer-bar ${turnTimeLeft < 5 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : ''}`}
                      initial={{ width: '100%' }}
                      animate={{ width: `${(turnTimeLeft / TURN_DURATION) * 100}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
            <div className={`flex justify-end gap-1 md:gap-3 flex-1 h-9.5 xs:h-11 sm:h-12.5 md:h-14 lg:h-16 ${isSmallLandscape ? 'h-8.5' : ''}`}>
              <div className={`flex justify-end gap-1 md:gap-3 flex-1 ${!isUserTurn ? 'opacity-50 pointer-events-none' : ''}`}>
                <button 
                  className={`${settings.theme === 'light' ? 'bg-zinc-100 hover:bg-zinc-200' : 'bg-black/40 hover:bg-zinc-800/60 backdrop-blur-md'} flex-1 border border-white/5 rounded-xl text-[9px] xs:text-[10.5px] sm:text-[12px] md:text-sm font-black uppercase tracking-[0.15em] text-[#d4af37] transition-all hover:border-[#d4af37]/50 hover:text-white flex items-center justify-center`}
                  onMouseEnter={() => setHoveredAction('Fold')}
                  onMouseLeave={() => setHoveredAction(null)}
                  onClick={() => {
                    soundService.play('fold');
                    onAction('fold');
                  }}
                >
                  Fold
                </button>
                <button 
                  className={`${settings.theme === 'light' ? 'bg-zinc-100 hover:bg-zinc-200' : 'bg-black/40 hover:bg-zinc-800/60 backdrop-blur-md'} flex-1 border border-white/5 rounded-xl text-[#d4af37] transition-all hover:border-[#d4af37]/50 hover:bg-[#d4af37]/10 flex items-center justify-center`}
                  onMouseEnter={() => setHoveredAction(canCheck ? 'Check' : 'Call')}
                  onMouseLeave={() => setHoveredAction(null)}
                  onClick={() => {
                    soundService.play(canCheck ? 'check' : 'chips');
                    onAction(canCheck ? 'check' : 'call', callAmount);
                  }}
                >
                  {canCheck ? (
                    <span className="text-[9px] xs:text-[10.5px] sm:text-[12px] md:text-sm font-black uppercase tracking-[0.15em]">Check</span>
                  ) : (
                    <span className="flex flex-col items-center justify-center leading-tight">
                      <span className="text-[7.5px] xs:text-[8px] sm:text-[9.5px] md:text-[10.5px] font-black uppercase tracking-wider text-[#d4af37]/75">Call</span>
                      <span className="text-[10.5px] xs:text-[12.5px] sm:text-[14px] md:text-base lg:text-lg font-mono font-extrabold text-white/95 leading-none">${callAmount.toLocaleString()}</span>
                    </span>
                  )}
                </button>
                <button 
                  className="flex-[1.5] bg-gradient-to-b from-[#d4af37] to-[#b8962d] text-black rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_30px_rgba(212,175,55,0.2)] border-b-4 border-black/10 flex items-center justify-center"
                  onMouseEnter={() => setHoveredAction('Raise')}
                  onMouseLeave={() => setHoveredAction(null)}
                  onClick={() => {
                    soundService.play('chips');
                    onAction('raise', betAmount - (user?.currentBet || 0));
                  }}
                >
                  <span className="flex flex-col items-center justify-center leading-tight">
                    <span className="text-[7.5px] xs:text-[8px] sm:text-[9.5px] md:text-[10.5px] font-black uppercase tracking-wider text-black/75">Raise</span>
                    <span className="text-[10.5px] xs:text-[12.5px] sm:text-[14px] md:text-base lg:text-lg font-mono font-black text-black leading-none">${betAmount.toLocaleString()}</span>
                  </span>
                </button>
                <button 
                  className="flex-1 bg-red-950/20 hover:bg-red-900/30 border border-red-900/40 text-red-500 rounded-xl text-[9px] xs:text-[10.5px] sm:text-[12px] md:text-sm font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center"
                  onMouseEnter={() => setHoveredAction('All-In')}
                  onMouseLeave={() => setHoveredAction(null)}
                  onClick={() => {
                    soundService.play('chips');
                    onAction('all-in', user?.chips || 0);
                  }}
                >
                  All In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
                   <p className={`${settings.theme === 'light' ? 'text-zinc-900' : 'text-white'} text-sm font-black uppercase tracking-widest`}>Landscape Mode</p>
                   <p className="text-zinc-500 text-[11px] leading-relaxed">
                     {isIPhone 
                       ? "True Fullscreen is limited on iPhone. Simply rotate your device to landscape for the best experience!" 
                       : "Your browser blocked the fullscreen request. Please rotate or adjust your settings."}
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

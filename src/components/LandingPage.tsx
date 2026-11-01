import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, Play, Moon, Sun, Heart, RotateCcw, Minimize, Maximize, Share2, Download } from "lucide-react";
import { InstallButton, ShareButton } from "./AppActions";
import { clayChipBackground } from "./ChipStack";
import { FeltPreview, feltColor } from "./table/felt";
import { CardBack } from "./Card";
import { HowToPlayModal } from "./HowToPlayModal";
import { BOT_NAMES } from "../lib/gameLogic";
import { soundService } from "../services/soundService";
import { voiceCommandService } from "../services/voiceCommandService";
import { GameSettings, GameDifficulty } from "../types";

interface LandingPageProps {
  onStart: (opponents: number, startingChips: number, difficulty: GameDifficulty, names: string[], design: string, enableInsights: boolean, settings: GameSettings) => void;
}

function Section({ title, hint, children, id }: { title: string; hint?: string; children: ReactNode; id: string }) {
  return (
    <section data-testid={`lp-${id}`} className="saloon-plate rounded-2xl p-3.5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="saloon-title text-[17px] font-bold text-[#e9c46a]">{title}</h2>
        {hint && <span className="text-[12px] text-[#c9b48a] truncate">{hint}</span>}
      </div>
      {children}
    </section>
  );
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
    { id: 'green', label: 'Classic Green' },
    { id: 'red', label: 'Casino Red' },
    { id: 'blue', label: 'Navy Blue' },
    { id: 'burgundy', label: 'Burgundy' },
    { id: 'black', label: 'Black' },
    { id: 'purple', label: 'Purple' },
    { id: 'forest', label: 'Forest' },
    { id: 'chocolate', label: 'Chocolate' },
    { id: 'charcoal', label: 'Charcoal' },
    { id: 'teal', label: 'Teal' },
    { id: 'olive', label: 'Olive' },
    { id: 'navy', label: 'True Navy' },
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

  // Orientation for the two layouts (portrait: stacked; landscape: hero left, choices right).
  const [vw, setVw] = useState(() => ({ w: typeof window !== 'undefined' ? window.innerWidth : 390, h: typeof window !== 'undefined' ? window.innerHeight : 844 }));
  useEffect(() => {
    const on = () => setVw({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const landscape = vw.w > vw.h;
  const [customBuyIn, setCustomBuyIn] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const BUY_INS: [number, string, string][] = [[1000, '1K', '#f4ecd8'], [5000, '5K', '#a8322d'], [10000, '10K', '#2f5f8a'], [25000, '25K', '#3f7a4a'], [100000, '100K', '#1c1917']];
  const sb = Math.max(1, Math.floor(chips * 0.01));
  const bb = Math.max(2, Math.floor(chips * 0.02));
  const DIFF: Record<GameDifficulty, { title: string; sub: string; icon: string }> = {
    easy: { title: 'Greenhorn', sub: 'Easy', icon: '🌵' },
    medium: { title: 'Gunslinger', sub: 'Medium', icon: '🤠' },
    hard: { title: 'Outlaw', sub: 'Hard', icon: '💀' },
  };
  const RULES: { key: keyof GameSettings; label: string; invert?: boolean }[] = [
    { key: 'soundEffects', label: 'Sound' },
    { key: 'turboMode', label: 'Turbo deal' },
    { key: 'showTips', label: 'Tips' },
    { key: 'voiceCommands', label: 'Voice commands' },
    { key: 'enableInsights', label: 'Win odds' },
    { key: 'showPotOdds', label: 'Pot odds' },
    { key: 'enableAiChat', label: 'Table talk' },
    { key: 'highlightBestHand', label: 'Highlight hands' },
    { key: 'enableTimer', label: '20s shot clock' },
    { key: 'showHandRankingsHelper', label: 'Hand guide' },
    { key: 'rabbitHunting', label: 'Rabbit hunt' },
  ];
  const tap = (fn: () => void, sound: 'click' | 'tick' = 'click') => () => { soundService.play(sound); fn(); };

  const heroTile = 'min-h-[52px] w-[84px] rounded-xl saloon-btn-ghost text-[12px] font-bold flex flex-col items-center justify-center gap-1 leading-tight active:translate-y-px';
  const hero = (
    <div data-testid="lp-hero" className={`relative flex flex-col items-center justify-center text-center ${landscape ? 'min-h-full px-4 py-4' : 'pt-6 pb-5 px-4'}`}>
      {/* lamp-light glow */}
      <div className="absolute inset-x-0 top-0 h-[70%] pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 70% at 50% 0%, rgba(255,184,96,0.22), transparent 70%)' }} />
      {/* mini table: walnut rail + felt with the gold aces */}
      <div className="relative" style={{ width: landscape ? (vw.h < 450 ? 'min(200px, 70%)' : 'min(300px, 80%)') : 'min(300px, 78vw)' }}>
        <FeltPreview color={feltColor(settings.tableColor)}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex -space-x-4" style={{ transform: 'scale(2.1)' }}>
              {[['A', '♠', 'text-black/90', -12], ['A', '♥', 'text-red-900', 10]].map(([r, su, col, rot], i) => (
                <motion.div key={i} initial={{ y: 12, opacity: 0, rotate: 0 }} animate={{ y: 0, opacity: 1, rotate: rot as number }} transition={{ delay: 0.15 + i * 0.12 }}
                  className="w-14 h-20 bg-gradient-to-br from-[#f5e492] via-[#d4af37] to-[#b8860b] rounded-[6px] border border-white/30 shadow-[0_8px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-between p-1.5">
                  <span className={`card-rank text-[16px] self-start leading-none ${col}`}>{r}</span>
                  <span className={`text-[26px] leading-none ${col}`}>{su}</span>
                  <span className={`card-rank text-[16px] self-end rotate-180 leading-none ${col}`}>{r}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </FeltPreview>
      </div>
      <h1 className={`saloon-title ${landscape && vw.h < 450 ? 'mt-2 text-[34px]' : 'mt-4 text-[40px]'} leading-none font-bold bg-gradient-to-b from-[#f5e492] via-[#d4af37] to-[#9c7424] bg-clip-text text-transparent gold-glow`}>River's Edge</h1>
      <p className="mt-1.5 text-[13px] font-semibold uppercase tracking-[0.28em] text-[#d8c9a8]">Texas Hold'em Saloon</p>
      <div className={`${landscape && vw.h < 450 ? 'mt-3' : 'mt-5'} w-full max-w-[340px] flex gap-2`}>
        <button data-testid="lp-play" onClick={handleStart}
          className={`relative flex-1 min-w-0 min-h-[64px] rounded-2xl ${landscape && vw.h < 450 ? 'text-[17px] tracking-[0.05em]' : 'text-[20px] tracking-[0.12em]'} font-extrabold uppercase text-[#1b1208] bg-gradient-to-b from-[#f2d27e] to-[#b8862f] border border-[#7a5a22] shadow-[0_10px_30px_rgba(212,160,60,0.35)] active:translate-y-px flex items-center justify-center gap-2 whitespace-nowrap px-2`}>
          <Play className="w-6 h-6 fill-current" /> Deal me in
        </button>
        <ShareButton testid="lp-share" className="w-[68px] shrink-0 min-h-[64px] rounded-2xl saloon-plate !text-[#f2d27e] text-[12px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 active:translate-y-px">
          <Share2 className="w-5 h-5" />Share
        </ShareButton>
      </div>
      <p className="mt-2 text-[12px] text-[#c9b48a]">{opponents + 1} players · ${chips.toLocaleString()} buy-in · {DIFF[difficulty].title}</p>
      <div className="mt-3 flex gap-2 justify-center">
        <button data-testid="lp-howto" onClick={tap(() => setShowTutorial(true))} className={heroTile}><HelpCircle className="w-4 h-4" />How to play</button>
        <button data-testid="lp-fullscreen" onClick={toggleFullscreen} className={heroTile}>{isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}{isFullscreen ? 'Exit full' : 'Full screen'}</button>
        <InstallButton testid="lp-install" className={heroTile}><Download className="w-4 h-4" />Install</InstallButton>
      </div>
    </div>
  );

  const choices = (
    <div data-testid="lp-choices" className="flex flex-col gap-3 pb-6">
      <Section id="name" title="Your name at the table">
        <input data-testid="lp-name" type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Your name"
          className="w-full min-h-[48px] rounded-xl px-4 bg-[#f4ecd8] text-[#1b1208] text-[17px] font-bold saloon-title border border-[#b9a77f] outline-none focus:ring-2 focus:ring-[#e9c46a]" />
      </Section>

      <Section id="players" title="Players" hint="You + opponents">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} data-testid={`lp-players-${n + 1}`} onClick={tap(() => setOpponents(n))} aria-pressed={opponents === n}
              className={`min-h-[56px] rounded-xl flex flex-col items-center justify-center border transition ${opponents === n ? 'bg-[#e9c46a] text-[#1b1208] border-[#e9c46a] shadow-[0_0_14px_rgba(233,196,106,0.45)]' : 'bg-black/30 text-[#f4ecd8] border-[#c9a45c]/40'}`}>
              <span className="text-[20px] font-extrabold leading-none">{n + 1}</span>
              <span className="text-[12px] mt-0.5 opacity-80">seats</span>
            </button>
          ))}
        </div>
        <button onClick={tap(() => setShowNames(v => !v))} className="self-start min-h-[40px] text-[13px] font-semibold text-[#e9c46a] underline-offset-4 underline">
          {showNames ? 'Done renaming' : 'Rename opponents'}
        </button>
        {showNames && (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: opponents }).map((_, i) => (
              <input key={i} type="text" value={botNames[i] || ''} onChange={(e) => updateBotName(i, e.target.value)} placeholder={`Bot ${i + 1}`}
                className="min-h-[44px] rounded-lg px-3 bg-black/35 border border-[#c9a45c]/40 text-[14px] text-[#f4ecd8] outline-none focus:border-[#e9c46a]" />
            ))}
          </div>
        )}
      </Section>

      <Section id="buyin" title="Buy-in" hint={`Blinds $${sb.toLocaleString()} / $${bb.toLocaleString()}`}>
        <div className="flex flex-wrap gap-2.5 justify-between">
          {BUY_INS.map(([amt, label, color]) => (
            <button key={amt} data-testid={`lp-buyin-${label}`} onClick={tap(() => { setCustomBuyIn(false); setChips(amt); }, 'tick')} aria-pressed={chips === amt}
              className={`relative w-[56px] h-[56px] rounded-full flex items-center justify-center border-2 transition ${chips === amt && !customBuyIn ? 'border-[#e9c46a] scale-110 shadow-[0_0_16px_rgba(233,196,106,0.6)]' : 'border-black/50'}`}
              style={{ backgroundImage: clayChipBackground(color) }}>
              <span className={`text-[13px] font-extrabold px-1 rounded ${color === '#f4ecd8' ? 'text-[#1b1208]' : 'text-[#f4ecd8]'}`} style={{ textShadow: color === '#f4ecd8' ? 'none' : '0 1px 2px rgba(0,0,0,0.8)' }}>{label}</span>
            </button>
          ))}
          <button data-testid="lp-buyin-custom" onClick={tap(() => setCustomBuyIn(true))}
            className={`w-[56px] h-[56px] rounded-full flex items-center justify-center border-2 border-dashed text-[12px] font-bold ${customBuyIn ? 'border-[#e9c46a] text-[#e9c46a]' : 'border-[#c9a45c]/50 text-[#d8c9a8]'}`}>Custom</button>
        </div>
        {customBuyIn && (
          <div className="flex items-center gap-2 min-h-[48px] rounded-xl px-3 bg-black/35 border border-[#c9a45c]/40">
            <span className="text-[#e9c46a] text-[18px] font-bold">$</span>
            <input type="text" inputMode="numeric" value={chips.toLocaleString()} autoFocus
              onChange={(e) => { const v = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0; setChips(Math.min(1000000, v)); }}
              onBlur={() => setChips(prev => Math.max(100, Math.min(1000000, prev)))}
              className="flex-1 bg-transparent text-[18px] font-mono font-bold text-[#f4ecd8] outline-none" />
            <span className="text-[12px] text-[#c9b48a]">$100 – $1M</span>
          </div>
        )}
      </Section>

      <Section id="difficulty" title="Opponents">
        <div className="grid grid-cols-3 gap-2">
          {(['easy', 'medium', 'hard'] as const).map(level => (
            <button key={level} data-testid={`lp-diff-${level}`} onClick={tap(() => setDifficulty(level))} aria-pressed={difficulty === level}
              className={`min-h-[84px] rounded-xl flex flex-col items-center justify-center gap-1 border transition ${difficulty === level ? 'bg-gradient-to-b from-[#3f2a17] to-[#24170d] border-[#e9c46a] shadow-[0_0_14px_rgba(233,196,106,0.4)]' : 'bg-black/30 border-[#c9a45c]/30 opacity-80'}`}>
              <span className="text-[24px] leading-none" aria-hidden>{DIFF[level].icon}</span>
              <span className={`saloon-title text-[15px] font-bold ${difficulty === level ? 'text-[#e9c46a]' : 'text-[#f4ecd8]'}`}>{DIFF[level].title}</span>
              <span className="text-[12px] text-[#c9b48a]">{DIFF[level].sub}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section id="felt" title="Table felt" hint={tableColors.find(c => c.id === settings.tableColor)?.label}>
        <div className={`grid gap-2.5 ${landscape ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {tableColors.map(color => {
            const on = settings.tableColor === color.id;
            return (
              <button key={color.id} data-testid={`lp-felt-${color.id}`} title={color.label} aria-label={color.label} aria-pressed={on}
                onClick={tap(() => setSettings(prev => ({ ...prev, tableColor: color.id as any })), 'tick')}
                className={`rounded-xl p-1.5 flex flex-col items-center gap-1 transition border ${on ? 'border-[#e9c46a] bg-[#e9c46a]/10 shadow-[0_0_14px_rgba(233,196,106,0.35)]' : 'border-transparent'}`}>
                <FeltPreview color={feltColor(color.id)} />
                <span className={`text-[12px] font-semibold leading-tight ${on ? 'text-[#f2d27e]' : 'text-[#d8c9a8]'}`}>{color.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section id="cardback" title="Card back" hint={cardDesign.replace(/-/g, ' ')}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-1 -mx-1">
          {designs.map(design => (
            <button key={design} data-testid={`lp-back-${design}`} title={design.replace(/-/g, ' ')} aria-label={design.replace(/-/g, ' ')} aria-pressed={cardDesign === design}
              onClick={tap(() => setCardDesign(design), 'tick')}
              className={`relative shrink-0 w-[46px] h-[66px] rounded-[5px] overflow-hidden border-2 transition ${cardDesign === design ? 'border-[#e9c46a] -translate-y-1 shadow-[0_6px_14px_rgba(233,196,106,0.45)]' : 'border-black/40 opacity-70'}`}>
              <CardBack design={design} />
            </button>
          ))}
        </div>
      </Section>

      <Section id="rules" title="House rules">
        <div className="grid grid-cols-2 gap-2">
          {RULES.map(r => {
            const on = !!(settings as any)[r.key];
            return (
              <button key={r.key} data-testid={`lp-rule-${r.key}`} role="switch" aria-checked={on} onClick={() => toggleSetting(r.key)}
                className={`min-h-[48px] rounded-xl px-3 flex items-center justify-between gap-2 border text-left transition ${on ? 'bg-[#2a4a30]/70 border-[#6fae6f]/60 text-[#f4ecd8]' : 'bg-black/30 border-[#c9a45c]/25 text-[#c9b48a]'}`}>
                <span className="text-[14px] font-semibold leading-tight">{r.label}</span>
                <span className={`shrink-0 w-10 h-6 rounded-full relative transition ${on ? 'bg-[#e9c46a]' : 'bg-black/50 border border-[#c9a45c]/40'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-[#f4ecd8] shadow transition-all ${on ? 'left-5' : 'left-1'}`} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['dark', 'light'] as const).map(th => (
            <button key={th} data-testid={`lp-theme-${th}`} onClick={tap(() => setSettings(prev => ({ ...prev, theme: th })))} aria-pressed={settings.theme === th}
              className={`min-h-[44px] rounded-xl flex items-center justify-center gap-2 text-[14px] font-semibold border ${settings.theme === th ? 'bg-[#e9c46a] text-[#1b1208] border-[#e9c46a]' : 'bg-black/30 text-[#d8c9a8] border-[#c9a45c]/30'}`}>
              {th === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}{th === 'dark' ? 'Dark room' : 'Lit room'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#d8c9a8] shrink-0">Animation</span>
          <div className="grid grid-cols-3 gap-2 flex-1">
            {(['low', 'medium', 'high'] as const).map(tier => (
              <button key={tier} onClick={tap(() => setSettings(prev => ({ ...prev, animationIntensity: tier })))} aria-pressed={settings.animationIntensity === tier}
                className={`min-h-[40px] rounded-lg text-[13px] font-semibold capitalize border ${settings.animationIntensity === tier ? 'bg-[#e9c46a] text-[#1b1208] border-[#e9c46a]' : 'bg-black/30 text-[#d8c9a8] border-[#c9a45c]/30'}`}>{tier}</button>
            ))}
          </div>
        </div>
      </Section>

      <Section id="invite" title="Ride with friends" hint="Send them the link">
        <div className="flex gap-2">
          <ShareButton testid="lp-share-setup" className="flex-1 min-h-[52px] rounded-xl text-[15px] font-extrabold uppercase tracking-wider text-[#1b1208] bg-gradient-to-b from-[#f2d27e] to-[#b8862f] border border-[#7a5a22] flex items-center justify-center gap-2 active:translate-y-px">
            <Share2 className="w-5 h-5" />Share the game
          </ShareButton>
          <InstallButton testid="lp-install-setup" className="min-h-[52px] px-4 rounded-xl saloon-btn-ghost text-[13px] font-bold flex items-center gap-2"><Download className="w-4 h-4" />Install</InstallButton>
        </div>
      </Section>
      <a href="https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=Marlonhanson@me.com&currency_code=USD" target="_blank" rel="noreferrer"
        onClick={() => soundService.play('click')}
        className="self-center min-h-[44px] px-5 rounded-xl saloon-btn-ghost text-[13px] font-bold flex items-center gap-2">
        <Heart className="w-4 h-4 fill-current" /> Tip the dealer (support the creator)
      </a>
    </div>
  );

  return (
    <div data-testid="landing" className="saloon-bg h-full w-full relative overflow-hidden text-[#f4ecd8]">
      {landscape ? (
        <div className="h-full w-full flex" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
          <div className="w-[42%] max-w-[480px] h-full overflow-y-auto no-scrollbar">{hero}</div>
          <div className="flex-1 h-full overflow-y-auto custom-scrollbar px-3 pt-4 md:pt-6">
            <div className="max-w-[640px] mx-auto">{choices}</div>
          </div>
        </div>
      ) : (
        <div className="h-full w-full overflow-y-auto custom-scrollbar" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {hero}
          <div className="px-3 max-w-[640px] mx-auto">{choices}</div>
        </div>
      )}

      {/* Full screen hint (iOS has no Fullscreen API) */}
      <AnimatePresence>
        {showFullscreenHint && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-[320px]">
            <div className="saloon-plate rounded-2xl p-5 flex flex-col items-center text-center gap-3">
              <RotateCcw className="w-6 h-6 text-[#e9c46a]" />
              <p className="text-[15px] font-bold text-[#e9c46a]">Full screen</p>
              <p className="text-[13px] text-[#e8dcc0] leading-relaxed">
                {isIPhone
                  ? 'True full screen is limited on iPhone. Install the app (Add to Home Screen) to play full screen in portrait or landscape.'
                  : 'Your browser blocked the full screen request. The table still fits your screen in portrait or landscape.'}
              </p>
              <button onClick={() => setShowFullscreenHint(false)} className="min-h-[44px] w-full rounded-xl saloon-btn-ghost text-[13px] font-bold">Got it</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <HowToPlayModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
    </div>
  );
}

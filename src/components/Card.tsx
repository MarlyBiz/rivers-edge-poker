import React from "react";
import { motion } from "motion/react";
import { PokerCard as CardType, Suit } from "../types";
import { useGameStore } from "../store/gameStore";

export interface CardBackProps {
  design?: string;
  className?: string;
}

export function CardBack({ design = 'classic-red', className = "" }: CardBackProps) {
  const designs: Record<string, React.ReactNode> = {
    'classic-red': <div className="absolute inset-0 bg-[#8b0000] flex items-center justify-center border-2 border-white/20">
      <div className="w-[85%] h-[85%] border border-white/10 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-0.5 opacity-20">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
        </div>
      </div>
    </div>,
    'classic-blue': <div className="absolute inset-0 bg-[#00008b] flex items-center justify-center border-2 border-white/20">
      <div className="w-[85%] h-[85%] border border-white/10 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-0.5 opacity-20">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
        </div>
      </div>
    </div>,
    'classic-green': <div className="absolute inset-0 bg-[#004d00] flex items-center justify-center border-2 border-white/20">
      <div className="w-[85%] h-[85%] border border-white/10 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-0.5 opacity-20">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
        </div>
      </div>
    </div>,
    'classic-black': <div className="absolute inset-0 bg-[#121212] flex items-center justify-center border-2 border-white/20">
      <div className="w-[85%] h-[85%] border border-white/10 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-0.5 opacity-20">
          {Array.from({ length: 16 }).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
        </div>
      </div>
    </div>,
    'royal-gold': <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center border-2 border-[#d4af37]">
      <div className="w-[80%] h-[80%] border-2 border-[#d4af37]/30 flex items-center justify-center">
        <div className="text-[#d4af37] text-xl opacity-80">⚜</div>
      </div>
    </div>,
    'royal-silver': <div className="absolute inset-0 bg-[#2c3e50] flex items-center justify-center border-2 border-[#bdc3c7]">
      <div className="w-[80%] h-[80%] border-2 border-[#bdc3c7]/30 flex items-center justify-center">
        <div className="text-[#bdc3c7] text-xl opacity-80">✦</div>
      </div>
    </div>,
    'carbon-fiber': <div className="absolute inset-0 bg-zinc-900" style={{ backgroundImage: 'linear-gradient(45deg, #18181b 25%, transparent 25%, transparent 75%, #18181b 75%, #18181b), linear-gradient(45deg, #18181b 25%, transparent 25%, transparent 75%, #18181b 75%, #18181b)', backgroundSize: '4px 4px', backgroundPosition: '0 0, 2px 2px' }}>
      <div className="absolute inset-2 border border-white/5" />
    </div>,
    'geometric-blue': <div className="absolute inset-0 bg-[#0c2461]" style={{ backgroundImage: 'conic-gradient(from 0deg at 50% 50%, #0c2461, #0a3d62)' }}>
       <div className="absolute inset-3 border-[0.5px] border-white/20 rounded-sm" />
    </div>,
    'geometric-red': <div className="absolute inset-0 bg-[#b71540]" style={{ backgroundImage: 'conic-gradient(from 0deg at 50% 50%, #b71540, #82ccdd)' }}>
       <div className="absolute inset-3 border-[0.5px] border-white/20 rounded-sm" />
    </div>,
    'midnight-lace': <div className="absolute inset-0 bg-black" style={{ backgroundImage: 'linear-gradient(rgba(212,175,55,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.05) 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
      <div className="absolute inset-2 border border-[#d4af37]/20" />
    </div>,
    'casino-vintage': <div className="absolute inset-0 bg-[#2d3436]" style={{ backgroundImage: 'radial-gradient(circle, #636e72 1px, transparent 1px)', backgroundSize: '12px 12px' }}>
      <div className="absolute inset-0 flex items-center justify-center text-white/5 text-4xl">★</div>
      <div className="absolute inset-3 border border-white/10" />
    </div>,
    'diamond-minimal': <div className="absolute inset-0 bg-emerald-900">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 0)', backgroundSize: '8px 8px' }} />
      <div className="absolute inset-4 border border-white/5 flex items-center justify-center">
        <div className="w-4 h-4 rotate-45 border border-white/20" />
      </div>
    </div>,
    'abstract-wave': <div className="absolute inset-0 bg-[#2d3436] overflow-hidden">
      <div className="absolute -inset-4 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ffffff, #ffffff 2px, transparent 2px, transparent 10px)' }} />
      <div className="w-full h-full flex items-center justify-center text-white/5 text-2xl font-serif">♠</div>
    </div>,
    'floral-regal': <div className="absolute inset-0 bg-[#4a0000]" style={{ backgroundImage: 'radial-gradient(circle, #600000 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
      <div className="absolute inset-0 flex items-center justify-center opacity-10 text-2xl">❀</div>
      <div className="absolute inset-2 border border-white/5" />
    </div>,
    'neon-circuit': <div className="absolute inset-0 bg-slate-900 border border-cyan-500/30">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(6,182,212,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.2) 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
      <div className="absolute inset-4 border border-cyan-400/10" />
    </div>,
    'dragon-scale': <div className="absolute inset-0 bg-[#1e272e]" style={{ backgroundImage: 'radial-gradient(circle at 100% 100%, #1e272e 0, #1e272e 3px, transparent 3px), radial-gradient(circle at 0 0, #1e272e 0, #1e272e 3px, transparent 3px)', backgroundSize: '6px 6px', backgroundColor: '#485460' }}>
      <div className="absolute inset-2 border border-white/5" />
    </div>,
    'poker-lattice': <div className="absolute inset-0 bg-[#3b0000]" style={{ backgroundImage: 'linear-gradient(45deg, #4d0000 25%, transparent 25%), linear-gradient(-45deg, #4d0000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #4d0000 75%), linear-gradient(-45deg, transparent 75%, #4d0000 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' }}>
      <div className="absolute inset-2 border border-white/10" />
    </div>,
    'marina-blue': <div className="absolute inset-0 bg-[#0984e3]" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)', backgroundSize: '20px 20px' }}>
       <div className="absolute inset-3 border border-white/20" />
    </div>,
    'executive-grey': <div className="absolute inset-0 bg-[#2d3436] flex items-center justify-center border-2 border-zinc-700">
      <div className="w-[85%] h-[85%] bg-zinc-800/50 border border-zinc-700" />
    </div>,
    'imperial-purple': <div className="absolute inset-0 bg-[#3d005e] flex items-center justify-center border-2 border-[#d4af37]/40">
      <div className="w-[85%] h-[85%] border border-[#d4af37]/20 flex items-center justify-center">
        <div className="text-[#d4af37] text-xl opacity-30">❦</div>
      </div>
    </div>
  };

  return (
    <div className={`w-full h-full relative ${className}`}>
      {designs[design] || designs['classic-red']}
    </div>
  );
}

export interface CardProps {
  card?: CardType;
  hidden?: boolean;
  className?: string;
  designOverride?: string;
  highlight?: boolean;
  key?: React.Key;
}

export function Card({ card, hidden = false, className = "", designOverride, highlight = false }: CardProps) {
  const storeDesign = useGameStore(state => state.cardBackDesign);
  const design = designOverride || storeDesign || 'classic-red';
  const isPocketCard = className.includes('!w-');
  const isCommunityCard = className.includes('community-card');

  if (hidden || !card) {
    return (
      <motion.div
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        className={`w-12 h-16 md:w-14 md:h-20 border border-white/20 rounded shadow-lg flex items-center justify-center card-shadow transition-all relative overflow-hidden ${className}`}
      >
        <CardBack design={design} />
      </motion.div>
    );
  }

  let paddingClass = isPocketCard ? 'p-1' : 'p-1.5 md:p-2';
  let rankTextClass = isPocketCard ? 'text-[18px] md:text-[22px] font-black tracking-tighter' : 'text-[12.5px] sm:text-[14.5px] md:text-base';
  let suitTextClass = isPocketCard ? 'text-[28px] md:text-[34px] font-black' : 'text-2xl md:text-3xl';

  const isBigPocketCard = className.includes('[51px]') || className.includes('[57px]') || className.includes('[68px]') || className.includes('[72px]') || className.includes('[76px]') || className.includes('[80px]');
  const isHoodCard = className.includes('[76px]') || className.includes('[106px]');
  const isUserCard = className.includes('w-40') || className.includes('[120px]') || className.includes('[90px]') || className.includes('[100px]') || className.includes('[105px]') || className.includes('[110px]');
  const isTablePlayerCard = className.includes('[72px]') || (className.includes('[80px]') && className.includes('[112px]'));

  if (isTablePlayerCard) {
    paddingClass = 'p-0.5 xs:p-1';
    rankTextClass = 'text-[24px] xs:text-[26px] md:text-[30px] font-black tracking-tighter leading-none';
    suitTextClass = 'text-[45px] xs:text-[48px] md:text-[54px] font-black leading-none';
  } else if (isBigPocketCard && !isHoodCard) {
    paddingClass = 'p-1';
    rankTextClass = 'text-[15px] md:text-[18px] font-black tracking-tight';
    suitTextClass = 'text-[24px] md:text-[30px] font-black';
  } else if (isHoodCard) {
    paddingClass = 'p-1';
    rankTextClass = 'text-[18px] md:text-[21px] font-black tracking-tighter leading-none';
    suitTextClass = 'text-[38px] md:text-[44px] font-black leading-none';
  } else if (isUserCard) {
    paddingClass = 'p-1';
    rankTextClass = 'text-[26px] md:text-[32px] font-black tracking-tighter leading-none';
    suitTextClass = 'text-[54px] md:text-[66px] font-black leading-none';
  } else if (isCommunityCard) {
    paddingClass = 'p-1';
    rankTextClass = 'text-[32px] sm:text-[36px] md:text-[42px] font-black tracking-tighter';
    suitTextClass = 'text-[56px] sm:text-[64px] md:text-[72px] font-black';
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className={`w-12 h-16 md:w-14 md:h-20 bg-white border rounded shadow-md flex flex-col justify-between ${paddingClass} card-shadow transition-all duration-500 relative overflow-hidden ${highlight ? 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-black z-30 scale-110 shadow-[0_0_25px_rgba(212,175,55,0.9)]' : 'border-zinc-200'} ${className}`}
    >
      {highlight && (
        <div className="laser-border-wrap" />
      )}
      <div className={`${rankTextClass} font-black leading-none ${suitColors[card.suit]} z-10`}>
        {card.rank}
      </div>
      <div className={`${suitTextClass} self-center leading-none ${suitColors[card.suit]} drop-shadow-sm z-10`}>
        {suitSymbols[card.suit]}
      </div>
      <div className={`${rankTextClass} font-black leading-none self-end rotate-180 ${suitColors[card.suit]} z-10`}>
        {card.rank}
      </div>
    </motion.div>
  );
}

const suitSymbols: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<Suit, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-zinc-900',
  spades: 'text-zinc-900',
};

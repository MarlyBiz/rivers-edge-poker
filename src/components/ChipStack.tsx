import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CHIP_DENOMINATIONS, CHIP_COLORS, getChipLabel } from '../constants';

interface ChipStackProps {
  amount: number;
  className?: string;
  showValue?: boolean;
  variant?: 'player' | 'pot';
  orientation?: 'horizontal' | 'vertical';
}

export function ChipStack({ amount, className = "", showValue = true, variant = 'player', orientation = 'vertical' }: ChipStackProps) {
  const chipGroups = useMemo(() => {
    if (amount <= 0) return [];

    let remaining = amount;
    const groups: { value: number; color: string; count: number }[] = [];
    
    const sortedDenominations = [...CHIP_DENOMINATIONS].sort((a, b) => b - a);

    for (const denom of sortedDenominations) {
      const count = Math.floor(remaining / denom);
      if (count > 0) {
        groups.push({ value: denom, color: CHIP_COLORS[denom], count });
        remaining -= count * denom;
      }
    }
    
    if (remaining > 0) {
       const existing = groups.find(g => g.value === 1);
       if (existing) existing.count += remaining;
       else groups.push({ value: 1, color: CHIP_COLORS[1], count: remaining });
    }

    return groups;
  }, [amount]);

  if (amount <= 0) return null;

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className={`flex flex-wrap justify-center ${orientation === 'horizontal' ? 'gap-x-1.5 gap-y-0' : 'gap-x-5 gap-y-3'} max-w-[320px]`}>
        {chipGroups.map((group) => {
          const displayCount = Math.min(group.count, 5);
          const isHorizontal = orientation === 'horizontal';
          return (
            <div 
              key={group.value} 
              className="relative group/chip h-15 w-14"
              style={{ width: isHorizontal ? (56 + (displayCount - 1) * 8) : 56 }}
            >
              <AnimatePresence mode="popLayout">
                {[...Array(displayCount)].map((_, i) => {
                  const potOffset = variant === 'pot' ? (i * 3) : (i * 5);
                  
                  const y = isHorizontal ? 0 : -potOffset;
                  const x = isHorizontal ? (i * 8) : ((variant === 'pot' ? (Math.random() - 0.5) * 16 : (i * 1)));
                  const randomRotate = variant === 'pot' ? (Math.random() - 0.5) * 40 : 0;

                  return (
                    <motion.div
                      key={`${group.value}-${i}`}
                      initial={{ scale: 0.8, opacity: 0, y: -20 }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1, 
                        y: y,
                        x: x,
                        rotate: randomRotate
                      }}
                      exit={{ scale: 0.8, opacity: 0, y: 10 }}
                      className="absolute w-14 h-14 rounded-full border-2 border-black/35 flex items-center justify-center shadow-[0_4px_8px_rgba(0,0,0,0.5)] hover:scale-110 transition-transform duration-200"
                      style={{ 
                        backgroundColor: group.color,
                        zIndex: i,
                        boxShadow: `inset 0 0 0 6px rgba(255,255,255,0.18), inset 0 0 15px rgba(0,0,0,0.3)`
                      }}
                    >
                      {/* Chip markings */}
                      <div className="absolute inset-0 rounded-full border-[5px] border-dashed border-black/15 opacity-50" />
                      
                      {/* Only show value on the top chip of each stack */}
                      {i === displayCount - 1 && (
                        <span 
                          className={`text-[12.5px] font-black pointer-events-none select-none tracking-tighter drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)] ${
                            group.value === 1 || group.value === 1000 ? 'text-black/85' : 'text-white/95'
                          }`}
                        >
                          {getChipLabel(group.value)}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      
      {showValue && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-zinc-950 backdrop-blur-md rounded-full border border-zinc-800 font-extrabold text-white whitespace-nowrap shadow-2xl z-50 ring-2 ring-[#d4af37]/40 ${
            variant === 'pot' ? 'px-6 py-2.5 text-lg md:text-[22px] font-mono text-emerald-400 main-pot-amount' : 'px-3.5 py-1.5 text-xs md:text-sm font-mono text-white'
          }`}
        >
          <span className="text-[#d4af37] mr-0.5 font-bold">$</span>
          {amount.toLocaleString()}
        </motion.div>
      )}
    </div>
  );
}

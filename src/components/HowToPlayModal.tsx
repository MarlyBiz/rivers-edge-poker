import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Sparkles, Gauge, Zap, Monitor, ShieldCheck } from 'lucide-react';
import { soundService } from '../services/soundService';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const tutorialSteps = [
  {
    title: "The Goal of Texas Hold'em",
    content: "The objective is simple: win the 'pot' by either having the best 5-card hand at the end, or by making all other players fold.",
    icon: <Sparkles className="w-12 h-12 text-[#d4af37]" />
  },
  {
    title: "The Blinds & Dealer",
    content: "Each round, one player has the 'Dealer Button'. The two players to their left post the 'Small Blind' and 'Big Blind'—forced bets to ensure there is always something to play for.",
    icon: <Gauge className="w-12 h-12 text-blue-400" />
  },
  {
    title: "Player Actions",
    content: "FOLD: Give up your hand and wait for next round. CHECK: Pass the action to the next player (if no bet is made). CALL: Match the current best bet. RAISE: Increase the current bet.",
    icon: <Zap className="w-12 h-12 text-purple-400" />
  },
  {
    title: "The Community Cards",
    content: "You receive 2 private cards. Then, 5 community cards are dealt in phases: The FLOP (3 cards), The TURN (1 card), and The RIVER (1 card). Use any combination to make the best hand.",
    icon: <Monitor className="w-12 h-12 text-green-400" />
  },
  {
    title: "Winning the Pot",
    content: "If multiple players remain after the River, a 'Showdown' occurs. The best hand ranking (from High Card to Royal Flush) takes the entire pot!",
    icon: <ShieldCheck className="w-12 h-12 text-[#d4af37]" />
  }
];

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = React.useState(0);

  const handleNext = () => {
    soundService.play('click');
    if (step < tutorialSteps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
      setStep(0);
    }
  };

  const handlePrev = () => {
    soundService.play('click');
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-[95%] max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 md:p-8 flex justify-between items-center shrink-0 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-4 bg-[#d4af37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                  <h2 className="text-[11px] md:text-[14px] uppercase font-black tracking-[0.2em] md:tracking-[0.3em] text-[#d4af37]">Step {step + 1} of {tutorialSteps.length}</h2>
                </div>
                <button 
                  onClick={() => {
                      soundService.play('click');
                      onClose();
                  }}
                  className="text-zinc-500 hover:text-white transition-all p-1"
                >
                  <X className="w-5 h-5 pointer-events-auto" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8 no-scrollbar min-h-[300px]">
                <div className="flex flex-col items-center text-center gap-6 md:gap-8">
                  <motion.div
                    key={step}
                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    className="p-8 md:p-10 bg-gradient-to-br from-zinc-900 to-black rounded-[2.5rem] border border-white/5 shadow-inner"
                  >
                    {tutorialSteps[step].icon}
                  </motion.div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight leading-none px-4">
                      {tutorialSteps[step].title}
                    </h3>
                    <p className="text-zinc-400 text-sm md:text-base leading-relaxed px-4 max-w-sm mx-auto font-medium">
                      {tutorialSteps[step].content}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 md:p-8 bg-black/40 border-t border-white/5 flex items-center justify-between gap-4">
                <button
                  onClick={handlePrev}
                  disabled={step === 0}
                  className={`flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl uppercase font-black text-[10px] tracking-widest transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex gap-1.5">
                  {tutorialSteps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-500 ${i === step ? 'w-6 bg-[#d4af37]' : 'w-2 bg-zinc-800'}`} 
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 md:px-10 py-3 md:py-4 bg-[#d4af37] text-black rounded-2xl uppercase font-black text-[10px] md:text-xs tracking-[0.2em] shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:scale-105 active:scale-95 transition-all"
                >
                  {step === tutorialSteps.length - 1 ? "Start" : "Next"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

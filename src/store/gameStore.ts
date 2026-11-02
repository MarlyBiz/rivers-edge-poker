import { create } from 'zustand';
import { Player, PokerCard, GamePhase, PlayerAction, GameState as GameStateType, GameSettings, GameDifficulty, PreAction, PotWinnerDetail } from '../types';
import { createDeck, generatePlayers, evaluateHand, calculatePots, resolveUncalledBets } from '../lib/gameLogic';
import { soundService } from '../services/soundService';
import { getBotPersonality, getRandomDialogue } from '../lib/botDialogues';

interface WinnerInfo {
  id: string;
  handLabel: string;
  bestHand: PokerCard[];
}

export interface GameStore extends GameStateType {
  deck: PokerCard[];
  setPhase: (phase: GamePhase) => void;
  initGame: (opponents: number, startingChips: number, difficulty: GameDifficulty, names?: string[], design?: string, enableInsights?: boolean, settings?: Partial<GameSettings>) => void;
  performAction: (action: PlayerAction, amount?: number) => void;
  resetGame: () => void;
  restartSession: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setChatMessage: (playerId: string, message: string) => void;
  setPreAction: (preAction: PreAction) => void;
  rabbitHunt: () => void;
}

const DEFAULT_SETTINGS: GameSettings = {
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
  enableTimer: true,
  cardBackDesign: 'classic-red',
  showTooltips: false,
  voiceCommands: false,
  rabbitHunting: true
};

/**
 * Blind seats for a dealer position (skips eliminated players). Heads-up: the dealer posts the
 * small blind and the other player the big blind (standard rule); otherwise SB/BB follow the button.
 * Shared by the store and the table markers so they can't disagree.
 */
export function blindSeats(players: { isEliminated?: boolean }[], dealerIndex: number): { sb: number; bb: number } {
  const n = players.length;
  const next = (start: number) => { let i = ((start % n) + n) % n, c = 0; while (players[i]?.isEliminated && c < n) { i = (i + 1) % n; c++; } return i; };
  const active = players.filter(p => !p.isEliminated).length;
  const sb = active === 2 ? next(dealerIndex) : next(dealerIndex + 1);
  return { sb, bb: next(sb + 1) };
}

export const useGameStore = create<GameStore>((set, get) => ({
  players: [],
  communityCards: [],
  pot: 0,
  phase: 'setup',
  dealerIndex: 0,
  currentPlayerIndex: 0,
  lastRaise: 0,
  minBet: 100,
  deck: [],
  winners: [],
  winnersInfo: [],
  handCount: 0,
  smallBlind: 50,
  bigBlind: 100,
  cardBackDesign: 'classic-red',
  enableInsights: false,
  isMuted: false,
  settings: DEFAULT_SETTINGS,
  actionLog: [],
  difficulty: 'medium',
  initialPlayersCount: 3,
  initialChips: 10000,
  initialPlayerNames: [],
  isGameOver: false,
  preAction: null,
  rabbitHuntCards: [],
  isRabbitHuntActive: false,

  setChatMessage: (playerId, message) => {
    if (message && get().settings.soundEffects) {
      soundService.play('pop');
    }
    const players = get().players.map(p => 
      p.id === playerId ? { ...p, chatMessage: message } : p
    );
    set({ players });
    
    // Clear message after 3 seconds
    setTimeout(() => {
      const currentPlayers = get().players.map(p => 
        p.id === playerId ? { ...p, chatMessage: undefined } : p
      );
      set({ players: currentPlayers });
    }, 3000);
  },

  setPreAction: (preAction) => set({ preAction }),

  rabbitHunt: () => {
    const state = get();
    if (state.isRabbitHuntActive || state.communityCards.length >= 5) return;

    let cardsToReveal = 5 - state.communityCards.length;
    let rabbitCards: PokerCard[] = [];
    let currentDeck = [...state.deck];

    for (let i = 0; i < cardsToReveal; i++) {
      if (currentDeck.length > 0) {
        rabbitCards.push(currentDeck.pop()!);
      }
    }

    // Logic for insight from user's perspective
    const fullCommunity = [...state.communityCards, ...rabbitCards];
    const user = state.players.find(p => p.isUser);
    let insight = "";

    if (user) {
      const userEval = evaluateHand(user.cards, fullCommunity);
      
      // Compare user's hand with all other active/folded players
      const opponents = state.players.filter(p => !p.isUser && !p.isEliminated);
      let strongestOpponentScore = -1;
      let strongestOpponentName = "";
      let strongestOpponentHand = "";

      opponents.forEach(p => {
        const oppEval = evaluateHand(p.cards, fullCommunity);
        if (oppEval.score > strongestOpponentScore) {
          strongestOpponentScore = oppEval.score;
          strongestOpponentName = p.name;
          strongestOpponentHand = oppEval.label;
        }
      });

      const userWouldHaveWon = userEval.score > strongestOpponentScore;
      
      const stripHand = (label: string) => label.split(' - ')[0];
      const outcome = `YOU: ${stripHand(userEval.label)} vs ${strongestOpponentName}: ${stripHand(strongestOpponentHand)}`;
      let verdict = "";
      let vibe = "";

      if (user.isFolded) {
        if (userWouldHaveWon) {
          verdict = "PAINFUL FOLD";
          const painfulVibes = [
            "Ouch! You hit exactly what you needed on the back end. That's gonna sting!",
            "Brutal! The river was your best friend, but you'd already left the party.",
            "Man, you would've absolutely crushed them! Someone check the pulse on that fold.",
            "Tough luck! You were one card away from a massive payday."
          ];
          vibe = painfulVibes[Math.floor(Math.random() * painfulVibes.length)];
        } else {
          verdict = "RIGHT FOLD";
          const rightVibes = [
            "Smart move! You were drawing dead anyway. Saved those chips for a real fight.",
            "Good discipline! You avoided a trap that would've cost you plenty.",
            "Professional fold. You recognized you were behind and didn't look back.",
            "Calculated and correct. You had no business in that pot."
          ];
          vibe = rightVibes[Math.floor(Math.random() * rightVibes.length)];
        }
      } else {
        const userWonPot = state.winners.includes(user.id);
        if (userWonPot) {
          if (userWouldHaveWon) {
            verdict = "PURE DOMINANCE";
            vibe = "You had 'em all the way! Pure dominance. You read the board like a pro.";
          } else {
            verdict = "LUCKY STEAL";
            vibe = "Phew! You bluffed 'em out just in time. The rabbit shows they actually caught up!";
          }
        } else {
          verdict = "TOUGH SHOWDOWN";
          vibe = "The deck just didn't cooperate. You stayed in for the right reasons, but the gods were elsewhere.";
        }
      }

      insight = `OUTCOME|${outcome}|VERDICT|${verdict}|VIBE|${vibe}`;
    }

    set({ 
      rabbitHuntCards: rabbitCards,
      isRabbitHuntActive: true,
      rabbitHuntInsight: insight,
      deck: currentDeck
    });
  },

  setPhase: (phase) => set({ phase }),

  updateSettings: (newSettings) => {
    const updatedSettings = { ...get().settings, ...newSettings };
    
    if (newSettings.soundEffects !== undefined) {
      soundService.toggleSfx(newSettings.soundEffects);
    }

    const updates: Partial<GameStore> = { settings: updatedSettings, isMuted: !updatedSettings.soundEffects };
    
    if (newSettings.enableInsights !== undefined) {
      updates.enableInsights = newSettings.enableInsights;
    }

    if (newSettings.cardBackDesign !== undefined) {
      updates.cardBackDesign = newSettings.cardBackDesign;
    }

    set(updates);
  },

  initGame: (opponents, startingChips, difficulty, names, design, enableInsights, customSettings) => {
    const settings = { ...DEFAULT_SETTINGS, ...customSettings };
    
    soundService.stopAll();
    if (settings.soundEffects) {
      soundService.play('shuffle');
      setTimeout(() => soundService.play('deal'), 1000);
    }
    
    const players = generatePlayers(opponents, startingChips, difficulty, names);
    const deck = createDeck();

    const dealerIndex = 0;
    const { sb: sbIndex, bb: bbIndex } = blindSeats(players, dealerIndex);
    const utgIndex = (bbIndex + 1) % players.length;

    const sb = Math.max(1, Math.floor(startingChips * 0.01));
    const bb = Math.max(2, Math.floor(startingChips * 0.02));

    // Reset everyone and deal cards
    players.forEach((p, i) => {
      p.cards = [deck.pop()!, deck.pop()!];
      p.isFolded = false;
      p.currentBet = 0;
      p.totalChipsContributed = 0;
      p.lastAction = undefined;
      p.isDealer = i === dealerIndex;
    });

    const sbToPay = Math.min(players[sbIndex].chips, sb);
    const bbToPay = Math.min(players[bbIndex].chips, bb);

    players[sbIndex].chips -= sbToPay;
    players[sbIndex].currentBet = sbToPay;
    players[sbIndex].totalChipsContributed = sbToPay;
    players[bbIndex].chips -= bbToPay;
    players[bbIndex].currentBet = bbToPay;
    players[bbIndex].totalChipsContributed = bbToPay;

    const initialPots = calculatePots(players);

    set({
      players,
      deck,
      communityCards: [],
      pot: sbToPay + bbToPay,
      pots: initialPots,
      phase: 'pre-flop',
      dealerIndex,
      currentPlayerIndex: utgIndex,
      lastRaise: bb,
      minBet: bb,
      winners: [],
      winnersInfo: [],
      handCount: 1,
      smallBlind: sb,
      bigBlind: bb,
      cardBackDesign: design || 'classic-red',
      enableInsights: !!enableInsights || settings.enableInsights,
      settings: { ...settings, enableInsights: !!enableInsights || settings.enableInsights },
      difficulty,
      isMuted: !settings.soundEffects,
      initialPlayersCount: opponents,
      initialChips: startingChips,
      initialPlayerNames: names || [],
      actionLog: [{ id: `start-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, message: 'Game started. Dealing cards...', timestamp: Date.now() }],
      isGameOver: false,
      preAction: null,
      rabbitHuntCards: [],
      isRabbitHuntActive: false,
      winnerPlayerId: undefined,
    });
  },

  restartSession: () => {
    const state = get();
    get().initGame(
      state.initialPlayersCount,
      state.initialChips,
      state.difficulty,
      state.initialPlayerNames,
      state.cardBackDesign,
      state.enableInsights,
      state.settings
    );
  },

  performAction: (action, amount = 0) => {
    const state = get();
    if (state.phase === 'setup' || state.phase === 'showdown') return;

    const updatedPlayers = [...state.players];
    const currentPlayer = { ...updatedPlayers[state.currentPlayerIndex] };

    // Validate amount (don't bet more than chips)
    let actualAmount = Math.floor(amount);
    if (action === 'call' || action === 'raise' || action === 'all-in') {
      actualAmount = Math.min(currentPlayer.chips, Math.floor(amount));
    }
    if (action === 'all-in') {
      actualAmount = currentPlayer.chips;
    }

    currentPlayer.lastAction = action;
    currentPlayer.currentBet = (currentPlayer.currentBet || 0) + actualAmount;
    currentPlayer.totalChipsContributed = (currentPlayer.totalChipsContributed || 0) + actualAmount;
    currentPlayer.chips -= actualAmount;

    // Bot Chat Trigger (35% frequency for all actions)
    if (!currentPlayer.isUser && state.settings.enableAiChat && Math.random() < 0.35) {
      const personality = getBotPersonality(currentPlayer.aiType || 'medium-iq', state.players.indexOf(state.players.find(p => p.id === currentPlayer.id)!));
      let chatAction: 'fold' | 'check' | 'raise' | 'bluff' = 'check';
      
      if (action === 'fold') {
        chatAction = 'fold';
      } else if (action === 'raise' || action === 'all-in') {
        // High frequency for "raise" pool, with chance for "bluff" pool if it's a big bet
        const isBigBet = actualAmount > state.pot * 0.5;
        chatAction = (isBigBet && Math.random() < 0.5) ? 'bluff' : 'raise';
      } else if (action === 'call') {
        chatAction = 'check'; // Calls use check pool for modesty
      }

      const message = getRandomDialogue(personality, chatAction as any);
      currentPlayer.chatMessage = message;
      if (state.settings.soundEffects) {
        soundService.play('pop');
      }
      
      // Auto-clear helper for this specific player object before it goes into the array
      setTimeout(() => {
        get().setChatMessage(currentPlayer.id, ''); // This will handle the clearing properly in the global state
      }, 3000);
    }
    
    // Action-specific sound effects for all players (human and bots)
    if (action === 'check') {
      soundService.play('check');
    } else if (action === 'fold') {
      soundService.play('fold');
    } else if (actualAmount > 0 || action === 'call' || action === 'raise' || action === 'all-in') {
      soundService.play('chips');
    } else {
      soundService.play('click');
    }
    
    if (action === 'fold') {
      currentPlayer.isFolded = true;
    }

    updatedPlayers[state.currentPlayerIndex] = currentPlayer;

    const actionMessage = action === 'fold' ? `${currentPlayer.name} folded` :
                        action === 'check' ? `${currentPlayer.name} checked` :
                        action === 'call' ? `${currentPlayer.name} called $${actualAmount.toLocaleString()}` :
                        action === 'all-in' ? `${currentPlayer.name} WENT ALL-IN!` :
                        `${currentPlayer.name} raised to $${currentPlayer.currentBet.toLocaleString()}`;

    const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newLogEntry = {
      id: actionId,
      message: actionMessage,
      timestamp: Date.now()
    };

    // Track contributions before standard Texas Hold'em uncalled bet refunds
    const preRefundContributionMap = new Map<string, number>();
    updatedPlayers.forEach(p => {
      preRefundContributionMap.set(p.id, p.totalChipsContributed || 0);
    });

    const refundResult = resolveUncalledBets(updatedPlayers, state.pot + actualAmount);
    const resolvedPot = refundResult.pot;
    const refundLogs: string[] = [];

    // Copy back to updatedPlayers and track if anyone got a refund
    for (let i = 0; i < updatedPlayers.length; i++) {
      const p = refundResult.players[i];
      const preContrib = preRefundContributionMap.get(p.id) || 0;
      const postContrib = p.totalChipsContributed || 0;
      if (preContrib > postContrib) {
        const refundAmt = preContrib - postContrib;
        refundLogs.push(`${p.name} returned $${refundAmt.toLocaleString()} (uncalled bet)`);
      }
      updatedPlayers[i] = p;
    }

    // Keep currentPlayer reference up-to-date with the refunded values
    Object.assign(currentPlayer, updatedPlayers[state.currentPlayerIndex]);

    const activePlayers = updatedPlayers.filter(p => !p.isFolded && !p.isEliminated);
    const maxBet = Math.max(...activePlayers.map(p => p.currentBet || 0));
    
    // Check if betting round is over
    // Round ends if:
    // 1. Only one player left
    // 2. Everyone has matched the max bet and everyone who could act has acted
    const playersWithChips = activePlayers.filter(p => p.chips > 0);
    const allMatching = activePlayers.every(p => p.chips === 0 || p.currentBet === maxBet);
    const allActed = activePlayers.every(p => p.lastAction !== undefined || p.chips === 0);
    
    let roundEnded = allMatching && allActed;

    if (activePlayers.length === 1) {
       roundEnded = true;
    }

    // Special case: if everyone is all-in or matched, and no more actions can be taken
    if (playersWithChips.length <= 1 && allMatching) {
      roundEnded = true;
    }

    let nextPhase: GamePhase = state.phase;
    let nextCommunityCards = [...state.communityCards];
    let nextDeck = [...state.deck];
    let nextPlayerIndex = (state.currentPlayerIndex + 1) % updatedPlayers.length;
    let nextWinners = state.winners;
    let nextWinnersInfo = state.winnersInfo;
    let nextMinBet = state.minBet;
    let nextPot = resolvedPot;
    let finalLog = [...state.actionLog, newLogEntry];

    // Append refund reports to the action logger for immediate user awareness
    refundLogs.forEach(msg => {
      finalLog.push({
        id: `refund-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        message: msg,
        timestamp: Date.now() + 1
      });
    });

    let nextPreAction = state.preAction;
    if (action === 'raise' || action === 'all-in') {
      const raiseValue = actualAmount - (maxBet - (currentPlayer.currentBet - actualAmount));
      nextMinBet = raiseValue > state.minBet ? raiseValue : state.minBet;
      
      // Reset auto-check if someone raised
      if (nextPreAction === 'check') {
        nextPreAction = null;
      }
    }

    let nextPotsWinners: PotWinnerDetail[] | undefined = undefined;

    if (roundEnded) {
       const nextPhases: Record<string, GamePhase> = {
         'pre-flop': 'flop',
         'flop': 'turn',
         'turn': 'river',
         'river': 'showdown',
       };
       
       if (activePlayers.length <= 1) {
         nextPhase = 'showdown';
         if (activePlayers.length === 1) {
           nextWinners = [activePlayers[0].id];
           const result = evaluateHand(activePlayers[0].cards, nextCommunityCards);
           nextWinnersInfo = [{
             id: activePlayers[0].id,
             handLabel: "Opponents Folded",
             bestHand: result.bestHand
           }];

           // If all opponents folded, they win all active pots
           const currentPots = calculatePots(updatedPlayers);
           nextPotsWinners = currentPots.map(pot => ({
             potId: pot.id,
             name: pot.name,
             amount: pot.amount,
             winnerIds: [activePlayers[0].id],
             handLabel: "Opponents Folded"
           }));
         }
       } else {
         nextPhase = nextPhases[state.phase] || 'pre-flop';
       }

       const phaseLog = {
         id: `phase-${nextPhase}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
         message: `ROUND: ${nextPhase.toUpperCase()}`,
         timestamp: Date.now() + 1
       };
       finalLog = [...finalLog, phaseLog];

       // Reset bets for next round
       updatedPlayers.forEach(p => {
         p.currentBet = 0;
         p.lastAction = undefined;
       });

       if (nextPhase === 'flop') {
         nextCommunityCards = [nextDeck.pop()!, nextDeck.pop()!, nextDeck.pop()!];
         nextPlayerIndex = (state.dealerIndex + 1) % updatedPlayers.length;
         soundService.play('card');
       } else if (nextPhase === 'turn') {
         nextCommunityCards.push(nextDeck.pop()!);
         nextPlayerIndex = (state.dealerIndex + 1) % updatedPlayers.length;
         soundService.play('card');
       } else if (nextPhase === 'river') {
         nextCommunityCards.push(nextDeck.pop()!);
         nextPlayerIndex = (state.dealerIndex + 1) % updatedPlayers.length;
         soundService.play('card');
       } else if (nextPhase === 'showdown') {
         soundService.play('collect');
         
         const currentPots = calculatePots(updatedPlayers);
         const calculatedPotsWinners: PotWinnerDetail[] = [];
         const overallWinnersSet = new Set<string>();
         const overallWinnersInfoMap = new Map<string, WinnerInfo>();

         currentPots.forEach(pot => {
           if (pot.amount <= 0) return;

           let bestScore = -1;
           const potCandidates: { id: string; score: number; label: string; bestHand: PokerCard[] }[] = [];

           // Check only players eligible for this specific pot
           pot.eligiblePlayerIds.forEach(pid => {
             const p = updatedPlayers.find(player => player.id === pid);
             if (p && !p.isFolded && !p.isEliminated) {
               const evalResult = evaluateHand(p.cards, nextCommunityCards);
               potCandidates.push({ id: p.id, score: evalResult.score, label: evalResult.label, bestHand: evalResult.bestHand });
               if (evalResult.score > bestScore) {
                 bestScore = evalResult.score;
               }
             }
           });

           const potWinnersOfThisTier = potCandidates.filter(c => c.score === bestScore);

           if (potWinnersOfThisTier.length > 0) {
             const winnerIds = potWinnersOfThisTier.map(w => w.id);
             calculatedPotsWinners.push({
               potId: pot.id,
               name: pot.name,
               amount: pot.amount,
               winnerIds,
               handLabel: potWinnersOfThisTier[0].label
             });

             winnerIds.forEach(id => overallWinnersSet.add(id));
             potWinnersOfThisTier.forEach(w => {
               overallWinnersInfoMap.set(w.id, {
                 id: w.id,
                 handLabel: w.label,
                 bestHand: w.bestHand
               });
             });
           } else {
             // Fallback: if somehow no active player is eligible, give it to the first active non-folded player
             const fallbackActive = updatedPlayers.filter(p => !p.isFolded && !p.isEliminated);
             if (fallbackActive.length > 0) {
               const winnerIds = [fallbackActive[0].id];
               const evalResult = evaluateHand(fallbackActive[0].cards, nextCommunityCards);
               calculatedPotsWinners.push({
                 potId: pot.id,
                 name: pot.name,
                 amount: pot.amount,
                 winnerIds,
                 handLabel: evalResult.label
               });
               overallWinnersSet.add(fallbackActive[0].id);
               overallWinnersInfoMap.set(fallbackActive[0].id, {
                 id: fallbackActive[0].id,
                 handLabel: evalResult.label,
                 bestHand: evalResult.bestHand
               });
             }
           }
         });

         nextWinners = Array.from(overallWinnersSet);
         nextWinnersInfo = Array.from(overallWinnersInfoMap.values()).sort((a, b) => {
           const pA = updatedPlayers.find(p => p.id === a.id);
           const pB = updatedPlayers.find(p => p.id === b.id);
           if (!pA || !pB) return 0;
           const scoreA = evaluateHand(pA.cards, nextCommunityCards).score;
           const scoreB = evaluateHand(pB.cards, nextCommunityCards).score;
           return scoreB - scoreA;
         });

         nextPlayerIndex = -1;
         nextPotsWinners = calculatedPotsWinners;
       }
       
       if (nextPlayerIndex !== -1) {
         let skipCount = 0;
         while ((updatedPlayers[nextPlayerIndex].isFolded || updatedPlayers[nextPlayerIndex].isEliminated || updatedPlayers[nextPlayerIndex].chips === 0) && skipCount < updatedPlayers.length) {
           nextPlayerIndex = (nextPlayerIndex + 1) % updatedPlayers.length;
           skipCount++;
         }
       }
    } else {
       let skipCount = 0;
       while ((updatedPlayers[nextPlayerIndex].isFolded || updatedPlayers[nextPlayerIndex].isEliminated || updatedPlayers[nextPlayerIndex].chips === 0) && skipCount < updatedPlayers.length) {
         nextPlayerIndex = (nextPlayerIndex + 1) % updatedPlayers.length;
         skipCount++;
       }
    }

    const finalPots = calculatePots(updatedPlayers);

    set({
      players: updatedPlayers,
      pot: nextPot,
      pots: finalPots,
      potsWinners: nextPotsWinners,
      phase: nextPhase,
      communityCards: nextCommunityCards,
      deck: nextDeck,
      currentPlayerIndex: nextPlayerIndex,
      winners: nextWinners,
      winnersInfo: nextWinnersInfo,
      minBet: nextMinBet,
      preAction: nextPreAction,
      actionLog: finalLog.slice(-50),
    });
  },

  resetGame: () => {
    const state = get();
    if (state.settings.soundEffects) {
      soundService.play('shuffle');
      setTimeout(() => soundService.play('deal'), 1000);
    }
    const winners = state.winners || [];
    const potsWinners = state.potsWinners || [];
    
    const updatedPlayers = state.players.map(p => ({ ...p }));
    
    // 1. Calculate side-pot / main-pot payouts
    const payouts: Record<string, number> = {};

    if (potsWinners.length > 0) {
      potsWinners.forEach(pw => {
        if (pw.winnerIds.length > 0) {
          const winShare = Math.floor(pw.amount / pw.winnerIds.length);
          pw.winnerIds.forEach(wid => {
            payouts[wid] = (payouts[wid] || 0) + winShare;
          });
        }
      });
    } else if (winners.length > 0) {
      // Fallback: split the total pot among overall winners equally (for compatibility if no potsWinners)
      const winShare = Math.floor(state.pot / winners.length);
      winners.forEach(wid => {
        payouts[wid] = (payouts[wid] || 0) + winShare;
      });
    }

    // Payout winners and trigger chats
    updatedPlayers.forEach((p, i) => {
      const winAmount = payouts[p.id] || 0;
      if (winAmount > 0) {
        p.chips += winAmount;
        
        // Win chat (40% chance)
        if (!p.isUser && state.settings.enableAiChat && Math.random() < 0.4) {
          const personality = getBotPersonality(p.aiType || 'medium-iq', i);
          p.chatMessage = getRandomDialogue(personality, 'win');
          setTimeout(() => get().setChatMessage(p.id, ''), 3500);
        }
      } else if (!p.isFolded && !p.isEliminated) {
        // Loss chat (30% chance for those who were actually in the showdown or didn't win)
        if (!p.isUser && state.settings.enableAiChat && Math.random() < 0.3) {
          const personality = getBotPersonality(p.aiType || 'medium-iq', i);
          p.chatMessage = getRandomDialogue(personality, 'loss');
          setTimeout(() => get().setChatMessage(p.id, ''), 3500);
        }
      }
    });

    // 2. Mark eliminated players (those who have 0 chips after payout)
    updatedPlayers.forEach(p => {
      if (p.chips <= 0) {
        p.isEliminated = true;
        p.isFolded = true; // Folded for good
        p.cards = [];
        p.totalChipsContributed = 0;
      }
    });

    const activePlayersCount = updatedPlayers.filter(p => !p.isEliminated).length;
    if (activePlayersCount <= 1) {
      const winner = updatedPlayers.find(p => !p.isEliminated);
      set({ 
        players: updatedPlayers,
        isGameOver: true, 
        winnerPlayerId: winner?.id,
        phase: 'showdown' // keep it in showdown so the UI can show the winner
      });
      return;
    }

    // 3. Find next dealer (must be an active player)
    let nextDealerIndex = (state.dealerIndex + 1) % updatedPlayers.length;
    let skipCount = 0;
    while (updatedPlayers[nextDealerIndex].isEliminated && skipCount < updatedPlayers.length) {
      nextDealerIndex = (nextDealerIndex + 1) % updatedPlayers.length;
      skipCount++;
    }
    
    // 4. Update blinds
    const nextHandCount = state.handCount + 1;
    let nextSB = state.smallBlind;
    let nextBB = state.bigBlind;
    if (nextHandCount % 5 === 1 && nextHandCount > 1) {
      nextSB = Math.max(1, Math.ceil(nextSB * 1.25));
      nextBB = nextSB * 2;
    }

    const deck = createDeck();

    // 5. Reset player states for new hand
    updatedPlayers.forEach((p, i) => {
      if (!p.isEliminated) {
        p.cards = [deck.pop()!, deck.pop()!];
        p.isFolded = false;
        p.currentBet = 0;
        p.totalChipsContributed = 0;
        p.lastAction = undefined;
        p.isDealer = i === nextDealerIndex;
      } else {
        p.cards = [];
        p.isFolded = true;
        p.isDealer = false;
        p.currentBet = 0;
        p.totalChipsContributed = 0;
        p.lastAction = undefined;
      }
    });

    // 6. Blinds and start index
    const getNextActiveIndex = (startIndex: number) => {
      let idx = startIndex % updatedPlayers.length;
      let count = 0;
      while (updatedPlayers[idx].isEliminated && count < updatedPlayers.length) {
        idx = (idx + 1) % updatedPlayers.length;
        count++;
      }
      return idx;
    };

    const { sb: sbIndex, bb: bbIndex } = blindSeats(updatedPlayers, nextDealerIndex);
    const utgIndex = getNextActiveIndex(bbIndex + 1);

    const sbToPay = Math.min(updatedPlayers[sbIndex].chips, nextSB);
    const bbToPay = Math.min(updatedPlayers[bbIndex].chips, nextBB);

    updatedPlayers[sbIndex].chips -= sbToPay;
    updatedPlayers[sbIndex].currentBet = sbToPay;
    updatedPlayers[sbIndex].totalChipsContributed = sbToPay;
    updatedPlayers[bbIndex].chips -= bbToPay;
    updatedPlayers[bbIndex].currentBet = bbToPay;
    updatedPlayers[bbIndex].totalChipsContributed = bbToPay;

    // Build side-pot message logs
    let message = 'Hand ended.';
    if (potsWinners.length > 0) {
      const parts = potsWinners.map(pw => {
        const wNames = pw.winnerIds.map(wid => updatedPlayers.find(p => p.id === wid)?.name || '').filter(Boolean).join(' & ');
        return `${wNames} won the ${pw.name} ($${pw.amount.toLocaleString()}) with ${pw.handLabel}`;
      });
      message = parts.join('; ');
    } else {
      const winnerNames = updatedPlayers
        .filter(p => winners.includes(p.id))
        .map(p => p.name)
        .join(' & ');
      if (winnerNames) {
        message = `${winnerNames} won $${state.pot.toLocaleString()}`;
      }
    }

    const newLogEntry = {
      id: `win-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      timestamp: Date.now()
    };

    const initialPots = calculatePots(updatedPlayers);

    set({
      players: updatedPlayers,
      deck,
      communityCards: [],
      pot: sbToPay + bbToPay,
      pots: initialPots,
      potsWinners: undefined,
      phase: 'pre-flop',
      dealerIndex: nextDealerIndex,
      currentPlayerIndex: utgIndex,
      lastRaise: nextBB,
      minBet: nextBB,
      winners: [],
      winnersInfo: [],
      handCount: nextHandCount,
      smallBlind: nextSB,
      bigBlind: nextBB,
      preAction: null,
      rabbitHuntCards: [],
      isRabbitHuntActive: false,
      rabbitHuntInsight: undefined,
      actionLog: [...state.actionLog, newLogEntry].slice(-50),
    });
  },
}));

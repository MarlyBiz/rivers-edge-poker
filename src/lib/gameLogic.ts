import { PokerCard, Suit, Rank, Player, AIType, GameDifficulty, PlayerAction } from "../types";

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function createDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return shuffle(deck);
}

function shuffle(deck: PokerCard[]): PokerCard[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export const BOT_NAMES = ['Doyle', 'Phil', 'Daniel', 'Vanessa', 'Stu', 'Antonio', 'Liv', 'Johnny', 'Esfandiari', 'Ivey', 'Negreanu', 'Moneymaker', 'Brunson', 'Hellmuth'];

export function generatePlayers(count: number, startingChips: number, difficulty: GameDifficulty, names?: string[]): Player[] {
  const players: Player[] = [
    {
      id: 'player-user',
      name: names?.[0] || 'You',
      chips: startingChips,
      cards: [],
      isDealer: false,
      isUser: true,
      isFolded: false,
      currentBet: 0,
    }
  ];

  for (let i = 0; i < count; i++) {
    let aiType: AIType;
    const rng = Math.random();

    if (difficulty === 'hard') {
      aiType = rng < 0.7 ? 'high-iq' : 'medium-iq';
    } else if (difficulty === 'medium') {
      if (rng < 0.33) aiType = 'high-iq';
      else if (rng < 0.66) aiType = 'medium-iq';
      else aiType = 'low-iq';
    } else {
      if (rng < 0.6) aiType = 'low-iq';
      else if (rng < 0.9) aiType = 'medium-iq';
      else aiType = 'high-iq';
    }

    players.push({
      id: `player-bot-${i}`,
      name: names?.[i + 1] || BOT_NAMES[i % BOT_NAMES.length],
      chips: startingChips,
      cards: [],
      isDealer: false,
      isUser: false,
      isFolded: false,
      currentBet: 0,
      aiType,
    });
  }

  return players;
}

// Robust hand strength evaluator - returns a number representing hand value
// Higher is better. Using a 5-card best hand out of 7 total cards.
// Format: Rank (9-0) followed by 5 kicker values in descending importance.
export function evaluateHand(cards: PokerCard[], communityCards: PokerCard[]): { score: number; label: string; bestHand: PokerCard[] } {
  const allCards = [...cards, ...communityCards];
  const rankValues: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };

  // Helper to get all combinations of 5 from N
  function getCombinations(arr: PokerCard[], k: number): PokerCard[][] {
    const results: PokerCard[][] = [];
    function helper(start: number, combo: PokerCard[]) {
      if (combo.length === k) {
        results.push([...combo]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        combo.push(arr[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    }
    helper(0, []);
    return results;
  }

  const combinations = allCards.length >= 5 
    ? getCombinations(allCards, 5)
    : [allCards];

  let bestScore = -1;
  let bestLabel = 'High Card';
  let bestHand: PokerCard[] = [];

  combinations.forEach(combo => {
    const result = evaluateFiveCardHand(combo, rankValues);
    if (result.score > bestScore) {
      bestScore = result.score;
      bestLabel = result.label;
      bestHand = combo;
    }
  });

  return { score: bestScore, label: bestLabel, bestHand };
}

function evaluateFiveCardHand(cards: PokerCard[], rankValues: Record<Rank, number>): { score: number, label: string } {
  // Filter out any invalid cards just in case
  const validCards = cards.filter(c => c && c.rank && rankValues[c.rank]);
  
  if (validCards.length === 0) {
    return { score: 0, label: 'No Hand' };
  }

  const values = validCards.map(c => rankValues[c.rank]).sort((a, b) => b - a);
  const suits = validCards.map(c => c.suit);
  
  const rankNames: Record<number, string> = {
    2: '2s', 3: '3s', 4: '4s', 5: '5s', 6: '6s', 7: '7s', 8: '8s', 9: '9s', 10: '10s', 11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces'
  };

  const isFlush = validCards.length >= 5 && suits.every(s => s === suits[0]);
  const isStraight = validCards.length >= 5 && (
    values.every((v, i) => i === 0 || values[i - 1] - v === 1) ||
    (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2)
  );

  const counts: Record<number, number> = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);
  
  const sortedCounts = Object.entries(counts)
    .map(([val, count]) => ({ val: parseInt(val), count: count as number }))
    .sort((a, b) => b.count !== a.count ? b.count - a.count : b.val - a.val);

  // Guard against empty sortedCounts
  if (sortedCounts.length === 0) {
    return { score: 0, label: 'No Hand' };
  }

  // Scoring formula: rank * 15^5 + k1 * 15^4 + k2 * 15^3 + k3 * 15^2 + k4 * 15 + k5
  const getScore = (rank: number, kickers: number[]) => {
    let score = rank * Math.pow(15, 5);
    for (let i = 0; i < 5; i++) {
        score += (kickers[i] || 0) * Math.pow(15, 4 - i);
    }
    return score;
  };

  if (isStraight && isFlush) {
    const highVal = (values[0] === 14 && values[1] === 5) ? 5 : values[0];
    return { 
      score: getScore(8, [highVal, 0, 0, 0, 0]), 
      label: highVal === 14 ? 'Royal Flush' : `Straight Flush - ${rankNames[highVal]} high` 
    };
  }
  
  if (sortedCounts[0].count === 4) {
    return { 
      score: getScore(7, [sortedCounts[0].val, sortedCounts[1]?.val || 0, 0, 0, 0]), 
      label: `Four of a Kind - ${rankNames[sortedCounts[0].val]}` 
    };
  }
  
  if (sortedCounts[0].count === 3 && sortedCounts[1]?.count === 2) {
    return { 
      score: getScore(6, [sortedCounts[0].val, sortedCounts[1].val, 0, 0, 0]), 
      label: `Full House - ${rankNames[sortedCounts[0].val]} over ${rankNames[sortedCounts[1].val]}` 
    };
  }
  
  if (isFlush) {
    return { score: getScore(5, values), label: `Flush - ${rankNames[values[0]]} high` };
  }
  
  if (isStraight) {
    const highVal = (values[0] === 14 && values[1] === 5) ? 5 : values[0];
    return { score: getScore(4, [highVal, 0, 0, 0, 0]), label: `Straight - ${rankNames[highVal]} high` };
  }
  
  if (sortedCounts[0].count === 3) {
    const kickers = sortedCounts.slice(1).map(c => c.val);
    return { score: getScore(3, [sortedCounts[0].val, ...kickers]), label: `Three of a Kind - ${rankNames[sortedCounts[0].val]}` };
  }
  
  if (sortedCounts[0].count === 2 && sortedCounts[1]?.count === 2) {
    const kickers = sortedCounts.slice(2).map(c => c.val);
    return { score: getScore(2, [sortedCounts[0].val, sortedCounts[1].val, ...kickers]), label: `Two Pair - ${rankNames[sortedCounts[0].val]} and ${rankNames[sortedCounts[1].val]}` };
  }
  
  if (sortedCounts[0].count === 2) {
    const kickers = sortedCounts.slice(1).map(c => c.val);
    return { score: getScore(1, [sortedCounts[0].val, ...kickers]), label: `One Pair - ${rankNames[sortedCounts[0].val]}` };
  }
  
  return { score: getScore(0, values), label: `High Card - ${rankNames[values[0]]}` };
}

// Robust win probability calculator - used by both players (Insights) and AI.
// IMPORTANT: This function must NEVER receive cards other than the specific player's hole cards
// and the community cards. It simulates unknown opponents with random cards from the remaining deck.
export function calculateWinProbability(myCards: PokerCard[], communityCards: PokerCard[], activePlayersCount: number): number {
  if (myCards.length < 2) return 0;
  
  const fullDeck = createDeck();
  // We only filter out the cards we actually KNOW (our own + table)
  const knownCards = [...myCards, ...communityCards];
  const remainingDeck = fullDeck.filter(dc => !knownCards.some(kc => kc.rank === dc.rank && kc.suit === dc.suit));

  let wins = 0;
  const iterations = 400;

  for (let i = 0; i < iterations; i++) {
    const simDeck = [...remainingDeck];
    // Shuffle the remaining deck for this simulation
    for (let j = simDeck.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [simDeck[j], simDeck[k]] = [simDeck[k], simDeck[j]];
    }

    const simCommunity = [...communityCards];
    const deckPtr = { val: 0 };
    
    // Complete community cards if any are missing
    while (simCommunity.length < 5) {
      simCommunity.push(simDeck[deckPtr.val++]);
    }

    const userScore = evaluateHand(myCards, simCommunity).score;
    let userWinsSim = true;

    // Simulate other active players' unknown hands
    for (let p = 0; p < activePlayersCount - 1; p++) {
      const oppCards = [simDeck[deckPtr.val++], simDeck[deckPtr.val++]];
      if (!oppCards[0] || !oppCards[1]) break; 
      
      const oppScore = evaluateHand(oppCards, simCommunity).score;
      if (oppScore > userScore) {
        userWinsSim = false;
        break;
      }
    }

    if (userWinsSim) wins++;
  }

  return Math.round((wins / iterations) * 100);
}

export interface AIDecision {
  action: PlayerAction;
  amount?: number;
  thought: string;
}

// AI Decision Logic - STRICTLY FORBIDDEN from accessing any private state of other players.
// It receives ONLY the AI's own hole cards and public table information.
export function getAIDecision(
  myCards: PokerCard[],
  communityCards: PokerCard[],
  activePlayersCount: number,
  toCall: number,
  pot: number,
  playerChips: number,
  aiType: AIType,
  bigBlind: number,
  handCount: number
): AIDecision {
  // AI calculates its own "equity" based ONLY on known cards vs random unknowns
  const equity = calculateWinProbability(myCards, communityCards, activePlayersCount);
  const potOdds = toCall > 0 ? (toCall / (pot + toCall)) * 100 : 0;
  const rng = Math.random();
  const stackInBlinds = playerChips / bigBlind;
  
  // Complexity factors based on AI Type
  const tightness = aiType === 'high-iq' ? 1.2 : aiType === 'medium-iq' ? 1.0 : 0.8;
  const aggression = aiType === 'high-iq' ? 1.1 : aiType === 'medium-iq' ? 1.0 : 1.3;
  const bluffFrequency = aiType === 'high-iq' ? 0.15 : aiType === 'medium-iq' ? 0.1 : 0.05;

  // 1. Fold logic: Extreme weakness or bad odds
  if (toCall > 0) {
    const modifiedEquity = equity / tightness;

    if (modifiedEquity < 35 && modifiedEquity < potOdds && rng > bluffFrequency) {
      return { action: 'fold', thought: 'Analyzing the board... range feels weak here.' };
    }
  }

  // 2. Strong Hand logic: Equity > 65%
  if (equity > 65) {
    if (toCall === 0) {
      if (rng < 0.2 && aiType === 'high-iq') return { action: 'check', thought: 'Position looks good. Checking to see action.' };
      const raiseAmount = bigBlind * (2 + Math.floor(rng * 3)) * aggression;
      return { action: 'raise', amount: Math.min(playerChips, Math.round(raiseAmount)), thought: 'Standard value bet based on board strength.' };
    } else {
      if (rng < 0.4 * aggression || equity > 85) {
         if (stackInBlinds < 15 || equity > 90) return { action: 'all-in', thought: 'Representing a monster. Committed.' };
         return { action: 'raise', amount: Math.min(playerChips, toCall * 3), thought: 'Testing their resolve with a solid range.' };
      }
      return { action: 'call', amount: toCall, thought: 'The price makes sense for this spot.' };
    }
  }

  // 3. Marginal Hand logic: Equity 40% - 65%
  if (equity >= 40) {
    if (toCall === 0) {
      if (rng < 0.3 * aggression) {
        return { action: 'raise', amount: bigBlind * 2, thought: 'Applying pressure to cap their range.' };
      }
      return { action: 'check', thought: 'Willing to see the next street.' };
    } else {
      if (equity >= potOdds * tightness || rng < bluffFrequency) {
        if (toCall > playerChips * 0.5 && equity < 55) return { action: 'fold', thought: 'Not worth risking half my stack on a coin flip.' };
        return { action: 'call', amount: toCall, thought: 'Calling based on pot odds and implied strength.' };
      }
      return { action: 'fold', thought: 'Folding. My ranges are wider than this bet.' };
    }
  }

  // 4. Bluffing logic: Equity < 40% but situation is right
  const canBluff = (aiType !== 'low-iq') && (rng < bluffFrequency);
  if (canBluff) {
    const isScaryBoard = communityCards.length >= 3 && (
      communityCards.filter(c => c.suit === communityCards[0].suit).length >= 3 || 
      evaluateHand([], communityCards).score > 100 
    );

    if (isScaryBoard || rng < 0.05) {
      if (toCall === 0) {
         return { action: 'raise', amount: bigBlind * 3, thought: 'Board is polar. I am selling a story.' };
      } else if (toCall < playerChips * 0.2) {
         return { action: 'raise', amount: toCall * 2.5, thought: 'Re-raising to represent a top-of-range hand.' };
      }
    }
  }

  // Default: Check or Fold
  if (toCall === 0) return { action: 'check', thought: 'Passing action. Let them lead.' };
  return { action: 'fold', thought: 'Zero connectivity. Easy fold.' };
}

export function resolveUncalledBets(players: Player[], pot: number): { players: Player[]; pot: number } {
  const updatedPlayers = players.map(p => ({ ...p }));
  let currentPot = pot;

  // Run through active players to check if they have uncalled bets
  updatedPlayers.forEach(p => {
    // A player might have folded but can't have uncalled bets returned anymore (they gave up on them).
    // An eliminated player is already out.
    // So only active, non-folded, non-eliminated players can receive refunds.
    if (p.isFolded || p.isEliminated) return;

    // Find other active players in the hand
    const otherActive = updatedPlayers.filter(o => o.id !== p.id && !o.isFolded && !o.isEliminated);
    let maxOtherPossible = 0;

    if (otherActive.length > 0) {
      // The absolute maximum amount any other active player can contribute.
      // This is their current contribution + any remaining chips they have in their stack.
      maxOtherPossible = Math.max(...otherActive.map(o => (o.totalChipsContributed || 0) + o.chips));
    } else {
      // If there are no other active players (everyone else has folded or is eliminated),
      // the maximum contribution any folded/eliminated player has made.
      const otherInactive = updatedPlayers.filter(o => o.id !== p.id);
      maxOtherPossible = otherInactive.length > 0 ? Math.max(...otherInactive.map(o => o.totalChipsContributed || 0)) : 0;
    }

    const currentContrib = p.totalChipsContributed || 0;
    if (currentContrib > maxOtherPossible) {
      const refund = currentContrib - maxOtherPossible;
      p.chips += refund;
      p.totalChipsContributed = maxOtherPossible;
      p.currentBet = Math.max(0, (p.currentBet || 0) - refund);
      currentPot = Math.max(0, currentPot - refund);
    }
  });

  return { players: updatedPlayers, pot: currentPot };
}

export interface PokerPot {
  id: string;
  amount: number;
  eligiblePlayerIds: string[];
  name: string;
}

export function calculatePots(players: Player[]): PokerPot[] {
  // Map players to their contributions tracker
  const contributions = players.map(p => ({
    id: p.id,
    contributed: p.totalChipsContributed || 0,
    isFolded: !!p.isFolded,
    isEliminated: !!p.isEliminated,
    // A player is eligible to win if they have not folded, are not eliminated, and contributed some chips
    eligible: !p.isFolded && !p.isEliminated && (p.totalChipsContributed || 0) > 0,
  }));

  const pots: PokerPot[] = [];
  let potIndex = 1;

  while (true) {
    // Collect all players who still have remaining contributions > 0
    const contributors = contributions.filter(c => c.contributed > 0);
    if (contributors.length === 0) break;

    // Of those who still have contribution > 0, find the eligible ones
    const eligibleContributors = contributors.filter(c => c.eligible);

    if (eligibleContributors.length === 0) {
      // If there are NO eligible contributors left (e.g. only folded players' contributions remain),
      // we add their remaining contributions to the last constructed pot (if any),
      // or to all remaining active players in the game.
      const remainingAmount = contributors.reduce((sum, c) => sum + c.contributed, 0);
      if (pots.length > 0) {
        pots[pots.length - 1].amount += remainingAmount;
      } else {
        pots.push({
          id: 'pot-main',
          amount: remainingAmount,
          eligiblePlayerIds: players.filter(p => !p.isFolded && !p.isEliminated).map(p => p.id),
          name: 'Main Pot',
        });
      }
      break;
    }

    // Find the minimum remaining contribution among the eligible contributors
    const minContribution = Math.min(...eligibleContributors.map(c => c.contributed));

    // Create a new pot for this tier
    let potAmount = 0;
    const eligiblePlayerIds: string[] = [];

    contributions.forEach(c => {
      if (c.contributed > 0) {
        const contributionToThisPot = Math.min(c.contributed, minContribution);
        potAmount += contributionToThisPot;
        c.contributed -= contributionToThisPot;
        
        if (c.eligible) {
          eligiblePlayerIds.push(c.id);
        }
      }
    });

    const name = potIndex === 1 ? 'Main Pot' : `Side Pot ${potIndex - 1}`;
    pots.push({
      id: `pot-${potIndex === 1 ? 'main' : 'side-' + (potIndex - 1)}`,
      amount: potAmount,
      eligiblePlayerIds,
      name,
    });

    potIndex++;
  }

  return pots;
}


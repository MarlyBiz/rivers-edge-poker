export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface PokerCard {
  suit: Suit;
  rank: Rank;
}

export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';
export type AIType = 'high-iq' | 'medium-iq' | 'low-iq';

export interface Player {
  id: string;
  name: string;
  chips: number;
  cards: PokerCard[];
  isDealer: boolean;
  isUser: boolean;
  isFolded: boolean;
  currentBet: number;
  lastAction?: PlayerAction;
  isEliminated?: boolean;
  aiType?: AIType;
  chatMessage?: string;
  totalChipsContributed?: number; // Total contributions during the entire current hand
}

export interface WinnerInfo {
  id: string;
  handLabel: string;
  bestHand: PokerCard[];
}

export interface GameSettings {
  soundEffects: boolean;
  showPotOdds: boolean;
  highlightBestHand: boolean;
  turboMode: boolean;
  showHandRankingsHelper: boolean;
  enableAiChat: boolean;
  animationIntensity: 'low' | 'medium' | 'high';
  theme: 'light' | 'dark';
  tableColor: 'green' | 'red' | 'blue' | 'burgundy' | 'black' | 'purple' | 'navy' | 'forest' | 'chocolate' | 'charcoal' | 'teal' | 'olive';
  showTips: boolean;
  enableInsights: boolean;
  enableTimer: boolean;
  cardBackDesign: string;
  showTooltips: boolean;
  voiceCommands: boolean;
  rabbitHunting: boolean;
}

export type GamePhase = 'setup' | 'initial' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type PreAction = 'check-fold' | 'check' | 'fold' | 'auto-call' | null;

export interface GameLogEntry {
  id: string;
  message: string;
  timestamp: number;
}

export interface PotWinnerDetail {
  potId: string;
  name: string;
  amount: number;
  winnerIds: string[];
  handLabel: string;
}

export interface GameState {
  players: Player[];
  communityCards: PokerCard[];
  pot: number;
  pots?: { id: string; amount: number; eligiblePlayerIds: string[]; name: string }[]; // Active pots (Main Pot + any Side Pots)
  potsWinners?: PotWinnerDetail[]; // Calculated winners for each active pot at showdown
  phase: GamePhase;
  dealerIndex: number;
  currentPlayerIndex: number;
  lastRaise: number;
  minBet: number;
  winners: string[];
  winnersInfo: WinnerInfo[];
  handCount: number;
  smallBlind: number;
  bigBlind: number;
  cardBackDesign: string; // Keep for now
  enableInsights: boolean;
  isMuted: boolean;
  settings: GameSettings;
  actionLog: GameLogEntry[];
  difficulty: GameDifficulty;
  initialPlayersCount: number;
  initialChips: number;
  initialPlayerNames: string[];
  isGameOver: boolean;
  winnerPlayerId?: string;
  preAction: PreAction;
  rabbitHuntCards: PokerCard[];
  isRabbitHuntActive: boolean;
  rabbitHuntInsight?: string;
}

import type { Player, PokerCard, WinnerInfo, GameLogEntry, GameSettings } from '../../types';
import type { VoiceStatus } from '../../services/voiceCommandService';

/** Everything the saloon layout needs from PokerTable. Presentation only: all game
 *  state, effects and handlers stay in PokerTable / the store. */
export interface SaloonCtx {
  players: Player[];
  communityCards: PokerCard[];
  pot: number;
  pots?: { id: string; amount: number; name: string }[];
  phase: string;
  handCount: number;
  currentPlayerIndex: number;
  settings: GameSettings;
  winners: string[];
  winnersInfo: WinnerInfo[];
  winnerNames: string;
  logs: GameLogEntry[];
  user?: Player;
  isShowdown: boolean;
  isUserTurn: boolean;
  isAllInSituation: boolean;
  isPaused: boolean;
  isSpectating: boolean;
  isSkippingHand: boolean;
  isFullscreen: boolean;
  isRabbitHuntActive: boolean;
  rabbitHuntCards: PokerCard[];
  rabbitHuntInsight?: string;
  flashingPlayerId: string | null;
  callAmount: number;
  canCheck: boolean;
  betAmount: number;
  sliderMin: number;
  sliderMax: number;
  turnTimeLeft: number;
  turnDuration: number;
  winProbability: number | null;
  potOdds: number | null;
  handLabel: string;
  feltColor: string;
  voiceStatus: VoiceStatus;
  voiceSupported: boolean;
  showHandHelper: boolean;
  // handlers
  setBetAmount: (n: number) => void;
  setHoveredAction: (a: string | null) => void;
  fold: () => void;
  checkOrCall: () => void;
  raise: () => void;
  allIn: () => void;
  skipHand: () => void;
  nextHand: () => void;
  rabbitHunt: () => void;
  togglePause: () => void;
  resume: () => void;
  toggleSound: () => void;
  toggleGuide: () => void;
  toggleTips: () => void;
  toggleVoice: () => void;
  openSettings: () => void;
  openHowToPlay: () => void;
  toggleFullscreen: () => void;
  forfeit: () => void;
  click: () => void;
}

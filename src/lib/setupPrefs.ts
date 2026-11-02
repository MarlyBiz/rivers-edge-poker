/** Last game's setup choices (players, buy-in, difficulty, card back, all settings), prefilled next time. */
import type { GameDifficulty, GameSettings } from '../types';

const KEY = 'rivers-edge-setup';
const V = 1;
export interface SetupPrefs { opponents?: number; chips?: number; difficulty?: GameDifficulty; cardDesign?: string; settings?: Partial<GameSettings> }

export function loadSetup(): SetupPrefs {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!d || d.v !== V) return {};
    const out: SetupPrefs = {};
    if (Number.isInteger(d.opponents) && d.opponents >= 1 && d.opponents <= 5) out.opponents = d.opponents;
    if (Number.isFinite(d.chips) && d.chips >= 100 && d.chips <= 1_000_000) out.chips = d.chips;
    if (['easy', 'medium', 'hard'].includes(d.difficulty)) out.difficulty = d.difficulty;
    if (typeof d.cardDesign === 'string') out.cardDesign = d.cardDesign;
    if (d.settings && typeof d.settings === 'object') out.settings = d.settings;
    return out;
  } catch { return {}; }
}

export function saveSetup(patch: SetupPrefs) {
  try {
    const cur = loadSetup();
    localStorage.setItem(KEY, JSON.stringify({ v: V, ...cur, ...patch, settings: { ...(cur.settings || {}), ...(patch.settings || {}) } }));
  } catch { /* ignore */ }
}

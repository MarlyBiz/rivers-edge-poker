/**
 * Resume after the app is closed: the whole game state is saved to localStorage
 * (debounced on every change, and immediately on pagehide / tab hidden).
 * On launch an unfinished save is restored before the first render, so the player
 * lands straight back on the table. Bot turns re-schedule themselves from the
 * restored state (no re-deal). Save is cleared at game over or when leaving to setup.
 */
import { useGameStore } from './gameStore';

const KEY = 'rivers-edge-save';
const SAVE_VERSION = 1;
const PHASES = ['pre-flop', 'flop', 'turn', 'river', 'showdown'];

function snapshot() {
  const s = useGameStore.getState() as any;
  const data: Record<string, unknown> = {};
  for (const k of Object.keys(s)) if (typeof s[k] !== 'function') data[k] = s[k];
  return data;
}

function write() {
  try {
    const s = useGameStore.getState();
    if (s.phase === 'setup' || s.isGameOver || !s.players?.length) { localStorage.removeItem(KEY); return; }
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, at: Date.now(), state: snapshot() }));
  } catch { /* quota / private mode: ignore */ }
}

export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

/** Returns true when a saved unfinished game was restored. */
export function restoreSave(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const save = JSON.parse(raw);
    const st = save?.state;
    const ok = save?.v === SAVE_VERSION && st && Array.isArray(st.players) && st.players.length >= 2
      && st.players.some((p: any) => p?.isUser) && Array.isArray(st.deck) && Array.isArray(st.communityCards)
      && PHASES.includes(st.phase) && !st.isGameOver && typeof st.currentPlayerIndex === 'number';
    if (!ok) { clearSave(); return false; }
    const cur = useGameStore.getState();
    useGameStore.setState({ ...st, players: st.players.map((p: any) => ({ ...p, chatMessage: '' })), settings: { ...cur.settings, ...(st.settings || {}) } });
    return true;
  } catch { clearSave(); return false; }
}

let timer: ReturnType<typeof setTimeout> | undefined;
export function startAutoSave() {
  useGameStore.subscribe(() => { clearTimeout(timer); timer = setTimeout(write, 400); });
  const flush = () => { clearTimeout(timer); write(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}

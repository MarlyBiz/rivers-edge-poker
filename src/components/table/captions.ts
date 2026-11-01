import { useMemo } from 'react';
import type { Player, GameLogEntry } from '../../types';

export type CaptionKind = 'fold' | 'check' | 'call' | 'raise' | 'bet' | 'allin' | 'winner' | 'blind';
export interface Caption { text: string; kind: CaptionKind }

const money = (n: number) => `$${(n || 0).toLocaleString()}`;

/**
 * Each player's latest action this hand, read from this hand's action log (the store logs
 * every action: "X folded / checked / called $N / raised to $N / WENT ALL-IN!"). Reading the
 * log, not player.lastAction, keeps an action visible even when it closes the street (the store
 * clears lastAction/currentBet in that same update). Resets with the hand's log.
 */
export function useSeatCaptions(players: Player[], logs: GameLogEntry[], phase: string, winners: string[]) {
  return useMemo(() => {
    const out: Record<string, Caption | undefined> = {};
    const byName = [...players].sort((x, y) => y.name.length - x.name.length);
    let streetHasBet = true; // pre-flop: the blinds are the opening bet
    for (const l of logs) {
      const m = l.message || '';
      if (/^ROUND: /.test(m)) { streetHasBet = false; continue; }
      const p = byName.find(pl => m.startsWith(pl.name + ' '));
      if (!p) continue;
      const rest = m.slice(p.name.length + 1);
      let c: Caption | null = null;
      let mm: RegExpMatchArray | null;
      if (rest.startsWith('folded')) c = { text: 'Fold', kind: 'fold' };
      else if (rest.startsWith('checked')) c = { text: 'Check', kind: 'check' };
      else if ((mm = rest.match(/^called \$([\d,]+)/))) c = { text: `Call $${mm[1]}`, kind: 'call' };
      else if ((mm = rest.match(/^raised to \$([\d,]+)/))) {
        c = streetHasBet ? { text: `Raise to $${mm[1]}`, kind: 'raise' } : { text: `Bet $${mm[1]}`, kind: 'bet' };
        streetHasBet = true;
      } else if (/^WENT ALL-IN/i.test(rest)) { c = { text: 'All in', kind: 'allin' }; streetHasBet = true; }
      if (c) out[p.id] = c;
    }
    // Blinds posted at the start of the hand (not logged as actions).
    if (phase === 'pre-flop') for (const p of players) if (!out[p.id] && p.currentBet > 0) out[p.id] = { text: `Blind ${money(p.currentBet)}`, kind: 'blind' };
    if (phase === 'showdown') for (const id of winners) out[id] = { text: 'Winner', kind: 'winner' };
    return out;
  }, [players, logs, phase, winners]);
}

export const CAPTION_COLOR: Record<CaptionKind, string> = {
  fold: 'text-[#d6a49a]',
  check: 'text-[#b9dcb0]',
  call: 'text-[#a9c7e8]',
  raise: 'text-[#f0cf7a]',
  bet: 'text-[#f0cf7a]',
  allin: 'text-[#ff9f8a]',
  winner: 'text-[#ffd76a]',
  blind: 'text-[#d8c9a8]',
};

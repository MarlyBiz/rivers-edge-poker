import type { CSSProperties } from 'react';

export type Orientation = 'portrait' | 'landscape';
export type Tier = 'sm' | 'lg';

export interface Tokens {
  orient: Orientation;
  tier: Tier;
  /** opponent seat box */
  seatW: number;
  seatH: number;
  topBarH: number;
  /** landscape side column width */
  sideW: number;
  card: Record<'mini' | 'seat' | 'board' | 'hand' | 'fan', { w: number; h: number; rank: number; suit: number }>;
  boardGap: number;
  potH: number;
  tickerH: number;
}

/** Size tokens per orientation / tier. All values are CSS px and never scaled down. */
export function getTokens(w: number, h: number): Tokens {
  const orient: Orientation = h > w ? 'portrait' : 'landscape';
  const tier: Tier = Math.min(w, h) >= 600 ? 'lg' : 'sm';
  const lg = tier === 'lg';
  const portrait = orient === 'portrait';
  return {
    orient,
    tier,
    seatW: lg ? 176 : 132,
    seatH: lg ? 88 : 70, // includes the last-action caption row
    topBarH: lg ? 56 : portrait ? 52 : 44,
    sideW: lg ? 340 : w < 760 ? 214 : 236,
    card: {
      mini: lg ? { w: 32, h: 45, rank: 14, suit: 18 } : { w: 24, h: 34, rank: 12, suit: 14 },
      seat: lg ? { w: 46, h: 64, rank: 18, suit: 24 } : { w: 36, h: 50, rank: 14, suit: 18 },
      board: lg
        ? { w: 84, h: 118, rank: 28, suit: 44 }
        : portrait ? { w: 58, h: 82, rank: 20, suit: 30 } : { w: 54, h: 76, rank: 19, suit: 28 },
      hand: lg
        ? { w: 92, h: 128, rank: 30, suit: 40 }
        : portrait ? { w: 70, h: 98, rank: 24, suit: 32 } : { w: 60, h: 84, rank: 21, suit: 28 },
      fan: lg
        ? { w: 180, h: 252, rank: 52, suit: 84 }
        : portrait ? { w: 150, h: 210, rank: 44, suit: 72 } : { w: 130, h: 182, rank: 38, suit: 62 },
    },
    boardGap: lg ? 10 : 6,
    potH: lg ? 66 : 56,
    tickerH: lg ? 22 : 18,
  };
}

export function tokenStyle(t: Tokens): CSSProperties {
  const v: Record<string, string> = {};
  (Object.keys(t.card) as (keyof Tokens['card'])[]).forEach(k => {
    const c = t.card[k];
    v[`--card-${k}-w`] = `${c.w}px`;
    v[`--card-${k}-h`] = `${c.h}px`;
    v[`--card-${k}-rank`] = `${c.rank}px`;
    v[`--card-${k}-suit`] = `${c.suit}px`;
  });
  return v as CSSProperties;
}

export interface Pt { x: number; y: number; side: 'left' | 'right' | 'top' }

/**
 * Seat centres (px) for n opponents inside the table area (w x h), ordered clockwise
 * starting at the user's left. Positions keep every seat box clear of the pot/board
 * column; the layout e2e test asserts there are no overlaps.
 */
export function seatSlots(n: number, w: number, h: number, t: Tokens): Pt[] {
  const m = 6;
  const L = t.seatW / 2 + m;
  const R = w - t.seatW / 2 - m;
  const C = w / 2;
  const topY = t.seatH / 2 + m;
  const portrait = t.orient === 'portrait';
  // Landscape: if three plates fit side by side, the upper side seats share the top row.
  const topRowFits = !portrait && w >= 3 * t.seatW + 4 * m + 8;
  const hiY = topRowFits ? topY : Math.max(h * 0.2, topY + t.seatH + 6);
  const lowY = portrait ? Math.min(h * 0.82, h - t.seatH / 2 - m) : h - t.seatH / 2 - m;
  const top: Pt = { x: C, y: topY, side: 'top' };
  const lh: Pt = { x: L, y: hiY, side: 'left' };
  const rh: Pt = { x: R, y: hiY, side: 'right' };
  const ll: Pt = { x: L, y: lowY, side: 'left' };
  const rl: Pt = { x: R, y: lowY, side: 'right' };
  switch (n) {
    case 1: return [top];
    case 2: return [{ x: Math.max(L, w * 0.28), y: topY, side: 'top' }, { x: Math.min(R, w * 0.72), y: topY, side: 'top' }];
    case 3: return [lh, top, rh];
    case 4: return [ll, lh, rh, rl];
    default: return [ll, lh, top, rh, rl];
  }
}

/** Vertical centre of the board row. */
export function boardCenterY(h: number, t: Tokens) {
  // Keep the pot (above the board) clear of the top seat.
  const minY = 6 + t.seatH + 4 + t.potH + 6 + t.card.board.h / 2;
  return Math.max(t.orient === 'portrait' ? h * 0.5 : h * 0.52, minY);
}

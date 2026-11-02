import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** Single source of truth for felt colours (setup swatches + in-game table). */
export const FELT_COLORS: Record<string, string> = {
  green: '#2f5b3c', red: '#630a0a', blue: '#0a2342', burgundy: '#420a1c', black: '#111111', purple: '#280a42',
  forest: '#294d2c', chocolate: '#3d1c02', charcoal: '#222222', teal: '#063333', olive: '#333306', navy: '#000033',
};
export const feltColor = (id?: string) => FELT_COLORS[id || 'green'] || FELT_COLORS.green;

/** Walnut rail → brass inlay → felt. Used by the live table and by every preview, so they can't drift. */
export type RoomLight = 'lit' | 'dark';
/** Settings theme -> room lighting ('light' = lamp-lit room, anything else = dark room with a spotlight). */
export const roomLight = (theme?: string): RoomLight => (theme === 'light' ? 'lit' : 'dark');

export function FeltSurface({ color, portrait, pad = 11, style, className = '', children, light = 'dark' }: {
  color: string; portrait: boolean; pad?: number; style?: CSSProperties; className?: string; children?: ReactNode; light?: RoomLight;
}) {
  const railR = portrait ? '44% / 24%' : '26% / 48%';
  return (
    <div className={`saloon-rail room-${light} ${className}`} style={{ borderRadius: railR, padding: pad, ...style }}>
      <div className="w-full h-full saloon-brass p-[3px]" style={{ borderRadius: railR }}>
        <div data-testid="felt" className="w-full h-full saloon-felt relative" style={{ borderRadius: railR, backgroundColor: color }}><div className={`felt-light ${light}`} />{children}</div>
      </div>
    </div>
  );
}

/** Reference size ≈ the real landscape table felt, so fixed-px shadows/texture/vignette keep the table's proportions. */
const REF_W = 640, REF_H = 300;

/** The real table surface rendered at table size and scaled down uniformly — an exact miniature. */
export function FeltPreview({ color, children, className = '', light = 'dark' }: { color: string; children?: ReactNode; className?: string; light?: RoomLight }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setS(el.clientWidth / REF_W));
    ro.observe(el); setS(el.clientWidth / REF_W);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative w-full ${className}`} style={{ aspectRatio: `${REF_W} / ${REF_H}` }}>
      {s > 0 && (
        <FeltSurface color={color} portrait={false} light={light}
          style={{ position: 'absolute', left: 0, top: 0, width: REF_W, height: REF_H, transform: `scale(${s})`, transformOrigin: '0 0' }}>
          {children}
        </FeltSurface>
      )}
    </div>
  );
}

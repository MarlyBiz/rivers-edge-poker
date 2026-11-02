import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, Pause, Play, Menu, X, Volume2, VolumeX, Monitor, HelpCircle, Settings,
  Maximize, Minimize, LogOut, ScrollText, FastForward, Zap, ChevronUp, Share2, RotateCcw,
} from 'lucide-react';
import { Card } from '../Card';
import { ChipStack, ClayChip } from '../ChipStack';
import { Slider } from '../ui/slider';
import type { Player } from '../../types';
import { getTokens, tokenStyle, seatSlots, boardCenterY, type Tokens, type Pt } from './layout';
import type { SaloonCtx } from './types';
import { FeltSurface, roomLight } from './felt';
import { shareWithToast } from '../../lib/share';
import { useSeatCaptions, CAPTION_COLOR, type Caption } from './captions';

function useSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const money = (n: number) => `$${(n || 0).toLocaleString()}`;
const ACTION_LABEL: Record<string, string> = { fold: 'Folded', check: 'Check', call: 'Call', raise: 'Raise', 'all-in': 'All in' };

/* ───────────────────────── Top bar + menu ───────────────────────── */

/** Header full-screen toggle. Follows the real fullscreen state; hidden where the Fullscreen API is missing (iPhone Safari). */
function FullscreenButton({ onToggle }: { onToggle: () => void }) {
  const doc = document as any;
  const supported = !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
  const get = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);
  const [fs, setFs] = useState(get);
  useEffect(() => {
    const on = () => setFs(get());
    document.addEventListener('fullscreenchange', on);
    document.addEventListener('webkitfullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on); };
  }, []);
  if (!supported) return null;
  return (
    <button data-testid="btn-fullscreen" aria-label={fs ? 'Exit full screen' : 'Full screen'} title={fs ? 'Exit full screen' : 'Full screen'} onClick={onToggle} className="saloon-icon-btn">
      {fs ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
    </button>
  );
}

function TopBar({ ctx, t, onMenu }: { ctx: SaloonCtx; t: Tokens; onMenu: () => void }) {
  const micBlocked = ctx.voiceStatus === 'permission-denied';
  return (
    <div
      data-testid="topbar"
      className="relative z-[300] flex items-center justify-between gap-2 shrink-0"
      style={{ height: t.topBarH, paddingLeft: 'max(10px, env(safe-area-inset-left))', paddingRight: 'max(10px, env(safe-area-inset-right))' }}
    >
      <div className="flex flex-col leading-tight min-w-0">
        <span className="saloon-title text-[13px] font-bold tracking-[0.08em] text-[#e9c46a] whitespace-nowrap">River's Edge</span>
        <span className="text-[12px] font-semibold text-[#d8c9a8] whitespace-nowrap">
          Hand #{ctx.handCount}
          {ctx.isSpectating && <span className="ml-2 text-[#e9c46a]">· Spectating</span>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          data-testid="btn-mic"
          aria-label={ctx.settings.voiceCommands ? 'Turn voice commands off' : 'Turn voice commands on'}
          title={!ctx.voiceSupported ? 'Voice commands not supported' : micBlocked ? 'Microphone access blocked' : ctx.settings.voiceCommands ? 'Voice commands on' : 'Voice commands off'}
          onClick={ctx.toggleVoice}
          className={`saloon-icon-btn relative ${ctx.settings.voiceCommands ? '' : 'opacity-70'}`}
        >
          {ctx.settings.voiceCommands ? <Mic className={`w-5 h-5 ${micBlocked ? 'text-red-400' : ''}`} /> : <MicOff className="w-5 h-5" />}
          {ctx.settings.voiceCommands && ctx.voiceStatus === 'listening' && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#e9c46a] animate-pulse" />
          )}
        </button>
        <button data-testid="btn-pause" aria-label={ctx.isPaused ? 'Resume game' : 'Pause game'} onClick={ctx.togglePause}
          className={`saloon-icon-btn ${ctx.isPaused ? '!bg-[#e9c46a] !text-black' : ''}`}>
          {ctx.isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
        </button>
        <FullscreenButton onToggle={ctx.toggleFullscreen} />
        <button data-testid="btn-menu" aria-label="Open menu" onClick={onMenu} className="saloon-icon-btn">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function MenuSheet({ ctx, t, onClose, onLog }: { ctx: SaloonCtx; t: Tokens; onClose: () => void; onLog: () => void }) {
  const item = (key: string, icon: ReactNode, label: string, fn: () => void, danger = false) => (
    <button
      key={key}
      data-testid={`menu-${key}`}
      onClick={() => { onClose(); fn(); }}
      className={`w-full min-h-[48px] px-4 flex items-center gap-3 text-[15px] font-semibold text-left rounded-lg hover:bg-white/5 ${danger ? 'text-[#f1a093]' : 'text-[#f4ecd8]'}`}
    >
      <span className="w-5 h-5 flex items-center justify-center text-[#e9c46a]">{icon}</span>
      {label}
    </button>
  );
  return (
    <>
      <div className="fixed inset-0 z-[465] bg-black/40" onClick={onClose} />
      <motion.div
        role="menu"
        data-testid="menu-sheet"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
        className="fixed z-[470] saloon-plate rounded-xl p-2 w-[260px] max-h-[calc(100dvh-64px)] overflow-y-auto"
        style={{ top: `calc(${t.topBarH}px + env(safe-area-inset-top))`, right: 'max(8px, env(safe-area-inset-right))' }}
      >
        {item('sound', ctx.settings.soundEffects ? <Volume2 /> : <VolumeX />, ctx.settings.soundEffects ? 'Mute sound' : 'Unmute sound', ctx.toggleSound)}
        {item('share', <Share2 />, 'Share the game', () => { shareWithToast(); })}
        {ctx.settings.showHandRankingsHelper && item('guide', <Monitor />, 'Hand rankings', ctx.toggleGuide)}
        {item('tips', <HelpCircle />, ctx.settings.showTips ? 'Tips: on' : 'Tips: off', ctx.toggleTips)}
        {item('log', <ScrollText />, 'Hand log', onLog)}
        {item('settings', <Settings />, 'Settings', ctx.openSettings)}
        {item('help', <HelpCircle />, 'How to play', ctx.openHowToPlay)}
        {item('fullscreen', ctx.isFullscreen ? <Minimize /> : <Maximize />, ctx.isFullscreen ? 'Exit full screen' : 'Full screen', ctx.toggleFullscreen)}
        <div className="h-px bg-white/10 my-1" />
        {item('newgame', <RotateCcw />, 'New game', ctx.forfeit)}
        {item('forfeit', <LogOut />, 'Forfeit and leave', ctx.forfeit, true)}
      </motion.div>
    </>
  );
}

function LogSheet({ ctx, onClose }: { ctx: SaloonCtx; onClose: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [ctx.logs.length]);
  return (
    <>
      <div className="fixed inset-0 z-[465] bg-black/50" onClick={onClose} />
      <motion.div
        data-testid="log-sheet"
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="fixed z-[470] left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[520px] max-h-[70dvh] saloon-plate rounded-t-2xl flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <span className="saloon-title text-[16px] font-bold text-[#e9c46a]">Hand log</span>
          <button aria-label="Close hand log" onClick={onClose} className="w-11 h-11 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto px-4 pb-4 flex flex-col gap-1.5">
          {ctx.logs.length === 0 && <p className="text-[14px] text-[#d8c9a8]">No actions yet.</p>}
          {ctx.logs.map((l, i) => (
            <p key={`${l.id}-${i}`} className={`text-[14px] leading-snug ${i === ctx.logs.length - 1 ? 'text-[#e9c46a] font-semibold' : 'text-[#e8dcc0]'}`}>{l.message}</p>
          ))}
          <div ref={endRef} />
        </div>
      </motion.div>
    </>
  );
}

/* ───────────────────────── Table: felt, seats, pot, board ───────────────────────── */

/** Dealer button: sits inline in the plate (beside the chip count), never on top of cards or names. */
function DealerChip() {
  return <span data-testid="dealer-chip" className="w-5 h-5 shrink-0 rounded-full bg-[#f4ecd8] border-2 border-[#c9a45c] text-[12px] leading-none font-black text-[#1b1208] flex items-center justify-center" aria-label="Dealer">D</span>;
}

function Seat({ ctx, p, idx, pt, t, cap, onOpen }: { ctx: SaloonCtx; p: Player; idx: number; pt: Pt; t: Tokens; cap?: Caption; key?: string; onOpen?: (id: string) => void }) {
  const isCurrent = ctx.currentPlayerIndex === idx && !ctx.isShowdown && !ctx.isPaused;
  const isWinner = ctx.isShowdown && ctx.winners.includes(p.id);
  const faceUp = !p.isFolded && !p.isEliminated && (ctx.isShowdown || ctx.isAllInSituation);
  const size = faceUp ? 'seat' : 'mini';
  const cw = t.card[size].w;
  const overlap = faceUp ? Math.round(cw * 0.45) : Math.round(cw * 0.5);
  const status = p.isEliminated ? 'Out' : p.isFolded ? 'Folded' : null;
  const cardsOnRight = pt.side === 'left';
  const lg = t.tier === 'lg';
  return (
    <div
      data-testid="seat"
      data-name={p.name}
      className={`absolute z-[40] flex flex-col justify-center rounded-xl px-1.5 py-1 saloon-plate ${isCurrent || isWinner ? 'saloon-plate-active' : ''} ${p.isFolded || p.isEliminated ? 'opacity-55' : ''} ${ctx.flashingPlayerId === p.id ? 'player-action-flash' : ''}`}
      style={{ left: pt.x - t.seatW / 2, top: pt.y - t.seatH / 2, width: t.seatW, height: t.seatH }}
    >
     <div className={`flex items-center gap-1.5 min-h-0 ${cardsOnRight ? 'flex-row-reverse' : 'flex-row'}`}>
      <div data-testid="seat-cards" className={`relative flex shrink-0 items-center ${faceUp && ctx.isShowdown && onOpen ? 'cursor-pointer' : ''}`} style={{ height: t.card[size].h }}
        role={faceUp && ctx.isShowdown && onOpen ? 'button' : undefined} aria-label={faceUp && ctx.isShowdown && onOpen ? `Show ${p.name}'s cards large` : undefined}
        onClick={faceUp && ctx.isShowdown && onOpen ? () => onOpen(p.id) : undefined}>
        {p.isEliminated ? null : p.cards.map((c, ci) => (
          <div key={ci} style={{ marginLeft: ci > 0 ? -overlap : 0, transform: `rotate(${ci === 0 ? -4 : 4}deg)` }}>
            <Card
              card={c}
              size={size}
              hidden={!faceUp}
              highlight={ctx.settings.highlightBestHand && ctx.isShowdown && ctx.winnersInfo.some(w => w.id === p.id && w.bestHand.some(b => b.rank === c.rank && b.suit === c.suit))}
            />
          </div>
        ))}
      </div>
      <div className={`flex flex-col min-w-0 flex-1 leading-tight ${cardsOnRight ? 'items-end text-right' : 'items-start text-left'}`}>
        <span data-testid="seat-name" className={`${lg ? 'text-[15px]' : 'text-[13px]'} font-extrabold uppercase tracking-[0.03em] truncate max-w-full ${isCurrent || isWinner ? 'text-[#e9c46a]' : 'text-[#f4ecd8]'}`}>{p.name}</span>
        <span className={`flex items-center gap-1 max-w-full ${cardsOnRight ? 'flex-row-reverse' : ''}`}>
          <span data-testid="seat-chips" className={`${lg ? 'text-[15px]' : 'text-[13px]'} font-mono font-bold text-[#cfe3c6] tabular-nums truncate`}>{money(p.chips)}</span>
          {p.isDealer && <DealerChip />}
        </span>
      </div>
     </div>
     <SeatCaption cap={cap} status={status} isCurrent={isCurrent} bet={p.currentBet} lg={lg} />
    </div>
  );
}

function SeatCaption({ cap, status, isCurrent, bet, lg }: { cap?: Caption; status: string | null; isCurrent: boolean; bet: number; lg: boolean }) {
  const cls = `${lg ? 'text-[14px]' : 'text-[12px]'} font-bold leading-[16px] h-[16px] mt-0.5 flex items-center justify-center gap-1 whitespace-nowrap overflow-hidden`;
  if (cap && (cap.kind === 'winner' || !status || cap.kind === 'fold')) {
    return (
      <div data-testid="seat-caption" data-kind={cap.kind} className={`${cls} ${CAPTION_COLOR[cap.kind]} ${cap.kind === 'winner' ? 'uppercase tracking-wide' : ''}`}>
        {(cap.kind === 'call' || cap.kind === 'raise' || cap.kind === 'bet' || cap.kind === 'blind' || cap.kind === 'allin') && <ClayChip px={12} />}
        <span className="truncate">{cap.text}</span>
      </div>
    );
  }
  if (status) return <div data-testid="seat-caption" data-kind="status" className={`${cls} text-[#c9b48a] uppercase`}>{status}</div>;
  if (bet > 0) return <div className={`${cls} text-[#e9c46a]`}><ClayChip px={12} />{money(bet)}</div>;
  if (isCurrent) return <div className={`${cls} text-[#e9c46a]`}>Thinking…</div>;
  return <div className={cls} />;
}

function TableArea({ ctx, t, areaRef, onLog, captions, onOpenSeat }: { ctx: SaloonCtx; t: Tokens; areaRef: RefObject<HTMLDivElement | null>; onLog: () => void; captions: Record<string, Caption | undefined>; onOpenSeat?: (id: string) => void }) {
  const { w, h } = useSize(areaRef);
  const userIndex = Math.max(0, ctx.players.findIndex(p => p.isUser));
  const n = ctx.players.length;
  const opponents = ctx.players
    .map((p, idx) => ({ p, idx, rel: (idx - userIndex + n) % n }))
    .filter(o => o.rel !== 0)
    .sort((a, b) => a.rel - b.rel);
  const slots = w > 0 ? seatSlots(opponents.length, w, h, t) : [];
  const b = t.card.board;
  const boardW = 5 * b.w + 4 * t.boardGap;
  const cy = boardCenterY(h, t);
  const boardTop = cy - b.h / 2;
  const portrait = t.orient === 'portrait';
  const railR = portrait ? '44% / 24%' : '26% / 48%';
  const pad = t.tier === 'lg' ? 16 : 11;
  const lastLog = ctx.logs[ctx.logs.length - 1]?.message;
  const winnerLabel = ctx.winnersInfo[0]?.handLabel;
  // Pot column stays clear of the side seats.
  const potW = Math.max(150, Math.min(220, w - 2 * (t.seatW + 14)));

  return (
    <div ref={areaRef} data-testid="table-area" className="relative flex-1 min-h-0 min-w-0">
      {w > 0 && (
        <>
          {/* Walnut rail → brass inlay → felt */}
          <FeltSurface className="absolute" light={roomLight(ctx.settings.theme)} color={ctx.feltColor} portrait={portrait} pad={pad} style={{ inset: portrait ? '2px 4px' : '4px 6px' }} />

          {/* Pot */}
          <div
            data-testid="pot"
            className="absolute z-[30] flex flex-col items-center justify-end gap-1 pointer-events-none"
            style={{ left: w / 2 - potW / 2, width: potW, top: boardTop - 6 - t.potH, height: t.potH }}
          >
            {ctx.isShowdown && ctx.winnersInfo.length > 0 ? (
              <span className="text-[13px] font-bold uppercase text-[#f4ecd8] truncate max-w-full">{winnerLabel}</span>
            ) : ctx.pots && ctx.pots.length > 1 ? (
              <span className="text-[12px] font-semibold text-[#e8dcc0] truncate max-w-full">
                {ctx.pots.map(p => `${p.name} ${money(p.amount)}`).join(' · ')}
              </span>
            ) : (
              <ChipStack amount={ctx.pot} showValue={false} variant="pot" orientation="horizontal" size="sm" />
            )}
            <div className="flex items-baseline gap-2 bg-black/55 rounded-full px-3 py-0.5 border border-[#c9a45c]/50 max-w-full min-w-0">
              {ctx.isShowdown && ctx.winnersInfo.length > 0
                ? <span data-testid="pot-winner" className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#e9c46a] truncate min-w-0">{ctx.winnerNames || 'Split pot'} wins</span>
                : <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#e9c46a]">Pot</span>}
              <span data-testid="pot-amount" className={`${t.tier === 'lg' ? 'text-[26px]' : 'text-[22px]'} font-mono font-extrabold text-[#f4ecd8] tabular-nums leading-tight shrink-0`}>{money(ctx.pot)}</span>
            </div>
          </div>

          {/* Board */}
          <div data-testid="board" className="absolute z-[30] flex" style={{ left: w / 2 - boardW / 2, top: boardTop, width: boardW, height: b.h, gap: t.boardGap }}>
            {Array.from({ length: 5 }).map((_, i) => {
              if (i < ctx.communityCards.length) {
                const c = ctx.communityCards[i];
                return <Card key={`b-${i}`} card={c} size="board" highlight={ctx.settings.highlightBestHand && ctx.isShowdown && ctx.winnersInfo.some(wi => wi.bestHand.some(bc => bc.rank === c.rank && bc.suit === c.suit))} />;
              }
              const ri = i - ctx.communityCards.length;
              if (ctx.isRabbitHuntActive && ri < ctx.rabbitHuntCards.length) {
                return <div key={`r-${i}`} className="opacity-60 grayscale"><Card card={ctx.rabbitHuntCards[ri]} size="board" /></div>;
              }
              return <div key={`e-${i}`} data-testid="board-slot" className="rounded-md border border-dashed border-[#c9a45c]/35 bg-black/10" style={{ width: b.w, height: b.h }} />;
            })}
          </div>

          {/* Last action ticker (tap for the full hand log) */}
          {lastLog && (
            <button
              data-testid="ticker"
              onClick={onLog}
              className="absolute z-[30] text-[12px] font-semibold text-[#e8dcc0] truncate text-center px-2"
              style={{ left: w / 2 - Math.min(w - 16, boardW + 40) / 2, width: Math.min(w - 16, boardW + 40), top: boardTop + b.h + 6, height: t.tickerH }}
            >
              {lastLog}
            </button>
          )}

          {opponents.map((o, i) => slots[i] && <Seat key={o.p.id} ctx={ctx} p={o.p} idx={o.idx} pt={slots[i]} t={t} cap={captions[o.p.id]} onOpen={onOpenSeat} />)}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Hero: plate + compact stack + fan ───────────────────────── */

function HeroStack({ ctx, t, onOpen }: { ctx: SaloonCtx; t: Tokens; onOpen: () => void }) {
  const u = ctx.user;
  const c = t.card.hand;
  if (!u || u.isEliminated || u.cards.length === 0) {
    return <div style={{ width: c.w * 1.45, height: c.h }} className="flex items-center justify-center text-[12px] text-[#c9b48a] uppercase">{u?.isEliminated ? 'Out' : ''}</div>;
  }
  return (
    <button
      data-testid="hero-stack"
      aria-label="Show my cards"
      onClick={onOpen}
      className={`relative shrink-0 ${u.isFolded ? 'opacity-50 saturate-50' : ''}`}
      style={{ width: c.w * 1.45, height: c.h + 4 }}
    >
      {u.cards.map((card, i) => (
        <div key={i} className="absolute top-0.5" style={{ left: i * c.w * 0.45, transform: `rotate(${i === 0 ? -5 : 5}deg)` }}>
          <Card card={card} size="hand" highlight={ctx.settings.highlightBestHand && ctx.isShowdown && ctx.winnersInfo.some(w => w.id === u.id && w.bestHand.some(b => b.rank === card.rank && b.suit === card.suit))} />
        </div>
      ))}
      <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-black/70 rounded-full px-1.5 flex items-center border border-[#c9a45c]/40">
        <ChevronUp className="w-3.5 h-3.5 text-[#e9c46a]" />
      </span>
    </button>
  );
}

function HeroPlate({ ctx, t, cap }: { ctx: SaloonCtx; t: Tokens; cap?: Caption }) {
  const u = ctx.user;
  if (!u) return null;
  const lg = t.tier === 'lg';
  const isCurrent = ctx.isUserTurn && !ctx.isPaused;
  return (
    <div data-testid="hero-plate" className={`min-w-0 flex-1 overflow-hidden flex flex-col leading-tight gap-0.5 rounded-xl px-2.5 py-1.5 saloon-plate ${isCurrent ? 'saloon-plate-active' : ''}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        {u.isDealer && <DealerChip />}
        <span className={`${lg ? 'text-[15px]' : 'text-[13px]'} font-extrabold uppercase truncate ${isCurrent ? 'text-[#e9c46a]' : 'text-[#f4ecd8]'}`}>{u.name}</span>
        {cap ? <span data-testid="hero-caption" data-kind={cap.kind} className={`ml-auto text-[12px] font-bold whitespace-nowrap truncate ${CAPTION_COLOR[cap.kind]} ${cap.kind === 'winner' ? 'uppercase' : ''}`}>{cap.text}</span>
          : u.currentBet > 0 && <span className="ml-auto flex items-center gap-1 text-[12px] font-bold text-[#e9c46a] whitespace-nowrap"><ClayChip px={13} />{money(u.currentBet)}</span>}
      </div>
      <span data-testid="hero-chips" className={`${lg ? 'text-[24px]' : 'text-[20px]'} font-mono font-extrabold text-[#cfe3c6] tabular-nums`}>{money(u.chips)}</span>
      {ctx.handLabel && <span data-testid="hand-label" className={`${lg ? 'text-[15px]' : 'text-[13px]'} font-bold text-[#e9c46a] uppercase line-clamp-2 leading-tight`}>{ctx.handLabel}</span>}
      {(ctx.winProbability !== null || ctx.potOdds !== null) && !(t.orient === 'landscape' && t.tier === 'sm') && (
        <span className="text-[12px] font-semibold text-[#d8c9a8] flex flex-wrap gap-x-2">
          {ctx.winProbability !== null && <span className="whitespace-nowrap">Win <b className="text-[#9fd49a]">{ctx.winProbability}%</b></span>}
          {ctx.potOdds !== null && <span className="whitespace-nowrap">Pot odds <b className="text-[#a9c7e8]">{ctx.potOdds}%</b></span>}
        </span>
      )}
    </div>
  );
}

function FanOverlay({ ctx, t, onClose, player }: { ctx: SaloonCtx; t: Tokens; onClose: () => void; player?: Player }) {
  const u = player || ctx.user;
  const other = !!player && !player.isUser;
  const otherLabel = other ? ctx.winnersInfo.find(w => w.id === player!.id)?.handLabel : undefined;
  const c = t.card.fan;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!u) return null;
  const landscape = t.orient === 'landscape';
  return (
    <motion.div
      role="dialog"
      aria-label={other ? `${u?.name}'s cards` : 'Your cards'}
      data-testid={other ? 'opp-fan' : 'hero-fan'}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-[400] bg-black/70"
    >
      <div className="absolute flex flex-col items-center justify-center gap-4" style={{ left: 0, top: 0, bottom: 0, right: landscape ? t.sideW : 0 }}>
        <div className="flex items-end">
          {u.cards.map((card, i) => (
            <motion.div
              key={i}
              data-testid="fan-card"
              initial={{ rotate: 0, y: 30, scale: 0.8 }}
              animate={{ rotate: i === 0 ? -7 : 7, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{ marginLeft: i > 0 ? -Math.round(c.w * 0.22) : 0, transformOrigin: 'bottom center' }}
            >
              <Card card={card} size="fan" />
            </motion.div>
          ))}
        </div>
        {other && <span className="text-[16px] font-extrabold uppercase tracking-wide text-[#f4ecd8]">{u.name}{otherLabel ? ` · ${otherLabel}` : ''}</span>}
        {!other && ctx.handLabel && <span className="text-[16px] font-extrabold uppercase tracking-wide text-[#e9c46a]">{ctx.handLabel}</span>}
        {!other && (ctx.winProbability !== null || ctx.potOdds !== null) && (
          <span className="text-[14px] font-semibold text-[#e8dcc0] flex gap-3">
            {ctx.winProbability !== null && <span>Win <b className="text-[#9fd49a]">{ctx.winProbability}%</b></span>}
            {ctx.potOdds !== null && <span>Pot odds <b className="text-[#a9c7e8]">{ctx.potOdds}%</b></span>}
          </span>
        )}
        <span className="text-[12px] text-[#d8c9a8]">Tap anywhere to close</span>
      </div>
    </motion.div>
  );
}

/* ───────────────────────── Actions (thumb zone) + raise sheet ───────────────────────── */

function ActionPanel({ ctx, t, vertical, onRaise }: { ctx: SaloonCtx; t: Tokens; vertical: boolean; onRaise: () => void }) {
  const u = ctx.user;
  const current = ctx.players[ctx.currentPlayerIndex];
  const disabled = !ctx.isUserTurn || ctx.isPaused;
  const wrap = vertical ? 'flex flex-col gap-2' : 'flex flex-row gap-2';
  const showRoundButtons = ctx.isShowdown && (!u?.isEliminated || ctx.isSpectating) && ctx.settings.rabbitHunting;

  let status: ReactNode = null;
  if (ctx.isShowdown) status = <span className="text-[#e9c46a]">Round complete</span>;
  else if (ctx.isUserTurn) status = <span className="text-[#e9c46a] font-bold">Your move{ctx.settings.enableTimer ? ` · ${ctx.turnTimeLeft}s` : ''}</span>;
  else if (u?.isEliminated) status = <span>Spectating</span>;
  else if (current) status = <span>{current.name} is thinking…</span>;

  let body: ReactNode;
  if (ctx.isShowdown) {
    body = showRoundButtons ? (
      <div className={wrap}>
        {ctx.communityCards.length < 5 && !ctx.isRabbitHuntActive && (
          <button data-testid="action-rabbit" onClick={ctx.rabbitHunt} className="saloon-btn saloon-btn-ghost flex-1 flex items-center justify-center gap-2 px-3"><Zap className="w-5 h-5" />Rabbit hunt</button>
        )}
        <button data-testid="action-next" onClick={ctx.nextHand} className="saloon-btn saloon-btn-call flex-1 px-3">Next hand</button>
      </div>
    ) : <div className="min-h-[56px] flex items-center justify-center text-[13px] text-[#d8c9a8]">Next hand starting…</div>;
  } else if (u?.isFolded && !ctx.isSkippingHand) {
    body = (
      <button data-testid="action-skip" onClick={ctx.skipHand} className="saloon-btn saloon-btn-ghost w-full flex items-center justify-center gap-2">
        <FastForward className="w-5 h-5 fill-current" />Skip hand
      </button>
    );
  } else {
    body = (
      <div className={wrap}>
        <button data-testid="action-fold" disabled={disabled} onClick={ctx.fold}
          onMouseEnter={() => ctx.setHoveredAction('Fold')} onMouseLeave={() => ctx.setHoveredAction(null)}
          className="saloon-btn saloon-btn-fold flex-1 min-w-[108px] px-2">Fold</button>
        <button data-testid="action-call" disabled={disabled} onClick={ctx.checkOrCall}
          onMouseEnter={() => ctx.setHoveredAction(ctx.canCheck ? 'Check' : 'Call')} onMouseLeave={() => ctx.setHoveredAction(null)}
          className="saloon-btn saloon-btn-call flex-1 min-w-[108px] px-2 whitespace-nowrap">
          {ctx.canCheck ? 'Check' : <>Call <span className="tabular-nums">{money(ctx.callAmount)}</span></>}
        </button>
        <button data-testid="action-raise" disabled={disabled} onClick={onRaise}
          onMouseEnter={() => ctx.setHoveredAction('Raise')} onMouseLeave={() => ctx.setHoveredAction(null)}
          className="saloon-btn saloon-btn-raise flex-1 min-w-[108px] px-2">Raise ▸</button>
      </div>
    );
  }

  return (
    <div data-testid="action-panel" className="relative z-[450] flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 min-h-[18px] px-1 text-[13px] text-[#d8c9a8] font-semibold">
        <span className="truncate">{status}</span>
      </div>
      {ctx.isUserTurn && !ctx.isShowdown && ctx.settings.enableTimer && (
        <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden" data-testid="turn-timer">
          <div className={`h-full transition-[width] duration-1000 ease-linear ${ctx.turnTimeLeft < 5 ? 'bg-red-500' : 'bg-[#c9a45c]'}`} style={{ width: `${(ctx.turnTimeLeft / ctx.turnDuration) * 100}%` }} />
        </div>
      )}
      {body}
    </div>
  );
}

function RaiseSheet({ ctx, t, onClose }: { ctx: SaloonCtx; t: Tokens; onClose: () => void }) {
  const u = ctx.user;
  const landscape = t.orient === 'landscape';
  const clampAmt = (a: number) => Math.min(u?.chips || 0, Math.max(ctx.sliderMin, a));
  const presets: [string, number][] = [
    ['Min', ctx.sliderMin],
    ['½ Pot', Math.floor(ctx.pot * 0.5)],
    ['Pot', ctx.pot],
    ['2× Pot', ctx.pot * 2],
  ];
  const sheetStyle: CSSProperties = landscape
    ? { top: 0, bottom: 0, right: 0, width: Math.max(t.sideW, 300), paddingRight: 'max(12px, env(safe-area-inset-right))' }
    : { left: 0, right: 0, bottom: 0, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' };
  return (
    <>
      <div className="fixed inset-0 z-[455] bg-black/45" onClick={onClose} />
      <motion.div
        data-testid="raise-sheet"
        role="dialog"
        aria-label="Raise"
        initial={landscape ? { x: 40, opacity: 0 } : { y: 40, opacity: 0 }}
        animate={landscape ? { x: 0, opacity: 1 } : { y: 0, opacity: 1 }}
        exit={landscape ? { x: 40, opacity: 0 } : { y: 40, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className={`fixed z-[460] saloon-plate p-3 flex flex-col gap-3 ${landscape ? 'rounded-l-2xl justify-center overflow-y-auto' : 'rounded-t-2xl'}`}
        style={sheetStyle}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#d8c9a8]">Raise to</span>
            <span data-testid="raise-amount" className="text-[26px] font-mono font-extrabold text-[#e9c46a] tabular-nums">{money(ctx.betAmount)}</span>
          </div>
          <button aria-label="Close raise" onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/5"><X className="w-6 h-6" /></button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {presets.map(([label, amt]) => {
            const v = clampAmt(amt);
            const sel = Math.abs(ctx.betAmount - v) < 1;
            return (
              <button key={label} data-testid={`preset-${label}`} onClick={() => { ctx.click(); ctx.setBetAmount(v); }}
                className={`min-h-[44px] min-w-[64px] rounded-lg text-[15px] font-bold ${sel ? 'bg-[#e9c46a] text-[#1b1208]' : 'bg-black/40 text-[#f4ecd8] border border-[#c9a45c]/40'}`}>
                {label}
              </button>
            );
          })}
        </div>
        <div className="px-1 [&_[data-slot=slider-thumb]]:size-7 [&_[data-slot=slider-track]]:h-2.5">
          <Slider
            value={[ctx.betAmount]}
            min={ctx.sliderMin}
            max={ctx.sliderMax}
            step={1}
            onValueChange={(val) => ctx.setBetAmount(Array.isArray(val) ? val[0] : (val as number))}
            className="w-full py-2"
          />
          <div className="flex justify-between text-[12px] text-[#d8c9a8] tabular-nums mt-1">
            <span>{money(ctx.sliderMin)}</span><span>{money(ctx.sliderMax)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button data-testid="action-allin" onClick={() => { onClose(); ctx.allIn(); }}
            onMouseEnter={() => ctx.setHoveredAction('All-In')} onMouseLeave={() => ctx.setHoveredAction(null)}
            className="saloon-btn saloon-btn-fold flex-1 min-w-[108px] px-2 whitespace-nowrap">All in</button>
          <button data-testid="action-raise-confirm" onClick={() => { onClose(); ctx.raise(); }}
            className="saloon-btn saloon-btn-raise flex-[1.4] min-w-[108px] px-2 whitespace-nowrap">Raise <span className="tabular-nums">{money(ctx.betAmount)}</span></button>
        </div>
      </motion.div>
    </>
  );
}

/* ───────────────────────── Root ───────────────────────── */

export function SaloonTable({ ctx, containerRef }: { ctx: SaloonCtx; containerRef: RefObject<HTMLDivElement | null> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(rootRef);
  const t = getTokens(w || 390, h || 844);
  const [fanOpen, setFanOpen] = useState(false);
  const [fanPlayerId, setFanPlayerId] = useState<string | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const captions = useSeatCaptions(ctx.players, ctx.logs, ctx.phase, ctx.winners);

  // Fan: collapse on a new hand, and when the turn clock is about to run out.
  useEffect(() => { setFanOpen(false); setRaiseOpen(false); setFanPlayerId(null); }, [ctx.handCount]);
  useEffect(() => {
    if (fanOpen && ctx.isUserTurn && ctx.settings.enableTimer && ctx.turnTimeLeft < 5) setFanOpen(false);
  }, [fanOpen, ctx.isUserTurn, ctx.turnTimeLeft, ctx.settings.enableTimer]);
  useEffect(() => { if (!ctx.isUserTurn || ctx.isShowdown) setRaiseOpen(false); }, [ctx.isUserTurn, ctx.isShowdown]);
  useEffect(() => {
    if (!raiseOpen && !menuOpen && !logOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setRaiseOpen(false); setMenuOpen(false); setLogOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [raiseOpen, menuOpen, logOpen]);

  const openRaise = () => {
    ctx.click();
    ctx.setBetAmount(Math.min(ctx.sliderMax, Math.max(ctx.sliderMin, ctx.betAmount)));
    setRaiseOpen(true);
  };
  const openFan = () => { ctx.click(); setFanOpen(true); };
  const portrait = t.orient === 'portrait';

  return (
    <div
      ref={rootRef}
      data-testid="saloon-root"
      data-orient={t.orient}
      className={`saloon-bg room-${roomLight(ctx.settings.theme)} absolute inset-0 z-[20] flex flex-col text-[#f4ecd8] select-none`}
      style={{ ...tokenStyle(t), paddingTop: 'env(safe-area-inset-top)' }}
    >
      <TopBar ctx={ctx} t={t} onMenu={() => { ctx.click(); setMenuOpen(true); }} />

      {portrait ? (
        <>
          <div className="flex-1 min-h-0 flex px-1" style={{ pointerEvents: ctx.isPaused ? 'none' : 'auto' }}>
            <TableArea ctx={ctx} t={t} areaRef={containerRef} onLog={() => setLogOpen(true)} captions={captions} onOpenSeat={id => { ctx.click(); setFanPlayerId(id); }} />
          </div>
          <div data-testid="hero-row" className="shrink-0 flex items-center gap-2 px-2 pt-2" style={{ paddingLeft: 'max(8px, env(safe-area-inset-left))', paddingRight: 'max(8px, env(safe-area-inset-right))' }}>
            <HeroPlate ctx={ctx} t={t} cap={captions[ctx.user?.id || '']} />
            <HeroStack ctx={ctx} t={t} onOpen={openFan} />
          </div>
          <div className="shrink-0 px-2 pt-1.5" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))', paddingLeft: 'max(8px, env(safe-area-inset-left))', paddingRight: 'max(8px, env(safe-area-inset-right))' }}>
            <ActionPanel ctx={ctx} t={t} vertical={false} onRaise={openRaise} />
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 flex" style={{ paddingLeft: 'env(safe-area-inset-left)', pointerEvents: ctx.isPaused ? 'none' : 'auto' }}>
            <TableArea ctx={ctx} t={t} areaRef={containerRef} onLog={() => setLogOpen(true)} captions={captions} onOpenSeat={id => { ctx.click(); setFanPlayerId(id); }} />
          </div>
          <div data-testid="side-column" className="shrink-0 flex flex-col justify-between gap-2 py-1.5 pl-1"
            style={{ width: t.sideW, paddingRight: 'max(8px, env(safe-area-inset-right))', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
            <div data-testid="hero-row" className="flex items-center gap-2">
              <HeroStack ctx={ctx} t={t} onOpen={openFan} />
              <HeroPlate ctx={ctx} t={t} cap={captions[ctx.user?.id || '']} />
            </div>
            <ActionPanel ctx={ctx} t={t} vertical onRaise={openRaise} />
          </div>
        </div>
      )}

      <AnimatePresence>{fanOpen && <FanOverlay ctx={ctx} t={t} onClose={() => setFanOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{fanPlayerId && ctx.players.find(p => p.id === fanPlayerId) && <FanOverlay ctx={ctx} t={t} player={ctx.players.find(p => p.id === fanPlayerId)} onClose={() => setFanPlayerId(null)} />}</AnimatePresence>
      <AnimatePresence>{raiseOpen && <RaiseSheet ctx={ctx} t={t} onClose={() => setRaiseOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{menuOpen && <MenuSheet ctx={ctx} t={t} onClose={() => setMenuOpen(false)} onLog={() => setLogOpen(true)} />}</AnimatePresence>
      <AnimatePresence>{logOpen && <LogSheet ctx={ctx} onClose={() => setLogOpen(false)} />}</AnimatePresence>

      {/* Paused */}
      <AnimatePresence>
        {ctx.isPaused && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
            <button data-testid="btn-resume" onClick={ctx.resume} className="pointer-events-auto saloon-btn saloon-btn-call px-8 flex items-center gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <Play className="w-6 h-6 fill-current" />Resume game
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rabbit hunt insight */}
      <AnimatePresence>
        {ctx.isRabbitHuntActive && ctx.rabbitHuntInsight && (() => {
          const parts = ctx.rabbitHuntInsight.split('|');
          const outcome = parts[1] || '';
          const verdict = parts[3] || '';
          const vibe = parts[5] || '';
          const good = verdict.includes('RIGHT') || verdict.includes('DOMINANCE');
          const bad = verdict.includes('PAINFUL') || verdict.includes('TOUGH');
          return (
            <motion.div key="rabbit" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="fixed left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 z-[480] w-[min(92vw,380px)] pointer-events-none">
              <div className="saloon-plate rounded-2xl p-4 flex flex-col items-center gap-2 text-center">
                <span className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#e9c46a]">The outcome</span>
                <p className="text-[13px] text-[#e8dcc0]">{outcome}</p>
                <span className={`px-3 py-1 rounded-lg text-[14px] font-extrabold uppercase ${good ? 'text-green-300 bg-green-900/40' : bad ? 'text-red-300 bg-red-900/40' : 'text-[#e9c46a] bg-black/40'}`}>{verdict}</span>
                <p className="text-[14px] italic saloon-title text-[#f4ecd8]">"{vibe}"</p>
                <span className="text-[12px] text-[#c9b48a]">Based on cards that were never dealt</span>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

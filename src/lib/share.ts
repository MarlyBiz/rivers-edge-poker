/** Share the game link: native share sheet when available, otherwise copy the link. */
export const APP_URL = 'https://poker.marlylabs.app';
export const SHARE_DATA = {
  title: "River's Edge Poker",
  text: "Texas Hold'em at a saloon table. It all comes down to the river card, and everyone's on the edge.",
  url: APP_URL,
};
export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'failed';

export async function shareApp(nav: Navigator = navigator): Promise<ShareResult> {
  if (typeof nav.share === 'function') {
    try { await nav.share(SHARE_DATA); return 'shared'; }
    catch (e: any) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  try { await nav.clipboard.writeText(APP_URL); return 'copied'; }
  catch { return 'failed'; }
}

/** Saloon-styled toast (plain DOM so any screen — setup, table menu — can use it). */
export function showShareToast(msg: string) {
  if (typeof document === 'undefined') return;
  document.querySelector('[data-testid=share-toast]')?.remove();
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.dataset.testid = 'share-toast';
  el.textContent = msg;
  el.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:30002;padding:10px 18px;border-radius:999px;background:linear-gradient(180deg,#f2d27e,#b8862f);border:1px solid #7a5a22;color:#1b1208;font:700 14px/1.2 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.6);max-width:calc(100vw - 32px);text-align:center';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/** Share with the copy-link fallback + toast. */
export async function shareWithToast() {
  const r = await shareApp();
  if (r === 'copied') showShareToast('Link copied: poker.marlylabs.app');
  else if (r === 'failed') showShareToast(`Copy this link: ${APP_URL}`);
  return r;
}

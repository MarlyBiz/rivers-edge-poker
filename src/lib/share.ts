/** Share the game link: native share sheet when available, otherwise copy the link. */
export const APP_URL = 'https://poker.marlylabs.app';
export const SHARE_DATA = {
  title: "River's Edge Poker",
  text: "Play River's Edge Poker: premium Texas Hold'em in your browser. Install it to your home screen.",
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

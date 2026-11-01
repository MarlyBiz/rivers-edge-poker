/**
 * Install + Share buttons (same behaviour as Gig Efficiency Tracker):
 *  - Install: the browser's install prompt when offered; on iPhone/iPad/Safari, step-by-step
 *    "Add to Home Screen" instructions; elsewhere, where to find Install in the browser menu.
 *    Hidden once the game runs as an installed app.
 *  - Share: native share sheet, else copies the link and shows a toast.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share2, Share, X, PlusSquare, MoreVertical } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { APP_URL, shareApp } from '../lib/share';

const btn = 'pointer-events-auto flex items-center gap-1.5 h-9 px-3 rounded-full border border-[#d4af37]/40 bg-black/70 backdrop-blur text-[#f5e492] text-[11px] font-black uppercase tracking-[0.12em] shadow-lg active:scale-95 transition-transform cursor-pointer';

export function AppActions() {
  const { isInstallable, isInstalled, isIOS, isSafari, isMac, install } = usePWAInstall();
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); }, [toast]);

  const onInstall = async () => {
    if (isInstallable && await install()) return;
    if (!isInstallable) setHelp(true);
  };
  const onShare = async () => {
    const r = await shareApp();
    if (r === 'copied') setToast('Link copied: poker.marlylabs.app');
    else if (r === 'failed') setToast(`Copy this link: ${APP_URL}`);
  };
  const apple = isIOS || isSafari;

  return (
    <>
      <div className="fixed top-3 right-3 z-[30000] flex items-center gap-2 pointer-events-none" style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }} data-testid="app-actions">
        {!isInstalled && (
          <button onClick={onInstall} className={btn} aria-label="Install app" title="Install River's Edge Poker">
            <Download className="w-3.5 h-3.5" /><span>Install</span>
          </button>
        )}
        <button onClick={onShare} className={btn} aria-label="Share app" title="Share this game">
          <Share2 className="w-3.5 h-3.5" /><span>Share</span>
        </button>
      </div>

      {help && createPortal(
        <div className="fixed inset-0 z-[30001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setHelp(false)} role="dialog" aria-label="Install instructions">
          <div className="w-full max-w-sm rounded-2xl border border-[#d4af37]/30 bg-[#111] p-5 text-left text-zinc-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black uppercase tracking-tight text-[#f5e492]">Install River's Edge</h3>
              <button onClick={() => setHelp(false)} aria-label="Close" className="p-1 text-zinc-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            {apple ? (
              <ol className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><span className="text-[#d4af37] font-black">1.</span> Tap <Share className="w-4 h-4 inline text-[#f5e492]" /> <b>Share</b> in Safari{isMac ? "'s toolbar" : ''}.</li>
                <li className="flex items-center gap-2"><span className="text-[#d4af37] font-black">2.</span> Choose <PlusSquare className="w-4 h-4 inline text-[#f5e492]" /> <b>{isMac ? 'Add to Dock' : 'Add to Home Screen'}</b>.</li>
                <li className="flex items-center gap-2"><span className="text-[#d4af37] font-black">3.</span> Tap <b>Add</b>. Launch it from your {isMac ? 'Dock' : 'home screen'} for full screen play.</li>
              </ol>
            ) : (
              <ol className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><span className="text-[#d4af37] font-black">1.</span> Open the browser menu <MoreVertical className="w-4 h-4 inline text-[#f5e492]" />.</li>
                <li className="flex items-center gap-2"><span className="text-[#d4af37] font-black">2.</span> Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
                <li className="text-xs text-zinc-400">On a computer, use the install icon at the right of the address bar (Chrome or Edge).</li>
              </ol>
            )}
          </div>
        </div>,
        document.body
      )}
      {toast && createPortal(
        <div role="status" data-testid="share-toast" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[30002] px-4 py-2 rounded-full bg-[#d4af37] text-black text-xs font-black shadow-lg">{toast}</div>,
        document.body
      )}
    </>
  );
}

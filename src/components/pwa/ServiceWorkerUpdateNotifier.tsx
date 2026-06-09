import { useEffect } from 'react';
import { toast } from 'sonner';

// Listens for the gw-sw-update-ready window event dispatched by the SW
// registration script in index.html. Shows a sonner toast with a Reload
// action; on click, posts SKIP_WAITING to the waiting service worker so it
// takes control, then reloads the page. The user — not the SW lifecycle —
// decides when the reload happens.
export function ServiceWorkerUpdateNotifier() {
  useEffect(() => {
    let shown = false;
    const onReady = async () => {
      if (shown) return;
      const reg = await navigator.serviceWorker?.getRegistration('/');
      if (!reg?.waiting) return;
      shown = true;
      toast.message('A new version of GleeWorld is ready', {
        description: 'Reload when you reach a stopping point.',
        duration: Infinity,
        action: {
          label: 'Reload',
          onClick: () => {
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
            navigator.serviceWorker.addEventListener(
              'controllerchange',
              () => window.location.reload(),
              { once: true }
            );
          },
        },
      });
    };
    window.addEventListener('gw-sw-update-ready', onReady);
    return () => window.removeEventListener('gw-sw-update-ready', onReady);
  }, []);
  return null;
}

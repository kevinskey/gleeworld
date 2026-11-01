// Device profile signals for adaptive UI. Specifically:
//   • isIpadLike — large-screen touch device (iPad, Android tab in landscape).
//     Used to give tools sheets more room and surface book/two-page mode.
//   • isLandscape — width > height, recomputed on resize.
//   • pixelRatio — clamped devicePixelRatio for hi-DPI canvas rendering.
//
// Avoids userAgent sniffing where possible (it's lied about for years).
// We combine pointer:coarse + min screen edge + iOS UA fallback because
// iPadOS 13+ reports as desktop Safari in `navigator.userAgent` to defeat
// mobile-only sites.

import { useEffect, useState } from 'react';

/** Which reader layout to use. Decided by viewport + pointer, not by UA
 *  sniffing, so a wide desktop browser gets the side-nav layout too (it used
 *  to fall into the phone layout because it isn't an iPad). */
export type ViewerLayout = 'phone' | 'tablet' | 'desktop';

interface DeviceProfile {
  layout: ViewerLayout;
  isIpadLike: boolean;
  isLandscape: boolean;
  pixelRatio: number;
  isApplePencilCapable: boolean;
}

function detect(): DeviceProfile {
  if (typeof window === 'undefined') {
    return { layout: 'desktop', isIpadLike: false, isLandscape: false, pixelRatio: 1, isApplePencilCapable: false };
  }
  const ua = navigator.userAgent;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const minEdge = Math.min(w, h);
  const maxEdge = Math.max(w, h);
  const isMacWithTouch = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const isIpadByUA = /iPad/i.test(ua) || isMacWithTouch;
  const isIpadLike =
    isIpadByUA ||
    (hasCoarsePointer && maxEdge >= 1000 && minEdge >= 700);
  const layout: ViewerLayout =
    w < 768 ? 'phone'
    : (w >= 1280 && !hasCoarsePointer && !isIpadByUA) ? 'desktop'
    : 'tablet';
  return {
    layout,
    isIpadLike,
    isLandscape: w > h,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 3),
    // Apple Pencil only appears on iPad. We can't sniff its presence
    // before the first pen event, but flagging iPad-likely lets us
    // pre-enable the always-on Pencil affordance.
    isApplePencilCapable: isIpadByUA,
  };
}

export function useDeviceProfile(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(detect);
  useEffect(() => {
    const update = () => setProfile(detect());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const mql = window.matchMedia?.('(pointer: coarse)');
    mql?.addEventListener?.('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      mql?.removeEventListener?.('change', update);
    };
  }, []);
  return profile;
}

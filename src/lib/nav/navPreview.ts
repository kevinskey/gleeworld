// Nav-preview override for tenant super-admins.
//
// A super-admin can turn on "Preview as <role>" from Workspace
// Settings → Navigation to see what a lower-privilege user's sidebar
// would look like without signing out. The preview role is persisted
// in sessionStorage (auto-clears on tab close so a super-admin never
// gets trapped with a hidden Settings link across sessions) and
// broadcast via a change event so hooks re-render immediately.

import { useSyncExternalStore } from 'react';
import type { NavRole } from './navCatalog';

const KEY = 'gw_nav_preview_role';
const EVENT = 'gw:nav-preview-changed';

export function getPreviewRole(): NavRole | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return raw as NavRole;
  } catch { return null; }
}

export function setPreviewRole(role: NavRole | null): void {
  try {
    if (role) sessionStorage.setItem(KEY, role);
    else sessionStorage.removeItem(KEY);
  } catch { /* private mode / quota — ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** React hook — returns the current preview role, re-renders on change. */
export function usePreviewRole(): NavRole | null {
  return useSyncExternalStore(subscribe, getPreviewRole, () => null);
}

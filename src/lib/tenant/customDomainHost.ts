import { Capacitor } from '@capacitor/core';

const ROOT_DOMAIN = 'gleeworld.org';

// Hosts the dev server and the native shell run on. Neither is a branded
// domain, and both would otherwise match "isn't gleeworld.org, must be
// custom" — which would hand every local dev session and every iOS launch
// the public site instead of the app.
const NON_BRANDED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

/**
 * Is this host a tenant's own branded domain, rather than a gleeworld.org
 * host, a dev server, or the native shell?
 *
 * Deliberately a negative test. We cannot ask the DB before the first
 * render — `/` has to decide what to show synchronously — and the set of
 * custom domains is open-ended, so "anything that is not one of ours" is
 * the only rule that stays correct as tenants add domains.
 */
export function isCustomDomainHost(host: string, isNative = Capacitor.isNativePlatform()): boolean {
  if (isNative) return false;
  const h = (host || '').trim().toLowerCase().replace(/:\d+$/, '');
  if (!h) return false;
  if (NON_BRANDED_HOSTS.has(h)) return false;
  if (h === ROOT_DOMAIN || h.endsWith(`.${ROOT_DOMAIN}`)) return false;
  return true;
}

// Maps asset_id → signed Spaces URL. The editor pre-warms this map
// before calling engine.loadSession() so synchronous clip scheduling
// can pull URLs without awaiting. Signed URLs expire after ~1 hour;
// the editor re-warms on long-idle sessions.

const cache = new Map<string, string>();

export function setAssetUrl(assetId: string, url: string): void {
  cache.set(assetId, url);
}
export function getAssetUrlSync(assetId: string): string | undefined {
  return cache.get(assetId);
}
export function clearAssetUrls(): void {
  cache.clear();
}

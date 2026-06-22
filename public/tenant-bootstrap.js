// No-op bootstrap. Per-subdomain nginx vhosts overwrite this with a real
// `window.__TENANT_CONFIG__ = { tenant, org, ... }` for web hits. Capacitor
// iOS bundles this no-op so the `<script>` tag in index.html doesn't 404 —
// `/native-boot.js` then restores the cached tenant config from
// `localStorage.gw_native_tenant` (written by syncNativeTenant after login).

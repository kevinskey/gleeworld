// Native (Capacitor) tenant restore. On the web each tenant subdomain's nginx
// vhost serves its own /tenant-bootstrap.js; the bundled native app has no
// subdomain, so we restore the tenant config cached after the last login.
// No-op in browsers.
(function () {
  var isNative =
    location.protocol === 'capacitor:' ||
    location.protocol === 'ionic:' ||
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if (!isNative || window.__TENANT_CONFIG__) return;
  try {
    var raw = localStorage.getItem('gw_native_tenant');
    if (raw) window.__TENANT_CONFIG__ = JSON.parse(raw);
  } catch (e) { /* corrupt cache — start tenantless */ }
})();

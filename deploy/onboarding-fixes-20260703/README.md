# Onboarding fixes — droplet-side deploy bundle (2026-07-03)

Patched copies of the two provisioning services plus the one-shot deploy
script. The SPA changes are in this branch's normal source tree.

- `superadmin-server.js` → /opt/gleeworld-superadmin/server.js
- `webhook-server.js` → /opt/gleeworld-provision-webhook/server.js
- `deploy-onboarding-fixes.sh` — runs everything: JWT hook migration,
  service deploy (with backups), Stripe tier-metadata fix + Conservatory
  payment link, SPA rsync (no --delete), end-to-end provision/verify/delete
  test. Edit the SRC/HERE paths at the top if not running from the original
  scratchpad layout.

What changed and why: see the commit messages on this branch and the
onboarding audit artifact.

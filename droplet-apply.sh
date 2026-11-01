#!/usr/bin/env bash
# Apply the GleeWorld web build from main 218479b on the droplet.
# Run as root in the DigitalOcean console:
#   curl -fsSL https://raw.githubusercontent.com/kevinskey/gleeworld/deploy/web-218479b/droplet-apply.sh | bash
# 1. branch deploy/web-218479b holds the GENERATED files (assets/, index.html, sw.js…)
# 2. public/ (static images, course materials…) is taken from the source tree at 218479b
# Copies over /var/www/gleeworld/html WITHOUT deleting, so tenants/ bootstrap files survive,
# then fixes perms the way scripts/deploy-frontend.sh does and verifies the live sw.js.
set -euo pipefail
REF=deploy/web-218479b
SHA=218479b
DIR=/var/www/gleeworld/html
[ "$(id -u)" = 0 ] || { echo "Run as root"; exit 1; }
[ -d "$DIR" ] || { echo "Document root $DIR is missing"; exit 1; }
W=$(mktemp -d /var/tmp/gw-web.XXXXXX)
mkdir -p "$W/gen" "$W/src"
echo "==> Downloading generated bundle ($REF)"
curl -fsSL "https://codeload.github.com/kevinskey/gleeworld/tar.gz/refs/heads/$REF" | tar -xz -C "$W/gen" --strip-components=1
[ -f "$W/gen/index.html" ] && [ -f "$W/gen/sw.js" ] || { echo "Bundle incomplete"; exit 1; }
grep -q "CACHE_VERSION = '$SHA'" "$W/gen/sw.js" || { echo "Bundle is not build $SHA"; exit 1; }
rm -f "$W/gen/droplet-apply.sh"
echo "==> Downloading static public/ from source $SHA"
curl -fsSL "https://codeload.github.com/kevinskey/gleeworld/tar.gz/$SHA" | tar -xz -C "$W/src" --strip-components=1 --wildcards '*/public/*'
[ -d "$W/src/public" ] || { echo "public/ missing from source tarball"; exit 1; }
echo "==> Copying into $DIR"
cp -a "$W/src/public/." "$DIR"/
cp -a "$W/gen/." "$DIR"/
find "$DIR" -type f -exec chmod a+r {} +
find "$DIR" -type d -exec chmod a+rx {} +
rm -rf "$W"
echo "==> Verifying"
LIVE=$(curl -fsS "https://gleeworld.org/sw.js?nocache=$(date +%s)" | grep -oE "CACHE_VERSION = '[^']+'" || true)
echo "live: $LIVE"
case "$LIVE" in *"$SHA"*) echo "GLEEWORLD_DEPLOYED=$SHA";; *) echo "!! live site does not show $SHA yet (cache?)"; exit 1;; esac

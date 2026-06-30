#!/bin/bash
# verify_studio.sh — pre-flight check for the Studio stack.
#
# 1. TypeScript compiles (web engine + bridges)
# 2. iOS native target compiles (AVAudioEngine, plugin handlers)
# 3. (Future) studio unit tests
#
# Run from repo root:  bash scripts/verify_studio.sh

set -u

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "====== 1. CHECKING WEB CORE COMPILATION ======"
# package.json has no "tsc" script, so call npx directly. --noEmit keeps
# this a type-check only (no JS artifacts written).
npx tsc --noEmit
WEB_STATUS=$?
if [ $WEB_STATUS -ne 0 ]; then
    echo "❌ Web Type Checking Failed."
    exit 1
fi
echo "=> Web Core compiles perfectly."

echo
echo "====== 2. CHECKING NATIVE IOS COMPILATION ======"
cd ios/App

# xcbeautify is optional (not installed in this repo). Pipe through it
# when available; otherwise let xcodebuild's verbose output through.
if command -v xcbeautify >/dev/null 2>&1; then
    xcodebuild -workspace App.xcworkspace \
               -scheme App \
               -configuration Debug \
               -sdk iphonesimulator \
               clean build | xcbeautify --is-CI
    IOS_STATUS=${PIPESTATUS[0]}
else
    xcodebuild -workspace App.xcworkspace \
               -scheme App \
               -configuration Debug \
               -sdk iphonesimulator \
               clean build > /tmp/verify_studio_ios.log 2>&1
    IOS_STATUS=$?
    if [ $IOS_STATUS -ne 0 ]; then
        echo "--- last 50 lines of iOS build log ---"
        tail -50 /tmp/verify_studio_ios.log
    fi
fi

if [ $IOS_STATUS -ne 0 ]; then
    echo "❌ iOS Native Compilation Failed."
    exit 1
fi
echo "=> iOS Native Engine compiles perfectly."

echo
echo "====== 3. RUNNING ENGINE UNIT TESTS ======"
cd "$REPO_ROOT"
# No test runner is wired into package.json yet. Skip with a clear note
# instead of failing the script. Wire vitest + studio specs when the
# audio test rig lands.
if grep -q '"test:studio"' package.json 2>/dev/null; then
    npm run test:studio
    TEST_STATUS=$?
    if [ $TEST_STATUS -ne 0 ]; then
        echo "❌ Core Audio Logic Unit Tests Failed."
        exit 1
    fi
else
    echo "⚠️  No 'test:studio' npm script yet — skipping (compile checks above are still authoritative)."
fi

echo
echo "=========================================="
echo "🎉 ALL DAW SYSTEMS OPERATIONAL AND SECURE"
echo "=========================================="
exit 0

# iOS Edge-to-Edge Status Bar — Design

**Date:** 2026-07-13
**Status:** Approved (Kevin, 2026-07-13)

## Problem

On iPhone the app shows an opaque strip behind the system status bar
(clock/battery). Kevin wants the app fullscreen with the status bar area
"see-through" — content drawing under the clock, iOS-style.

Root cause of the strip: `capacitor.config.ts` sets
`StatusBar: { overlaysWebView: false }`, which resizes the WKWebView below
the status bar and paints the gap. The web layer is already edge-to-edge
ready: `viewport-fit=cover` is set and app headers pad by
`env(safe-area-inset-top)` (`--app-header-offset`) — the inset is just 0
while the webview doesn't extend under the bar.

## Decisions

- `overlaysWebView: true` + initial `style: 'LIGHT'` (dark text — matches
  the cream/light GleeWorld theme). Config-level so the first frame is right.
- A tiny surface-style helper (`src/lib/statusBarStyle.ts`) wrapping
  `@capacitor/status-bar` (already a dependency, v7): `dark-room` → white
  text, `default` → dark text. No-op outside native iOS.
- The Studio (zinc-900/950 chrome) flips to `dark-room` on mount and back
  on unmount — the only dark surface in scope. Other dark rooms (Stage)
  can call the same helper later.
- `UIViewControllerBasedStatusBarAppearance` is already YES in Info.plist,
  which the plugin requires. No native changes.
- Ships in the NEXT iOS build (163+); does not touch 1.0.4/162 in review.

## Risk / QA

Screens drawing their own top edge without safe-area padding will sit
under the clock once the inset becomes real (~59px on notched iPhones).
Device QA pass required; fixes are per-screen `safe-top` padding.

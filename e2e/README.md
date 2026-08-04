# GleeWorld end-to-end (Playwright)

Headless Chrome harness for regression tests of runtime behavior that
code review can't reach — audio elements actually loading, private-bucket
URLs actually serving, redirects firing, dialogs mounting.

## One-time install

```bash
npm install --legacy-peer-deps -D @playwright/test playwright-core
npx playwright install chrome
```

Uses system Chrome via `channel: 'chrome'` (no download). `--legacy-peer-deps`
is required because the existing tree has peer conflicts.

## Run against a local preview

```bash
npm run build
npm run preview -- --port 4199 --strictPort &
npx playwright test
```

Default `PLAYWRIGHT_BASE_URL` is `http://localhost:4199`.

## Run against prod (demo tenant)

```bash
PLAYWRIGHT_BASE_URL=https://demo.gleeworld.org npx playwright test
```

Uses `demo@gleeworld.org` / `GleeDemo2026!` — override with
`GW_E2E_EMAIL` / `GW_E2E_PASSWORD` env vars.

**Cleanup:** every test that creates a session deletes it at the end.
The demo tenant is public (App Store reviewers land there), so leaving
sessions behind clutters it. Don't disable the delete step.

## Watch it run (debug)

```bash
HEADED=1 npx playwright test --headed
```

## What's covered today

`e2e/studio-part-tracks.spec.ts` — the Studio + Part Tracks merge:

- New-session dialog exposes the three-card picker (Empty / Voice Parts / Custom).
- Voice Parts (SATB) template seeds all four voice tracks (Soprano/Alto/Tenor/Bass).
- Uploaded accompaniment file returns a URL that actually serves (guards
  against the private-bucket 403 regression).
- Attach-score dialog opens and queries `gw_sheet_music`.
- Legacy `/dashboard/part-tracks/*` redirects to `/studio` with the toast.

Chrome flags in `playwright.config.ts` fake the mic
(`--use-fake-device-for-media-stream`) so record flows can run without a
real microphone.

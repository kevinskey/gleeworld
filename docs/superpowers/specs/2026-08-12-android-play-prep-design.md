# Android Google Play First-Release Prep — Design

**Date:** 2026-08-12
**Status:** Approved by Kevin (brainstorming session); executed same day
**Deliverable:** signed release AAB + manual Play Console first-release checklist

## Decisions (Kevin, 2026-08-12)

1. **Scope:** signed AAB + upload checklist. Fastlane Play-push automation (service
   account) deferred; the first release must be uploaded manually in the Play Console
   web UI anyway (Google rejects the very first API push).
2. **No push notifications in v1.** No `google-services.json` exists; the gradle
   google-services plugin applies conditionally, so the build succeeds and everything
   except push works. Firebase/FCM is a follow-up build.
3. **Build path:** the repo's existing `fastlane bundle` lane (npm build → cap sync →
   `gradle clean bundleRelease`), signed with the upload keystore at
   `~/.android/gleeworld-upload.keystore` via git-ignored `android/keystore.properties`.

## What shipped

- `android/app/build.gradle`: versionName `1.0` → `1.0.6` (matches iOS), versionCode
  `3` → `4`.
- **Fastfile fix:** fastlane executes `sh` from `android/fastlane/`, so the bundle
  lane's `cd ..` landed in `android/` where Capacitor sees no project root —
  `npx cap sync android` failed with "android platform has not been added yet."
  Both steps now `cd ../..`. (The gradle step was unaffected; it runs via the
  `gradle` action with the lane's JAVA_HOME=openjdk@21 / ANDROID_HOME=~/android-sdk.)
- Built AAB verified: `jar verified.` against the upload keystore; 566 web asset
  files present incl. Prayer + My World chunks; `CACHE_VERSION = '2e1337041'` =
  main tip at build time. Artifact copied to `~/Desktop/GleeWorld-1.0.6-vc4.aab`.

## First-release checklist (Kevin, Play Console web UI)

1. play.google.com/console → Create app — name **GleeWorld**, App (not game), Free.
2. **Internal testing** track first: upload `GleeWorld-1.0.6-vc4.aab`, add your
   Google account as a tester, smoke-test on a device.
3. Store listing: short + full description (drafts below), screenshots (phone
   required, 7-inch/10-inch tablet optional), 512×512 icon, 1024×500 feature graphic.
4. Privacy policy URL: **https://gleeworld.org/privacy** (live, verified 200).
5. Content rating questionnaire: Utility/Education; no user-generated public
   content visible outside the org; no gambling/violence — expect "Everyone".
6. Data safety form: collects account info (name, email), user content (files,
   audio recordings), photos; encrypted in transit; deletable on request; no
   selling/sharing with third parties; no ads.
7. Target audience: 13+ (school ensembles include minors 13–17; do NOT select
   under-13 — that triggers Families policy review).
8. App access: provide the demo credentials (demo@gleeworld.org / GleeDemo2026!)
   in "App access" so reviewers can sign in.
9. Promote Internal → Production when satisfied. After this first manual release,
   the fastlane `internal` / `beta` / `production` lanes work once a Play service
   account JSON is saved as `android/play-store-service-account.json` (git-ignored).

### Listing copy drafts (tenant-neutral)

Short (≤80 chars): *Your music program's home — scores, practice tracks, classes, and events.*

Full: *GleeWorld is the all-in-one home for school and community music programs.
Students and directors get a shared music library with a full-screen score viewer,
rehearsal part tracks and a practice player, Academy classes with assignments and
attendance, calendars, travel and event planning, a recording studio, and an
assistant that answers questions about your repertoire and schedule. Sign in with
your program's GleeWorld account to get started.*

## Known exclusions

- No push notifications (Firebase deferred — decision 2).
- No Play API automation yet (service account owed; first release is manual).
- Device QA owed on a real Android phone (WebView audio paths especially:
  practice player worklets, studio, assistant TTS).
- versionCode 4 assumes codes 1–3 were never consumed on Play (no app exists in
  the console yet); Play only requires monotonically increasing codes per artifact.

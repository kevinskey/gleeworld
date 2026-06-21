# RecordingLiveActivityExtension — Xcode setup

This folder contains a ready-to-compile Live Activity widget extension for the Part Tracks "now recording" lock-screen banner + Dynamic Island.

The files here cannot self-register — iOS Live Activities **must** live in a separate Widget Extension target. The steps below are the one-time Xcode setup. Everything else (start/update/end) already flows through `RecordingLiveActivityPlugin.swift` in the App target.

---

## One-time Xcode setup

1. Open `ios/App/App.xcworkspace` in Xcode.
2. **File → New → Target…**
3. Choose **Widget Extension** (under iOS → Application Extension).
4. Configure the target:
   - **Product Name:** `RecordingLiveActivityExtension`
   - **Bundle Identifier:** `org.gleeworld.app.RecordingLiveActivity` (auto-filled)
   - **Language:** Swift
   - ✅ **Include Live Activity** — check this box.
   - ❌ Include Configuration Intent — leave unchecked.
5. Click **Finish.** When prompted to activate the new scheme, click **Cancel** (the App scheme will keep both targets compiled).

Xcode will create a starter folder with auto-generated files. **Delete the auto-generated `<Extension>LiveActivity.swift`, `<Extension>Bundle.swift`, and `<Extension>.swift`** — we're replacing them with the curated versions in this folder.

## Wire the curated files into the new target

In Xcode's **Project Navigator**:

1. **Right-click the `RecordingLiveActivityExtension` group → Add Files to "App"…**
2. Select **all** of:
   - `ios/App/RecordingLiveActivityExtension/RecordingLiveActivityBundle.swift`
   - `ios/App/RecordingLiveActivityExtension/RecordingLiveActivityWidget.swift`
   - `ios/App/RecordingLiveActivityExtension/Info.plist` *(replace the auto-generated one)*
3. In the **Add to targets** checkbox at the bottom, check **only** `RecordingLiveActivityExtension` (uncheck `App`).

Then add the **shared** attributes file to **both** targets:

1. **Right-click the project → Add Files to "App"…**
2. Select `ios/App/Shared/GleeWorldRecordingAttributes.swift`.
3. In the **Add to targets** checkbox, check **both** `App` **and** `RecordingLiveActivityExtension`.

   This is critical — the activity payload the app encodes has to deserialize to the exact same Swift type the widget renders.

## Build settings

In the `RecordingLiveActivityExtension` target's **Build Settings**:

- **iOS Deployment Target:** 16.2 or later (Live Activities require it).
- **Signing & Capabilities → Team:** same as the App target.
- **Bundle Identifier:** must be a prefix-child of the App's bundle ID, e.g. `org.gleeworld.app.RecordingLiveActivity`.

## Verify

1. Build the App scheme. Both targets should compile.
2. Run on a physical iPhone 14 Pro+ (or any iPhone with iOS 16.2+).
3. Start a recording in Part Tracks Studio.
4. Lock the screen — the lock-screen banner should appear.
5. On a Dynamic Island device, swipe the island down to see the expanded view.
6. Stop recording — the banner should fade.

## What you'd customize

The visuals in `RecordingLiveActivityWidget.swift` are intentionally bold and dark so they read as a "tape rolling" tape. If you want to brand them:

- Swap the red accent color for `Color("PrimaryAmber")` after adding an asset catalog entry shared with the App target.
- Replace the `waveform` SF Symbol with a custom symbol added to the asset catalog.
- The lock-screen view uses a black gradient; switch to `Color.gleeNavy.gradient` if you want to match the studio's background.

## Troubleshooting

- **Activity never appears**: Settings → Face ID & Passcode → confirm Live Activities are enabled in lock-screen options. Also confirm the user has Live Activities turned on in Settings → GleeWorld → Live Activities.
- **Widget crashes on launch**: most often the `GleeWorldRecordingAttributes.swift` file was added to only one target. Double-check both targets contain it.
- **Timer doesn't tick**: `Text(timerInterval:)` updates without push, but only inside the widget — make sure you're not pulling `Date()` once into a string at launch. Look for `monospacedDigit()` on every clock-style text.

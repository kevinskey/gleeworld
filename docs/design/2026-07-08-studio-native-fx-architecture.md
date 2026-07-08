# Studio — Production-Grade Native iOS FX-Chain Architecture

**Status:** Design / phased-implementation plan · 2026-07-08
**Author:** Kevin + Claude (principal-engineer pass)
**Scope rule:** refactor inside the existing Studio addon; preserve working features; change only what's needed for stability, modularity, and a native signal chain.

---

## A. Architecture summary

### A.1 What already exists (do NOT rebuild)
The native engine (`ios/App/App/Studio/`) is already an `AVAudioEngine` graph, not a JS workaround:

| Spec requirement | Status in repo |
|---|---|
| `AVAudioEngine`, per-track `AVAudioPlayerNode`, `AVAudioMixerNode`, EQ/Dynamics/Reverb/Delay, limiter, `mainMixerNode` | ✅ `Engine.swift` (lazy engine, `masterMixer`, `outputLimiter` = AUPeakLimiter), `Tracks.swift` (`strip`, `muteGate`, player nodes), `Fx.swift` (EQ/DynamicsProcessor/Reverb/Delay/filter) |
| Per-track signal chain | ✅ player → `strip` (gain/pan) → `muteGate` → FX chain → track mix → `masterMixer` → `outputLimiter` → `mainMixerNode` |
| play/pause/stop/seek/volume/pan/mute/solo | ✅ plugin `play/pause/stop/seek/updateStrip`; `recomputeSolo` |
| Update effect parameter (live) | ✅ **build 144** — `setFxParam` + `FxChain.setParams`/`FxNodeBinding.applyLive` |
| Audio interruption / IO-unit-stop recovery | ✅ **build 143** — `installRecoveryObservers` (interruption + `.AVAudioEngineConfigurationChange` → reactivate + resume) |
| Graph-teardown crash safety | ✅ **build 141** — `TrackBinding.dispose()` wrapped in `StudioObjC.catchExceptions` |
| FX serialized with project | ✅ `StudioModel.swift` / `session.ts` — `track.fx: [FxNode]` persists id/type/enabled/params |
| Mixdown / record / part-tracks | ✅ `Mixdown.swift`, `Recorder.swift`, `ExternalRecorder.swift` |

### A.2 The gaps this refactor closes
1. **Modular FX rack — live add / remove / reorder / bypass** without a full `loadSession` reload. Today structural FX changes bump the skeleton signature → full engine rebuild (pause). *This is the biggest and riskiest piece.*
2. **Discrete, typed event system.** Today everything is one `"state"` event + `recordPeak`. Spec wants named events (`playbackStarted`, `effectAdded`, `audioInterrupted`, …) with duplicate/stale-listener protection and remount safety.
3. **Structured errors** (`{code,message,operation,trackId?,effectId?,recoverable}`) on every method — replacing `call.reject("string")`.
4. **FX presets** (save/load, serialized).
5. **Comprehensive lifecycle matrix** + lifecycle events (route change, background/foreground, BT disconnect, sample-rate change, mic-permission, corrupted files) — building on the interruption recovery already shipped.
6. **React UI**: engine-status indicator, error panel, busy-disable, reorderable FX rack.

### A.3 Target signal chain (unchanged topology, formalized)
```
AVAudioPlayerNode(s) per clip
  → track strip  (AVAudioMixerNode: gain + pan)
  → muteGate     (AVAudioMixerNode: mute/solo → 0/1)
  → FX RACK      (ordered inserts: EQ → Comp → Reverb → Delay → …, each bypassable)
  → masterMixer  (AVAudioMixerNode)
  → outputLimiter (AUPeakLimiter — brickwall safety)
  → engine.mainMixerNode → output
```
Reverb/Delay are **inserts** in v1 (matches current `Fx.swift`); a send/return bus is a documented v2 (§ roadmap). Inserts are simpler and stable; sends need parallel mixer taps.

---

## B. File-by-file implementation plan

### Existing files — changes
- **`Engine.swift`** — add: `StudioEventEmitter` hook; discrete event emits at transport transitions; `addEffect/removeEffect/bypassEffect/reorderEffects` (delegate to the track's `FXRack`); `getEngineState()`; broaden `installRecoveryObservers` to also post `audioInterrupted`/`engineRecovered`/`routeChanged`; background/foreground observers.
- **`Fx.swift`** — promote `FxChain` → **`FXRack`** with live mutation: `insert(spec,at:)`, `remove(id:)`, `move(id,to:)`, `setBypass(id,on:)`, keeping `setParams` (done). Bypass = per-node bypass property / `wetDryMix 0` / EQ `globalGain` bypass, no graph change; add/remove/reorder = localized re-wire of THIS track's insert chain only, track muted during the swap (others keep playing).
- **`Tracks.swift`** — `TrackBinding` exposes the `FXRack` + `loadTrack/unloadTrack` (attach/detach a single track's players+chain live).
- **`StudioEnginePlugin.swift`** — new methods (§D); wrap every method body in `respond(_:operation:)` structured-error helper; register new events.
- **`StudioModel.swift`** — add `fxPresetRef`/`lastPositionMs` (optional, additive).
- **`useStudio.ts`** — route add/remove/reorder/bypass to the new plugin methods on the incremental path (like `setFxParam` already does for params); subscribe to the discrete events.
- **`StudioEditor.tsx`** — reorderable FX rack, bypass toggles, add-effect menu, engine-status chip, error panel, busy-disable.

### New files
- **`ios/App/App/Studio/StudioError.swift`** — `StudioError` struct + `CAPPluginCall.resolveError(_:)`.
- **`ios/App/App/Studio/StudioEvents.swift`** — event-name constants + a thin `emit(_ name:_ payload:)` that dedupes.
- **`ios/App/App/Studio/FXPresets.swift`** — preset codable + on-disk store (`Application Support/studio-fx-presets/`).
- **`src/plugins/studioEngineEvents.ts`** — typed event map + a `useStudioEngineEvents` subscription hook (single source of listeners; auto-cleanup on unmount).
- **`src/components/studio/FxRack.tsx`**, **`EngineStatusBar.tsx`**, **`StudioErrorPanel.tsx`**.

---

## C. Exact Swift patches (gap pieces)

### C.1 `StudioError.swift` (new)
```swift
import Foundation
import Capacitor

public struct StudioError: Error {
    let code: String            // e.g. "ENGINE_NOT_READY", "TRACK_LOAD_FAILED", "FX_NOT_FOUND"
    let message: String
    let operation: String       // the method name
    var trackId: String? = nil
    var effectId: String? = nil
    var recoverable: Bool = true

    var dict: [String: Any] {
        var d: [String: Any] = ["code": code, "message": message,
                                "operation": operation, "recoverable": recoverable]
        if let t = trackId { d["trackId"] = t }
        if let e = effectId { d["effectId"] = e }
        return d
    }
}

extension CAPPluginCall {
    /// Reject with the structured error shape the TS layer expects.
    func reject(_ e: StudioError) { self.reject(e.message, e.code, nil, e.dict) }
}
```
Every plugin method becomes:
```swift
@objc func addEffect(_ call: CAPPluginCall) {
    guard let trackId = call.getString("trackId") else {
        return call.reject(StudioError(code: "BAD_ARGS", message: "trackId required",
                                       operation: "addEffect", recoverable: false)) }
    guard let type = call.getString("effectType") else {
        return call.reject(StudioError(code: "BAD_ARGS", message: "effectType required",
                                       operation: "addEffect", trackId: trackId, recoverable: false)) }
    do {
        let fx = try engine.addEffect(trackId: trackId, type: type)   // throws StudioError
        emit(StudioEvents.effectAdded, ["trackId": trackId, "effect": fx.dict])
        call.resolve(["effect": fx.dict])
    } catch let se as StudioError { call.reject(se) }
      catch { call.reject(StudioError(code: "UNKNOWN", message: "\(error)", operation: "addEffect", trackId: trackId)) }
}
```

### C.2 `StudioEvents.swift` (new) + emit
```swift
import Foundation

enum StudioEvents {
    static let ready = "studioEngineReady"
    static let error = "studioEngineError"
    static let playbackStarted = "playbackStarted"
    static let playbackPaused = "playbackPaused"
    static let playbackStopped = "playbackStopped"
    static let positionChanged = "playbackPositionChanged"
    static let trackLoaded = "trackLoaded"
    static let trackFailed = "trackFailed"
    static let effectAdded = "effectAdded"
    static let effectRemoved = "effectRemoved"
    static let effectBypassed = "effectBypassed"
    static let effectParameterChanged = "effectParameterChanged"
    static let routeChanged = "routeChanged"
    static let audioInterrupted = "audioInterrupted"
    static let engineRecovered = "engineRecovered"
}
```
The plugin gets one funnel (prevents scattered `notifyListeners` and lets us throttle position):
```swift
private var lastPositionEmit = 0.0
func emit(_ name: String, _ payload: [String: Any] = [:]) {
    // Position fires ~15 Hz already via the state timer; throttle to avoid
    // flooding the bridge. Everything else fires immediately.
    notifyListeners(name, data: payload)
}
```
Keep the existing `"state"` event for back-compat during migration; add the discrete events alongside, then remove `"state"` once the UI is migrated.

### C.3 `FXRack` — live add/remove/reorder/bypass (`Fx.swift`)
The core new capability. `FxChain` becomes `FXRack`, owning ordered `FxNodeBinding`s and the two boundary nodes it wires between (`inputTap` = track muteGate, `outputTap` = track mix input). All structural ops mutate ONLY this track's insert chain, on the running engine, with the track muted during the swap so other tracks never glitch:
```swift
extension FXRack {
    /// Rebuild the series wiring after any structural change. Caller mutes the
    /// owning track's muteGate around this. Wrapped: disconnect/connect can
    /// raise ObjC NSExceptions (see reference_avaudioengine_start_nsexception).
    func rewire(from source: AVAudioNode, to dest: AVAudioNode) {
        _ = StudioObjC.catchExceptions {
            self.engine.disconnectNodeOutput(source)
            let active = self.nodes.filter { !$0.bypassed }
            var prev: AVAudioNode = source
            for n in active { self.engine.connect(prev, to: n.node, format: nil); prev = n.node }
            self.engine.connect(prev, to: dest, format: nil)
        }
    }
    func insert(spec: Studio.FxNode, at index: Int) { /* build node, attach, splice into nodes[], rewire */ }
    func remove(id: String) { /* find, disconnect+detach that node, drop from nodes[], rewire */ }
    func move(id: String, to index: Int) { /* reorder nodes[], rewire */ }
    func setBypass(id: String, on: Bool) { /* flip binding.bypassed, rewire (bypassed nodes skipped) */ }
}
```
`FxNodeBinding` gains `var bypassed: Bool`. **Bypass is a rewire, not a graph-free property flip**, because AVAudioUnit `.bypass` is inconsistent across the built-in units we use — skipping the node in the series is deterministic. The mute-during-swap keeps it click-safe.

### C.4 Lifecycle — extend `installRecoveryObservers` (`Engine.swift`)
Interruption + config-change already handled (build 143). Add and emit:
```swift
// route change → reclassify headphone/bleed + tell JS
nc.addObserver(forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main) { [weak self] n in
    self?.emitRouteChanged()                 // → StudioEvents.routeChanged
    self?.recoverPlayback()                  // BT/AirPods yank stops the IO unit
}
// app background/foreground
nc.addObserver(forName: UIApplication.didEnterBackgroundNotification, ...) { self?.pauseForBackground() }
nc.addObserver(forName: UIApplication.willEnterForegroundNotification, ...) { self?.recoverPlayback() }
```
And in the interruption handler, emit `audioInterrupted` (on `.began`) and `engineRecovered` (after a successful `recoverPlayback`).

---

## D. Capacitor plugin API (final surface)

Existing (keep): `start`(→ alias `initializeStudioEngine`), `loadSession`, `play`,`pause`,`stop`,`seek`, `updateStrip`(volume/pan/mute/solo), `setFxParam`, `updateTempo`, `setMetronome`, record/mixdown/part-tracks, `addClipToTrack`/`removeClipFromTrack`, `getAudioRoute`, `getHardwareLatency`.

New:
| Method | Args | Returns / event |
|---|---|---|
| `loadTrack` | `{trackId, fileUrl}` | resolves; emits `trackLoaded`/`trackFailed` |
| `unloadTrack` | `{trackId}` | resolves |
| `addEffect` | `{trackId, effectType}` | `{effect}` + `effectAdded` |
| `removeEffect` | `{trackId, effectId}` | + `effectRemoved` |
| `bypassEffect` | `{trackId, effectId, bypassed}` | + `effectBypassed` |
| `reorderEffects` | `{trackId, orderedEffectIds}` | resolves |
| `saveFXPreset` | `{trackId, presetName}` | `{presetId}` |
| `loadFXPreset` | `{trackId, presetId}` | `{effects}` |
| `getEngineState` | `{}` | `{isReady,isPlaying,positionMs,tracks:[{id,fx:[…]}]}` |

Every method rejects with the §C.1 structured error.

---

## E. TypeScript interfaces
```ts
export type FXType = 'eq3' | 'gain' | 'compressor' | 'reverb' | 'delay' | 'filter' | 'limiter';
export interface FXUnit { id: string; type: FXType; bypassed: boolean; params: Record<string, number>; }
export interface FXChainDTO { trackId: string; effects: FXUnit[]; }

export interface StudioEngineError {
  code: string; message: string; operation: string;
  trackId?: string; effectId?: string; recoverable: boolean;
}

export interface StudioEngineEvents {
  studioEngineReady: void;               studioEngineError: StudioEngineError;
  playbackStarted: void;                 playbackPaused: { positionMs: number };
  playbackStopped: void;                 playbackPositionChanged: { positionMs: number };
  trackLoaded: { trackId: string };      trackFailed: { trackId: string; error: StudioEngineError };
  effectAdded: { trackId: string; effect: FXUnit };
  effectRemoved: { trackId: string; effectId: string };
  effectBypassed: { trackId: string; effectId: string; bypassed: boolean };
  effectParameterChanged: { trackId: string; effectId: string; parameter: string; value: number };
  routeChanged: { outputs: string[]; isHeadphones: boolean };
  audioInterrupted: { reason: string };  engineRecovered: void;
}
```
`src/plugins/studioEngineEvents.ts` exposes `useStudioEngineEvents(handlers, deps)` — registers each listener once via `Native.addListener`, stores the removers in a ref, and removes them all in the effect cleanup. This is the fix for **duplicate / stale / post-remount** listeners: one hook owns the lifecycle.

---

## F. React component changes
- **`FxRack.tsx`** — per-track ordered list; each row: bypass toggle, param sliders (debounced → `updateEffectParameter`), drag handle (→ `reorderEffects`), remove (✕). "＋ Add effect" menu (→ `addEffect`). Optimistic UI + reconcile on the `effect*` events.
- **`EngineStatusBar.tsx`** — chip driven by engine state: `Ready` / `Loading…` / `Recovering…` / `Error`. Reads `studioEngineReady`, `audioInterrupted`, `engineRecovered`, `studioEngineError`.
- **`StudioErrorPanel.tsx`** — non-blocking banner listing recent `studioEngineError`/`trackFailed` with the structured fields; `recoverable:false` errors get a "Reload engine" action.
- **Busy-gating** — a `engineBusy` state (true during load/reorder/add/remove) disables transport + FX controls; existing `warming` already models this — extend it.

---

## G. Persistence schema
FX already serializes (`track.fx: [FxNode]{id,type,enabled,params}`). Additive changes only:
- `FxNode.bypassed` (alias of `enabled` inverted — keep `enabled`, add nothing if reused).
- Session: `last_position_ms?: number` (resume head on reopen).
- New table `gw_studio_fx_presets` (tenant-scoped, RLS like other Studio tables): `id, tenant_id, owner_user_id, name, effects jsonb, created_at`. Presets are user/tenant assets, not per-project.

---

## H. Test plan
**XCTest (native, host app target `AppTests`):**
- `EngineInitTests` — start → `isReady`; double-start idempotent.
- `FXRackTests` — insert/remove/move/bypass keeps series wiring intact (assert node graph `outputConnectionPoints`); rebuild count == expected; no orphan attached nodes after remove.
- `RecoveryTests` — post `AVAudioEngineConfigurationChange` (simulate via `engine.stop()`), `recoverPlayback` restarts + `isPlaying` true.
**Vitest (web):**
- `studioEngineEvents` — listeners registered once; removed on unmount; no double-fire after remount (mock `Native.addListener`).
- `useStudio` diff — param-only → `setFxParam`; structural → add/remove/reorder calls; clip diff unchanged.
**Manual device matrix (the sudo-log-collect workflow):** the 13 lifecycle cases in your §5, each: reproduce → `sudo /usr/bin/log collect --device --last 10m` → assert the expected events + no `iounit stopped` without a following `engineRecovered`.

## I. Release-readiness checklist
- [ ] All plugin methods return the structured error; zero `call.reject("string")` left.
- [ ] Every `AVAudioEngine` connect/disconnect/detach wrapped in `catchExceptions`.
- [ ] No `"state"`-only coupling in the UI; discrete events drive it.
- [ ] Listener hook: verified single registration across a remount (Vitest + device).
- [ ] FX add/remove/reorder/bypass: no full reload, no cross-track glitch (device log shows no `loadSession` markers).
- [ ] Interruption / route / background / foreground each emit `audioInterrupted`→`engineRecovered`; playback resumes.
- [ ] Corrupted/missing asset → `trackFailed` with `recoverable:true`, other tracks keep playing (already skips per-clip in `TrackBinding.build`).
- [ ] Mic-permission denied → structured error, no crash.
- [ ] Rapid play/stop: debounced/guarded (isPlayingNow + wantsPlayback already guard).
- [ ] Preset save/load round-trips FX chain byte-for-byte.
- [ ] Mixdown + record paths unaffected (regression pass).

---

## Phased roadmap (each phase = 1 build + device-log verification)
- **P0 (done):** live FX params (144), interruption recovery (143), dispose guard (141).
- **P1 — Errors + Events + Status:** `StudioError`, `StudioEvents`, funnel emit, `useStudioEngineEvents` hook, status bar + error panel. *Foundational, low audio-risk.*
- **P2 — Modular FX rack:** `FXRack` live insert/remove/move/bypass (mute-during-swap) + plugin methods + web routing + reorderable UI. *Highest risk — verify each op on device.*
- **P3 — FX presets:** store + save/load + UI.
- **P4 — Lifecycle hardening:** route/background/foreground observers + events; run the full device matrix.
- **P5 — Tests:** XCTest + Vitest scaffolding; wire into the manual matrix.
- **P6 — Cleanup:** remove `"state"` back-compat; finalize error/event coverage; release checklist sign-off.

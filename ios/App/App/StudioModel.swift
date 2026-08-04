// GleeWorld Studio — Swift mirror of the session schema.
//
// This is the iOS side of the shared contract defined in
// src/lib/studio/session.ts. The native engine (AVAudioEngine) loads
// the same manifest.json the web produces, and writes back a manifest
// the web can read. Field names + enum cases match the TypeScript
// version exactly — if you rename anything here, rename it there too.
//
// Schema history:
//   1.0.0 — baseline (audio + midi tracks, master bus).
//   1.1.0 — MIDI clips gain optional cc events (native playback still
//           ignores cc; web plays them).
//   2.0.0 — v2 mixer routing (Bus, Send, TrackOutput) + automation.
//           Every v2 field on Track / Session is OPTIONAL so v1
//           manifests decode without change; the audio-engine layer
//           treats missing fields as their v1 defaults.
//           Native engine hookup for v2 buses / sends / automation is
//           still a follow-up — this file is types only for now, so
//           the manifest at least round-trips through iOS unchanged.

import Foundation

public enum Studio {
    // Native writes stay baseline until native cc playback exists —
    // known limitation: native playback ignores `cc`, so pedal-lengthening
    // is web-only until a later iOS pass.
    public static let schemaVersion = "1.0.0"
    /// Manifests at any of these versions can be decoded. 1.1.0 adds
    /// optional MidiClip.cc — this decoder tolerates it (and simply
    /// ignores it, since native playback doesn't consume cc yet). 2.0.0
    /// adds v2 mixer routing + automation — same tolerance policy: we
    /// decode the fields, ignore what the native engine doesn't yet
    /// consume, and preserve them on save so a round-trip through the
    /// iOS app doesn't lose data. 2.1.0 adds optional accompaniment +
    /// scoreId fields — the iOS decoder ignores both (native engine
    /// doesn't consume them yet) and preserves them on round-trip.
    /// Must stay in sync with STUDIO_SCHEMA_VERSIONS in session.ts.
    public static let acceptedSchemaVersions: Set<String> = ["1.0.0", "1.1.0", "2.0.0", "2.1.0"]

    /// Well-known bus id for the always-present master bus (v2.0.0).
    /// Track / Bus `output.bus_id` defaults here; sends can target any
    /// bus id including master.
    public static let masterBusId = "master"

    // MARK: - Transport

    public struct TimeSignature: Codable, Equatable, Sendable {
        public var numerator: Int
        public var denominator: Int   // 1, 2, 4, 8, 16
    }

    // MARK: - FX

    public enum FxType: String, Codable, Sendable {
        case gain, eq3, compressor, reverb, delay, filter
    }

    /// `params` is a heterogeneous bag. We model it as `[String: ParamValue]`
    /// so JSON round-trips numbers, strings, and bools without losing types.
    public enum ParamValue: Codable, Equatable, Sendable {
        case number(Double)
        case string(String)
        case bool(Bool)

        public init(from decoder: Decoder) throws {
            let c = try decoder.singleValueContainer()
            if let v = try? c.decode(Double.self) { self = .number(v); return }
            if let v = try? c.decode(Bool.self)   { self = .bool(v);   return }
            if let v = try? c.decode(String.self) { self = .string(v); return }
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "Unsupported param type")
        }
        public func encode(to encoder: Encoder) throws {
            var c = encoder.singleValueContainer()
            switch self {
            case .number(let v): try c.encode(v)
            case .string(let v): try c.encode(v)
            case .bool(let v):   try c.encode(v)
            }
        }
    }

    public struct FxNode: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var type: FxType
        public var enabled: Bool
        public var params: [String: ParamValue]
    }

    // MARK: - Clips

    public enum ClipKind: String, Codable, Sendable {
        case audio, midi
    }

    public struct AudioClip: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var kind: ClipKind = .audio
        public var asset_id: String
        public var start_seconds: Double
        public var duration_seconds: Double
        public var offset_seconds: Double
        public var gain_db: Double
        public var fade_in_seconds: Double
        public var fade_out_seconds: Double
        public var reverse: Bool
        public var pitch_semitones: Double
        public var time_stretch: Double
    }

    public struct MidiNote: Codable, Equatable, Sendable {
        public var pitch: Int       // 0..127
        public var velocity: Int    // 0..127
        public var start_seconds: Double
        public var duration_seconds: Double
    }

    /// A recorded continuous-controller event. 1.1.0 feature — a clip
    /// that carries cc events forces the manifest to schema 1.1.0.
    /// controller 64 = sustain pedal (down at value >= 64), 1 = mod wheel.
    public struct MidiCcEvent: Codable, Equatable, Sendable {
        public var controller: Int  // 64 = sustain, 1 = mod
        public var value: Int       // 0..127
        public var time_seconds: Double
    }

    public struct MidiClip: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var kind: ClipKind = .midi
        public var start_seconds: Double
        public var duration_seconds: Double
        public var notes: [MidiNote]
        public var cc: [MidiCcEvent]?
    }

    // MARK: - Instruments (MIDI tracks)

    public enum InstrumentType: String, Codable, Sendable {
        case sampler, synth_basic
    }

    public struct Instrument: Codable, Equatable, Sendable {
        public var type: InstrumentType
        public var preset_id: String?
        public var params: [String: ParamValue]
    }

    // MARK: - Tracks

    public enum TrackKind: String, Codable, Sendable {
        case audio, midi
    }

    // MARK: - v2.0.0 routing types

    /// Where a track's post-fader signal terminates (v2.0.0). Defaults
    /// to the built-in master bus for v1 manifests via the optional
    /// `output` field on Track.
    public struct TrackOutput: Codable, Equatable, Sendable {
        public var bus_id: String
    }

    /// A single send from a track to a bus (v2.0.0). Pre-fader sends
    /// read the signal BEFORE the track fader; post-fader reads AFTER.
    public struct Send: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var target_bus_id: String
        public var level_db: Double
        public var enabled: Bool
        public var pre_fader: Bool
    }

    /// Live-input monitoring mode (v2.0.0).
    public enum InputMonitorMode: String, Codable, Sendable {
        case off, auto, on
    }

    public struct AudioTrack: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var kind: TrackKind = .audio
        public var name: String
        public var color: String
        public var volume_db: Double
        public var pan: Double
        public var mute: Bool
        public var solo: Bool
        public var arm: Bool
        public var fx: [FxNode]
        public var clips: [AudioClip]
        // v2.0.0 — optional, so v1 manifests decode unchanged.
        public var output: TrackOutput?
        public var sends: [Send]?
        public var input_monitor: InputMonitorMode?
    }

    public struct MidiTrack: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var kind: TrackKind = .midi
        public var name: String
        public var color: String
        public var volume_db: Double
        public var pan: Double
        public var mute: Bool
        public var solo: Bool
        public var arm: Bool
        public var fx: [FxNode]
        public var clips: [MidiClip]
        public var instrument: Instrument
        // v2.0.0 — optional, matches AudioTrack.
        public var output: TrackOutput?
        public var sends: [Send]?
        public var input_monitor: InputMonitorMode?
    }

    /// Union of audio + MIDI tracks, dispatched on the `kind` discriminator.
    public enum Track: Codable, Equatable, Sendable, Identifiable {
        case audio(AudioTrack)
        case midi(MidiTrack)

        public var id: String {
            switch self {
            case .audio(let t): return t.id
            case .midi(let t):  return t.id
            }
        }

        private enum Disc: String, Codable { case audio, midi }
        private enum CodingKeys: String, CodingKey { case kind }

        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            let kind = try c.decode(Disc.self, forKey: .kind)
            switch kind {
            case .audio: self = .audio(try AudioTrack(from: decoder))
            case .midi:  self = .midi(try MidiTrack(from: decoder))
            }
        }
        public func encode(to encoder: Encoder) throws {
            switch self {
            case .audio(let t): try t.encode(to: encoder)
            case .midi(let t):  try t.encode(to: encoder)
            }
        }
    }

    // MARK: - Master bus

    public struct MasterBus: Codable, Equatable, Sendable {
        public var volume_db: Double
        public var pan: Double
        public var fx: [FxNode]
    }

    // MARK: - v2.0.0 user buses

    /// A user-defined stereo submix (v2.0.0). Tracks + other buses
    /// route into it via `output` / `sends`; its `output` names its
    /// own downstream target (default: master).
    public struct Bus: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var name: String
        public var color: String
        public var volume_db: Double
        public var pan: Double
        public var mute: Bool
        public var solo: Bool
        public var fx: [FxNode]
        public var output: TrackOutput
    }

    // MARK: - v2.0.0 automation

    public enum AutomationParam: String, Codable, Sendable {
        case volume_db
        case pan
    }

    public enum AutomationCurve: String, Codable, Sendable {
        case hold, linear, exponential
    }

    public enum AutomationMode: String, Codable, Sendable {
        // Read-side modes (scheduler applies envelope during playback):
        case read
        // Non-read modes. `off` never applies. `write`/`touch`/`latch`
        // don't schedule ramps — the fader is the source of truth while
        // capturing. Touch/latch also gain a "suspend this envelope
        // while grabbed" signal via touchAutomation / releaseAutomation
        // on Engine.
        case off, write, touch, latch
    }

    public enum AutomationTargetKind: String, Codable, Sendable {
        case track, bus
    }

    /// One point in a breakpoint envelope. `curve` describes the ramp
    /// INTO this point from the previous one — the first point's
    /// curve is unused.
    public struct AutomationPoint: Codable, Equatable, Sendable {
        public var time_seconds: Double
        public var value: Double
        public var curve: AutomationCurve
    }

    /// Breakpoint automation envelope for one strip parameter (v2.0.0).
    public struct Automation: Codable, Equatable, Sendable {
        public var target_id: String
        public var target_kind: AutomationTargetKind
        public var param: AutomationParam
        public var mode: AutomationMode
        public var points: [AutomationPoint]
    }

    // MARK: - Audio assets

    public enum AudioFormat: String, Codable, Sendable {
        case wav, mp3, aac, flac, ogg, webm, mp4, m4a
    }

    public struct AudioAsset: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var filename: String
        public var format: AudioFormat
        public var duration_seconds: Double
        public var sample_rate: Int
        public var channels: Int
        public var size_bytes: Int
        public var peaks: [Double]?
    }

    // MARK: - Session

    public struct Session: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var schema_version: String
        public var title: String
        public var description: String?

        public var tempo_bpm: Double
        public var time_signature: TimeSignature
        public var length_seconds: Double

        public var master: MasterBus
        public var tracks: [Track]
        // v2.0.0 — optional so v1 manifests decode unchanged. Absent
        // == empty; the audio engine treats missing buses as "every
        // track routes to master" (the v1 behavior).
        public var buses: [Bus]?
        public var automation: [Automation]?
        public var assets: [AudioAsset]

        public var owner_user_id: String
        public var tenant_id: String
        public var created_at: String  // ISO-8601
        public var updated_at: String
    }

    // MARK: - JSON IO

    /// Encode a session as the canonical JSON manifest bytes.
    public static func encode(_ session: Session) throws -> Data {
        let enc = JSONEncoder()
        enc.outputFormatting = [.sortedKeys]
        return try enc.encode(session)
    }

    /// Decode a manifest blob into a Session. Throws on schema mismatch.
    public static func decode(_ data: Data) throws -> Session {
        let dec = JSONDecoder()
        let s = try dec.decode(Session.self, from: data)
        guard Studio.acceptedSchemaVersions.contains(s.schema_version) else {
            throw NSError(domain: "Studio", code: 1, userInfo: [
                NSLocalizedDescriptionKey:
                    "schema_version mismatch: got \(s.schema_version), expected one of \(Studio.acceptedSchemaVersions.sorted())"
            ])
        }
        return s
    }
}

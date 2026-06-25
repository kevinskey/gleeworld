// GleeWorld Studio — Swift mirror of the session schema.
//
// This is the iOS side of the Phase 1 shared contract defined in
// src/lib/studio/session.ts. The native engine (AVAudioEngine) loads
// the same manifest.json the web produces, and writes back a manifest
// the web can read. Field names + enum cases match the TypeScript
// version exactly — if you rename anything here, rename it there too.
//
// Phase 1 is types only. The audio engine lands in Phase 3.

import Foundation

public enum Studio {
    public static let schemaVersion = "1.0.0"

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

    public struct MidiClip: Codable, Equatable, Sendable, Identifiable {
        public var id: String
        public var kind: ClipKind = .midi
        public var start_seconds: Double
        public var duration_seconds: Double
        public var notes: [MidiNote]
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
        guard s.schema_version == Studio.schemaVersion else {
            throw NSError(domain: "Studio", code: 1, userInfo: [
                NSLocalizedDescriptionKey:
                    "schema_version mismatch: got \(s.schema_version), expected \(Studio.schemaVersion)"
            ])
        }
        return s
    }
}

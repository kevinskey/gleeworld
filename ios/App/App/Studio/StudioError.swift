// Structured error shape for every Studio plugin method. Replaces
// `call.reject("some string")` so JavaScript always receives a machine-
// readable { code, message, operation, trackId?, effectId?, recoverable }
// object instead of a bare message — no more silent / string-only failures.

import Foundation
import Capacitor

public struct StudioError: Error {
    public let code: String        // stable machine code, e.g. "ENGINE_NOT_READY"
    public let message: String     // human-readable
    public let operation: String   // the plugin method that failed
    public var trackId: String?
    public var effectId: String?
    public var recoverable: Bool

    public init(code: String, message: String, operation: String,
                trackId: String? = nil, effectId: String? = nil, recoverable: Bool = true) {
        self.code = code; self.message = message; self.operation = operation
        self.trackId = trackId; self.effectId = effectId; self.recoverable = recoverable
    }

    public var dict: [String: Any] {
        var d: [String: Any] = [
            "code": code, "message": message,
            "operation": operation, "recoverable": recoverable,
        ]
        if let t = trackId { d["trackId"] = t }
        if let e = effectId { d["effectId"] = e }
        return d
    }
}

public extension CAPPluginCall {
    /// Reject with the structured Studio error shape (message + code + the
    /// full dict as `data` so the TS layer can read every field).
    func reject(_ e: StudioError) {
        self.reject(e.message, e.code, nil, e.dict)
    }
}

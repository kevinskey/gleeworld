// Resolves AudioAsset → AVAudioFile, fetching the bytes from Supabase
// Storage's signed URL the first time we see an asset and caching the
// local copy under a per-session temp dir.
//
// The JS layer is the source of truth for signed URLs (they expire);
// it primes our cache via loadSession's `assetUrls` map.

import Foundation
import AVFoundation

public final class AssetLoader {
    /// asset_id → signed URL (set by the plugin from JS each loadSession).
    private var urls: [String: String] = [:]
    /// Local cache: asset_id → on-disk AVAudioFile.
    private var cache: [String: AVAudioFile] = [:]
    private let tempDir: URL

    public init() {
        // Per-process temp directory; cleared on engine teardown.
        let base = FileManager.default.temporaryDirectory
            .appendingPathComponent("studio-cache", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        self.tempDir = base
    }

    public func setUrls(_ map: [String: String]) {
        self.urls = map
    }

    /// Asynchronously fetch + decode an asset. Returns the AVAudioFile
    /// ready to schedule into a player node. Caches local files.
    public func loadAsset(id: String, format: String) async throws -> AVAudioFile {
        if let cached = cache[id] { return cached }
        guard let urlString = urls[id], let url = URL(string: urlString) else {
            throw NSError(domain: "AssetLoader", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "no signed URL for asset \(id)"
            ])
        }
        let (data, _) = try await URLSession.shared.data(from: url)
        let localPath = tempDir.appendingPathComponent("\(id).\(format)")
        try data.write(to: localPath, options: .atomic)
        let file = try AVAudioFile(forReading: localPath)
        cache[id] = file
        return file
    }

    public func clearCache() {
        cache.removeAll()
        try? FileManager.default.removeItem(at: tempDir)
        try? FileManager.default.createDirectory(at: tempDir, withIntermediateDirectories: true)
    }
}

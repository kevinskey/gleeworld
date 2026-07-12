// GWMidiPlugin
//
// CoreMIDI input bridge for the Studio / VirtualPiano / hands-free
// viewer. iOS WebKit has no Web MIDI API, so hardware keyboards (USB-C
// or Bluetooth LE) are invisible to the webview — this plugin forwards
// their channel-voice messages over the Capacitor bridge instead.
//
// Input only by design: no output ports, so the web app's MIDI Clock
// sender stays feature-hidden on iPad. Sysex (0xF0) and realtime
// (0xF8–0xFF) traffic never crosses the bridge.
//
// Threading: CoreMIDI delivers on a realtime thread. notifyListeners
// must run on main (same constraint as StudioEnginePlugin's recordPeak),
// so every emit hops through DispatchQueue.main.

import Foundation
import Capacitor
import CoreMIDI
import CoreAudioKit

@objc(GWMidiPlugin)
public class GWMidiPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GWMidiPlugin"
    public let jsName = "GWMidi"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listInputs", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showBluetoothPairing", returnType: CAPPluginReturnPromise),
    ]

    private var client = MIDIClientRef()
    private var inputPort = MIDIPortRef()
    private var running = false
    // mach_absolute_time → milliseconds conversion, resolved once.
    private static let timebase: Double = {
        var info = mach_timebase_info_data_t()
        mach_timebase_info(&info)
        return Double(info.numer) / Double(info.denom) / 1_000_000.0
    }()

    // MARK: - Lifecycle

    @objc func start(_ call: CAPPluginCall) {
        // Capacitor invokes plugin methods on a background queue, but the
        // setup-changed handler touches the port on main. Confine ALL
        // client/inputPort/running lifecycle mutation to the main queue so
        // teardown can never race a queued connectAllSources().
        DispatchQueue.main.async { [weak self] in
            guard let self else { call.reject("plugin deallocated"); return }
            if self.running { call.resolve(); return }

            var status = MIDIClientCreateWithBlock("GWMidiClient" as CFString, &self.client) { [weak self] notification in
                // Hot-plug / Bluetooth connect+disconnect. CoreMIDI posts this
                // on its own thread; hop to main for connect + notify.
                if notification.pointee.messageID == .msgSetupChanged {
                    DispatchQueue.main.async {
                        self?.connectAllSources()
                        self?.emitStateChange()
                    }
                }
            }
            guard status == noErr else { call.reject("MIDIClientCreate failed (\(status))"); return }

            status = MIDIInputPortCreateWithProtocol(self.client, "GWMidiInput" as CFString, ._1_0, &self.inputPort) { [weak self] eventListPtr, srcConnRefCon in
                self?.handle(eventListPtr: eventListPtr, refCon: srcConnRefCon)
            }
            guard status == noErr else {
                MIDIClientDispose(self.client)
                self.client = MIDIClientRef()
                call.reject("MIDIInputPortCreate failed (\(status))")
                return
            }

            self.connectAllSources()
            self.running = true
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.teardown()
            call.resolve()
        }
    }

    deinit {
        // Direct call is safe here: once deinit runs, no [weak self]
        // main-queue blocks can fire, so there's no concurrent access
        // to race with.
        teardown()
    }

    private func teardown() {
        guard running || client != 0 else { return }
        if inputPort != 0 { MIDIPortDispose(inputPort); inputPort = MIDIPortRef() }
        if client != 0 { MIDIClientDispose(client); client = MIDIClientRef() }
        running = false
    }

    // MARK: - Sources

    private func connectAllSources() {
        guard inputPort != 0 else { return }
        for i in 0..<MIDIGetNumberOfSources() {
            let source = MIDIGetSource(i)
            guard source != 0 else { continue }
            // refCon carries the source's uniqueID so the receive block can
            // label messages without a lookup. Re-connecting an already
            // connected source returns an error we can ignore.
            let refCon = UnsafeMutableRawPointer(bitPattern: Int(uniqueId(of: source)))
            MIDIPortConnectSource(inputPort, source, refCon)
        }
    }

    private func uniqueId(of endpoint: MIDIEndpointRef) -> Int32 {
        var value: Int32 = 0
        MIDIObjectGetIntegerProperty(endpoint, kMIDIPropertyUniqueID, &value)
        return value
    }

    private func displayName(of endpoint: MIDIEndpointRef) -> String {
        var name: Unmanaged<CFString>?
        if MIDIObjectGetStringProperty(endpoint, kMIDIPropertyDisplayName, &name) == noErr,
           let cf = name?.takeRetainedValue() {
            return cf as String
        }
        return "MIDI Device"
    }

    private func currentInputs() -> [[String: Any]] {
        (0..<MIDIGetNumberOfSources()).compactMap { i in
            let source = MIDIGetSource(i)
            guard source != 0 else { return nil }
            return ["id": String(uniqueId(of: source)), "name": displayName(of: source)]
        }
    }

    @objc func listInputs(_ call: CAPPluginCall) {
        call.resolve(["inputs": currentInputs()])
    }

    private func emitStateChange() {
        notifyListeners("stateChange", data: ["inputs": currentInputs()])
    }

    // MARK: - Receive

    private func handle(eventListPtr: UnsafePointer<MIDIEventList>, refCon: UnsafeMutableRawPointer?) {
        let portId = refCon.map { String(Int32(truncatingIfNeeded: Int(bitPattern: $0))) } ?? ""
        var messages: [(bytes: [Int], tsMs: Double)] = []

        for packetPtr in eventListPtr.unsafeSequence() {
            let tsMs = Double(packetPtr.pointee.timeStamp) * Self.timebase
            for word in packetPtr.words() {
                // Universal MIDI Packet, message type 0x2 = MIDI 1.0 channel voice.
                // words() yields raw words, so a SysEx7 continuation word whose
                // top nibble happens to be 0x2 could slip through — harmless
                // because its "status" byte is 7-bit (< 0x80) and the JS
                // parseMidiMessage drops it.
                guard (word >> 28) & 0xF == 0x2 else { continue }
                let status = Int((word >> 16) & 0xFF)
                // Channel-voice only: sysex / realtime never cross the bridge.
                guard status < 0xF0 else { continue }
                let d1 = Int((word >> 8) & 0x7F)
                let d2 = Int(word & 0x7F)
                messages.append((bytes: [status, d1, d2], tsMs: tsMs))
            }
        }
        guard !messages.isEmpty else { return }

        // CoreMIDI thread → main; notifyListeners writes through the bridge.
        DispatchQueue.main.async { [weak self] in
            for m in messages {
                self?.notifyListeners("midiMessage", data: [
                    "portId": portId,
                    "data": m.bytes,
                    "tsMs": m.tsMs,
                ])
            }
        }
    }

    // MARK: - Bluetooth pairing

    private weak var pairingNav: UINavigationController?

    @objc func showBluetoothPairing(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let host = self.bridge?.viewController else {
                call.reject("No view controller to present from")
                return
            }
            let central = CABTMIDICentralViewController()
            central.navigationItem.rightBarButtonItem = UIBarButtonItem(
                barButtonSystemItem: .done,
                target: self,
                action: #selector(self.dismissPairing)
            )
            let nav = UINavigationController(rootViewController: central)
            nav.modalPresentationStyle = .formSheet
            self.pairingNav = nav
            host.present(nav, animated: true) { call.resolve() }
        }
    }

    @objc private func dismissPairing() {
        pairingNav?.dismiss(animated: true)
        pairingNav = nil
    }
}

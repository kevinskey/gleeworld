// Unified MIDI input facade for every MIDI consumer in the app
// (Studio record/monitor, sight-singing VirtualPiano, hands-free viewer).
//
// Two backends behind one interface:
//   - web:    the Web MIDI API (Chrome/Edge desktop) — behavior-identical
//             to the inline requestMIDIAccess code it replaced.
//   - native: the GWMidi Capacitor plugin (CoreMIDI on iOS), added in a
//             follow-up task — iOS WebKit has no Web MIDI at all.
//
// Consumers import getMidiInputSource() and never branch on platform.
// Raw bytes go to the existing parseMidiMessage; no parsing lives here.

export interface MidiInputDescriptor { id: string; name: string }

export interface MidiInputSource {
  /** Which backend this is — the Studio UI shows the Bluetooth pairing
   *  button only for 'native'. */
  readonly kind: 'web' | 'native';
  readonly supported: boolean;
  listInputs(): Promise<MidiInputDescriptor[]>;
  /**
   * Deliver raw MIDI bytes from the chosen device ('' = all devices).
   * Rejects if access is denied (web permission prompt).
   * Resolves to an unsubscribe function.
   */
  subscribe(deviceId: string, onMessage: (data: Uint8Array) => void): Promise<() => void>;
  /** Fires on device hot-plug / disconnect. Returns un-listen function. */
  onStateChange(cb: () => void): () => void;
  /** Opens the OS Bluetooth MIDI pairing sheet. Resolves false where
   *  unavailable (web). */
  showBluetoothPairing(): Promise<boolean>;
}

// Web MIDI types aren't in the default TS DOM lib; keep these local +
// loose, same as the previous inline usage.
interface MidiPort { id: string; name?: string; onmidimessage: ((e: { data: Uint8Array }) => void) | null }
interface MidiAccessLike { inputs: Map<string, MidiPort>; onstatechange: (() => void) | null }

interface Subscriber { deviceId: string; cb: (data: Uint8Array) => void }

export function createWebMidiInputSource(nav: Navigator = globalThis.navigator): MidiInputSource {
  const supported = typeof nav !== 'undefined' && !!nav && 'requestMIDIAccess' in nav;
  const subscribers = new Set<Subscriber>();
  const stateCbs = new Set<() => void>();
  let accessPromise: Promise<MidiAccessLike> | null = null;

  // One dispatcher per port fans out to matching subscribers. Ports keep
  // the dispatcher attached after the last unsubscribe (an empty set just
  // delivers to nobody) — same net behavior as the old per-hook attach.
  const attach = (acc: MidiAccessLike) => {
    acc.inputs.forEach((inp) => {
      inp.onmidimessage = (e) => {
        subscribers.forEach((s) => {
          if (s.deviceId === '' || s.deviceId === inp.id) s.cb(e.data);
        });
      };
    });
  };

  const getAccess = (): Promise<MidiAccessLike> => {
    if (!accessPromise) {
      accessPromise = (nav as unknown as { requestMIDIAccess: (o: { sysex: boolean }) => Promise<MidiAccessLike> })
        .requestMIDIAccess({ sysex: false })
        .then((acc) => {
          attach(acc);
          acc.onstatechange = () => {
            attach(acc); // pick up newly plugged ports
            stateCbs.forEach((f) => f());
          };
          return acc;
        })
        .catch((err) => {
          accessPromise = null; // denied — let a later subscribe retry
          throw err;
        });
    }
    return accessPromise;
  };

  return {
    kind: 'web',
    supported,
    async listInputs() {
      if (!supported) return [];
      const acc = await getAccess();
      return [...acc.inputs.values()].map((i) => ({ id: i.id, name: i.name ?? i.id }));
    },
    async subscribe(deviceId, onMessage) {
      await getAccess(); // permission denial rejects here, before we register
      const sub: Subscriber = { deviceId, cb: onMessage };
      subscribers.add(sub);
      return () => { subscribers.delete(sub); };
    },
    onStateChange(cb) {
      stateCbs.add(cb);
      return () => { stateCbs.delete(cb); };
    },
    async showBluetoothPairing() {
      return false; // browsers pair Bluetooth MIDI at the OS level
    },
  };
}

let singleton: MidiInputSource | null = null;

/** The app-wide MIDI input source. Native backend lands in a follow-up
 *  task; until then every platform gets the web backend. */
export function getMidiInputSource(): MidiInputSource {
  if (!singleton) singleton = createWebMidiInputSource();
  return singleton;
}

// Audio I/O device picker. Lists available microphones and speakers
// (when the browser/OS exposes them), persists the user's selection in
// localStorage, and surfaces helpers to apply them to getUserMedia
// constraints and HTMLMediaElement.setSinkId().
//
// Caveats:
//   • The device labels are blank until at least one getUserMedia()
//     prompt has been granted. We fall back to "Microphone N" / "Output
//     N" when that's the case.
//   • Output routing (setSinkId) is supported in Chrome/Edge/Opera and
//     in iOS 17+ Safari. Audio that runs through an AudioContext can
//     only be redirected via a MediaStreamDestinationNode → <audio>
//     element with setSinkId, which the engine wires up internally.

import { useCallback, useEffect, useState } from 'react';

const INPUT_KEY = 'gw-audio-input-device';
const OUTPUT_KEY = 'gw-audio-output-device';

export interface AudioDevice {
  deviceId: string;
  label: string;
}

export function useAudioDevices() {
  const [inputs, setInputs] = useState<AudioDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioDevice[]>([]);
  const [inputDeviceId, setInputDeviceIdState] = useState<string>(() => {
    try { return localStorage.getItem(INPUT_KEY) ?? 'default'; } catch { return 'default'; }
  });
  const [outputDeviceId, setOutputDeviceIdState] = useState<string>(() => {
    try { return localStorage.getItem(OUTPUT_KEY) ?? 'default'; } catch { return 'default'; }
  });

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) { setInputs([]); setOutputs([]); return; }
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const ins: AudioDevice[] = [];
      const outs: AudioDevice[] = [];
      let inIdx = 0;
      let outIdx = 0;
      for (const d of devs) {
        if (d.kind === 'audioinput') {
          ins.push({ deviceId: d.deviceId, label: d.label || `Microphone ${++inIdx}` });
        } else if (d.kind === 'audiooutput') {
          outs.push({ deviceId: d.deviceId, label: d.label || `Output ${++outIdx}` });
        }
      }
      setInputs(ins);
      setOutputs(outs);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', onChange);
    return () => { navigator.mediaDevices?.removeEventListener?.('devicechange', onChange); };
  }, [refresh]);

  const setInputDeviceId = useCallback((id: string) => {
    setInputDeviceIdState(id);
    try { localStorage.setItem(INPUT_KEY, id); } catch {}
  }, []);
  const setOutputDeviceId = useCallback((id: string) => {
    setOutputDeviceIdState(id);
    try { localStorage.setItem(OUTPUT_KEY, id); } catch {}
  }, []);

  return {
    inputs, outputs,
    inputDeviceId, setInputDeviceId,
    outputDeviceId, setOutputDeviceId,
    refresh,
    outputRoutingSupported:
      typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype,
  };
}

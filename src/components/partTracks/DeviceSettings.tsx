// Audio I/O device picker for the studio. Mic selector applies to the
// next recording; output selector reroutes the master mix via setSinkId
// when the browser supports it (Chrome, Edge, iOS 17+ Safari).

import { Button } from '@/components/ui/button';
import { Mic, Headphones, X, RefreshCw, AlertTriangle, AudioWaveform } from 'lucide-react';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { setOutputDevice } from './audioEngine';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const MUSIC_MODE_KEY = 'gw_pt_music_mode';

/** Read the current music-mode preference from localStorage. Studio
 *  consumers can call this synchronously before kicking off recording. */
export function isMusicModeEnabled(): boolean {
  try { return localStorage.getItem(MUSIC_MODE_KEY) === '1'; } catch { return false; }
}

interface DeviceSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function DeviceSettings({ open, onClose }: DeviceSettingsProps) {
  const {
    inputs, outputs, inputDeviceId, setInputDeviceId,
    outputDeviceId, setOutputDeviceId, refresh, outputRoutingSupported,
  } = useAudioDevices();
  const [musicMode, setMusicMode] = useState<boolean>(isMusicModeEnabled);

  // Persist the music-mode preference so the audio engine can read it
  // synchronously on the next recording without prop-drilling.
  useEffect(() => {
    try { localStorage.setItem(MUSIC_MODE_KEY, musicMode ? '1' : '0'); } catch { /* ignore */ }
  }, [musicMode]);

  if (!open) return null;

  const handleOutputChange = async (id: string) => {
    setOutputDeviceId(id);
    const ok = await setOutputDevice(id);
    if (!ok && id !== 'default') {
      toast.error('This browser does not allow choosing an audio output.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-[#0b1430] border border-amber-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between">
          <h2 className="text-sm font-bold tracking-wide uppercase text-amber-400">Audio devices</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" /> Input (microphone)
            </div>
            <DevicePicker
              devices={inputs}
              value={inputDeviceId}
              onChange={setInputDeviceId}
            />
            <p className="text-[11px] text-slate-500 mt-1">Applies to the next recording.</p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5" /> Output
            </div>
            {!outputRoutingSupported && (
              <p className="text-[11px] text-amber-400/80 flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3 h-3" />
                Your browser routes to the system default — output selection isn't exposed.
              </p>
            )}
            <DevicePicker
              devices={outputs}
              value={outputDeviceId}
              onChange={handleOutputChange}
              disabled={!outputRoutingSupported}
            />
            <p className="text-[11px] text-slate-500 mt-1">Routes both the multitrack mix and accompaniment playback.</p>
          </div>

          {/* Recording-quality toggle. Music mode = no echo cancellation,
              48kHz capture, 256 kbps encode. The DSP that helps voice
              calls (echoCancel + noiseSup + AGC) smears vocals — turn
              it off when the singer is wearing headphones so the take
              isn't run through Zoom-grade processing first. */}
          <div className="rounded-lg border border-amber-500/20 bg-black/30 p-3">
            <button
              type="button"
              onClick={() => setMusicMode((v) => !v)}
              className="flex items-center justify-between w-full text-left"
              aria-pressed={musicMode}
            >
              <div className="flex items-center gap-2">
                <AudioWaveform className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-slate-100">Music mode</div>
                  <div className="text-[11px] text-slate-400 leading-tight max-w-xs">
                    {musicMode
                      ? '48 kHz, 256 kbps, no echo cancellation. Use headphones to avoid backing-track bleed.'
                      : 'Voice-call DSP on (echo cancellation). Safe for speakers, but vocals sound flatter.'}
                  </div>
                </div>
              </div>
              <span
                className={`relative inline-flex h-6 w-11 rounded-full transition-colors shrink-0 ml-3 ${
                  musicMode ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    musicMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refresh()}
            className="w-full border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh devices
          </Button>
          {(inputs.length === 0 || outputs.length === 0) && (
            <p className="text-[11px] text-slate-500 italic">
              Tip: device names appear after you record once (so the browser unlocks the permission).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DevicePicker({
  devices, value, onChange, disabled,
}: {
  devices: { deviceId: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-black/40 border border-amber-500/20 rounded px-2 py-2 text-sm text-slate-100 disabled:opacity-50"
    >
      <option value="default">System default</option>
      {devices.map((d) => (
        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
      ))}
    </select>
  );
}

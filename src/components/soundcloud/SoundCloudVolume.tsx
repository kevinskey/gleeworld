import { useSyncExternalStore } from 'react';
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  getSoundCloudVolume,
  setSoundCloudVolume,
  subscribeSoundCloudVolume,
} from '@/lib/soundcloud/widgetVolume';

/** App-wide SoundCloud playback level (0..100), shared by every player. */
export function useSoundCloudVolume(): number {
  return useSyncExternalStore(
    subscribeSoundCloudVolume,
    getSoundCloudVolume,
    // SSR/prerender has no localStorage; the store's own default is correct.
    getSoundCloudVolume,
  );
}

/**
 * Volume control for the SoundCloud players. The widget's own chrome has no
 * volume slider at the heights we embed it, so without this the only way to
 * turn SoundCloud down was the device volume — which turns everything else
 * down with it.
 */
export function SoundCloudVolume({ className }: { className?: string }) {
  const volume = useSoundCloudVolume();
  const Icon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <button
        type="button"
        // Mute is a toggle back to the level you were at, not a slide to 0 and
        // a forgotten setting.
        onClick={() => setSoundCloudVolume(volume === 0 ? 70 : 0)}
        aria-label={volume === 0 ? 'Unmute SoundCloud' : 'Mute SoundCloud'}
        title={volume === 0 ? 'Unmute' : 'Mute'}
        className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
      >
        <Icon className="w-4 h-4" />
      </button>
      <Slider
        value={[volume]}
        onValueChange={([v]) => setSoundCloudVolume(v)}
        min={0}
        max={100}
        step={1}
        aria-label="SoundCloud volume"
        className="w-28 sm:w-36"
      />
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{volume}</span>
    </div>
  );
}

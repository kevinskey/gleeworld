// TypeScript bridge for the iOS RecordingLiveActivityPlugin.
//
// Drives a Live Activity that shows "Recording: <part> · m:ss" on the
// lock screen + in the Dynamic Island while a take is rolling. Lets a
// singer park the phone on a stand and lock the screen without losing
// visibility into the take. iOS 16.2+ only; safely no-ops elsewhere.

import { Capacitor, registerPlugin } from '@capacitor/core';

interface RecordingLiveActivityPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  start(opts: {
    projectTitle: string;
    partLabel: string;
  }): Promise<{ started: boolean; id?: string; widgetMissing?: boolean; reason?: string }>;
  update(opts: {
    partLabel: string;
    startedAtUnixSeconds: number;
    isPaused: boolean;
  }): Promise<{ updated: boolean }>;
  end(): Promise<{ ended: boolean }>;
}

const Native = registerPlugin<RecordingLiveActivityPlugin>('RecordingLiveActivity');

export function isLiveActivityAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

let widgetMissingWarned = false;

export async function startRecordingActivity(
  projectTitle: string, partLabel: string,
): Promise<void> {
  if (!isLiveActivityAvailable()) return;
  try {
    const res = await Native.start({ projectTitle, partLabel });
    if (!res.started && res.widgetMissing && !widgetMissingWarned) {
      // Don't spam — log once per session. The Live Activity will only
      // appear after the widget-extension target ships in the next iOS
      // build; until then, recording still works, just no lock screen UI.
      widgetMissingWarned = true;
      console.warn(
        '[LiveActivity] Add a Widget Extension target in Xcode named ' +
        '"RecordingLiveActivityExtension" with Live Activity support. ' +
        'See RecordingLiveActivityPlugin.swift for the schema.',
      );
    }
  } catch (e) {
    console.warn('[LiveActivity] start failed', e);
  }
}

export async function updateRecordingActivity(
  partLabel: string, startedAtUnixSeconds: number, isPaused: boolean,
): Promise<void> {
  if (!isLiveActivityAvailable()) return;
  try {
    await Native.update({ partLabel, startedAtUnixSeconds, isPaused });
  } catch (e) {
    console.warn('[LiveActivity] update failed', e);
  }
}

export async function endRecordingActivity(): Promise<void> {
  if (!isLiveActivityAvailable()) return;
  try {
    await Native.end();
  } catch (e) {
    console.warn('[LiveActivity] end failed', e);
  }
}

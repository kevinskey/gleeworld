import { Capacitor, registerPlugin } from '@capacitor/core';

export interface GWCalendarEvent {
  ekId: string;
  calendarTitle: string | null;
  title: string | null;
  description: string | null;
  location: string | null;
  startAt: string; // ISO
  endAt:   string; // ISO
  allDay: boolean;
  isPrivate: boolean;
}

export interface GWCalendarStatus {
  granted: boolean;
  status: 'notDetermined' | 'restricted' | 'denied' | 'authorized' | 'writeOnly' | 'unknown';
}

export interface GWCalendarPluginShape {
  requestAccess(): Promise<GWCalendarStatus>;
  checkAccess():   Promise<GWCalendarStatus>;
  readEvents(opts: { fromIso: string; toIso: string }): Promise<{ events: GWCalendarEvent[] }>;
}

export const GWCalendar = registerPlugin<GWCalendarPluginShape>('GWCalendar');

export function isNativeCalendarAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

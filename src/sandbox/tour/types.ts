// Sandbox-specific types. The TourStep type itself lives in
// @/components/tour/types so the same engine drives both the mock
// sandbox and the real-product tour.

export type Perspective = 'admin' | 'student';

export type PanelId =
  | 'command-center'
  | 'messenger'
  | 'calendar'
  | 'office-hours'
  | 'academy'
  | 'music-library'
  | 'quick-cam'
  | 'people'
  | 'analytics'
  | 'settings';

export interface SandboxTourContext {
  setPanel: (id: PanelId) => void;
  setPerspective: (p: Perspective) => void;
}

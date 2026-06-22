// Jump shape stored in gw_sheet_music_jumps. Source coords are stored as
// percentages so they survive zoom / rotate / re-render.
export interface SheetMusicJump {
  id: string;
  sheet_music_id: string;
  source_page: number;
  source_x_pct: number;
  source_y_pct: number;
  source_radius_pct: number;
  target_page: number;
  label: string | null;
  created_at: string;
}

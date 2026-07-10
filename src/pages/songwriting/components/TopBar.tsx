// Ported from the standalone songwriter app's client/src/components/TopBar.tsx.
//
// INTERPRETATION NOTE (Task 8): the source TopBar rendered the whole app's
// global chrome — logo, user avatar/name, log out — because that app had no
// outer shell. Here the editor route is nested inside GleeWorld's
// DashboardShell, which already renders that global header (logo, avatar,
// sign-out) once for every /dashboard/* page. Re-rendering it here would
// duplicate the app chrome, which no sibling editor page in this codebase
// does (see ConcertPlannerEditorPage / StudioEditor — both render only a
// local in-page toolbar). So this file keeps the "TopBar" name and slot the
// brief asks for, but its content is the source's local per-page toolbar row
// (the "← All songs / rhyme toggle / TTS / save state" strip that lived
// inline in EditorPage.tsx, immediately below the app TopBar) plus the new
// Share toggle. Logic (rhyme-toggle state, save-state labels) is preserved;
// only the "global header" portion of the old component is intentionally
// dropped as out of place in this shell.
//
// Task 10: TTSPlayButton restored. It needs the full `song` object (it reads
// title + sections), which wasn't in this component's prop list — added a
// `song: Song` prop so SongwritingEditorPage can thread it through.

import { Link } from 'react-router-dom';
import { Palette } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Song } from '@/lib/songwriting/types';
import TTSPlayButton from './TTSPlayButton';

export type SaveState = 'saved' | 'saving' | 'dirty' | 'error';

export default function TopBar({
  song,
  highlightRhymes,
  onToggleRhymes,
  saveState,
  visibility,
  onVisibilityChange,
  readOnly = false,
}: {
  song: Song;
  highlightRhymes: boolean;
  onToggleRhymes: () => void;
  saveState: SaveState;
  visibility: 'private' | 'tenant';
  onVisibilityChange: (v: 'private' | 'tenant') => void;
  // Viewer (non-owner) opening a tenant-shared song: hide the Share control
  // and the autosave indicator — there is nothing to save or share here.
  // TTSPlayButton stays since "read aloud" is a read feature.
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap mb-6 text-sm">
      <Link to="/songwriting" className="text-muted-foreground hover:text-foreground">
        ← All songs
      </Link>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onToggleRhymes}
          className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors ${
            highlightRhymes
              ? 'border-primary text-primary bg-primary/5'
              : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
          }`}
          title="Color words within a line that share the same rhyme sound"
        >
          <Palette className="w-4 h-4" />
          Internal rhymes
        </button>
        <TTSPlayButton song={song} />
        {!readOnly && (
          <Select value={visibility} onValueChange={(v) => onVisibilityChange(v as 'private' | 'tenant')}>
            <SelectTrigger className="h-8 min-h-0 w-auto text-xs gap-1.5 px-2 py-1" aria-label="Song visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Private</SelectItem>
              <SelectItem value="tenant">Shared with your ensemble</SelectItem>
            </SelectContent>
          </Select>
        )}
        {!readOnly && <SaveIndicator state={saveState} />}
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const label =
    state === 'saved' ? 'Saved' :
    state === 'saving' ? 'Saving…' :
    state === 'dirty' ? 'Unsaved changes' :
    'Save failed';
  const color =
    state === 'saved' ? 'text-muted-foreground' :
    state === 'saving' ? 'text-primary' :
    state === 'dirty' ? 'text-foreground/70' :
    'text-rose-600';
  return <span className={`text-xs ${color}`}>{label}</span>;
}

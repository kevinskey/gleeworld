// Ported from the standalone songwriter app's client/src/pages/EditorPage.tsx.
//
// Kept byte-identical where the Task 8 brief didn't call for a change:
// section/graveyard/template helpers, the chord-chart helpers (chartFor,
// updateChart, attachNewChart, attachClipboardChart, detachChart,
// copyChartToClipboard, chartRefCount) and the AI-panel wiring (insertLine,
// replaceLine, selectedWord, focusedLine) are all still here even though
// their consumer components aren't rendered yet — Tasks 9-11 reattach them.
//
// Deliberate changes for this port:
//  - useParams key is `songId` (string, Supabase uuid) instead of `id` (number).
//  - Autosave persists via `updateSong` (Supabase) instead of the old REST client.
//  - On save failure the doc is kept dirty and a fresh save is scheduled
//    (genuine retry — see scheduleSave's catch block), instead of the old
//    app's terminal "error" state that just sat there until the next edit.
//  - Added a Share toggle (song.visibility) — new in this multi-tenant app,
//    the old app had no such concept.
//  - AIPanel / ChordChartEditor (via SectionChordSlot) / RecorderPanel /
//    TTSPlayButton are commented out — those files don't exist until
//    Tasks 9-11 land.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getSong, updateSong, setVisibility } from '@/lib/songwriting/songsApi';
import type { ChordChart, GraveyardEntry, Section, Song } from '@/lib/songwriting/types';
import TopBar, { type SaveState } from './components/TopBar';
import SectionBlock from './components/SectionBlock';
// import AIPanel from './components/AIPanel'; // restored in Task 9
// import RecorderPanel from './components/RecorderPanel'; // restored in Task 11
// import SectionChordSlot from './components/SectionChordSlot'; // restored in Task 10 alongside ChordChartEditor

export default function SongwritingEditorPage() {
  const { songId } = useParams<{ songId: string }>();

  const [song, setSong] = useState<Song | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [focusedLine, setFocusedLine] = useState<{ sectionId: string; index: number } | null>(null);
  const [selectedWord, setSelectedWord] = useState('');
  const [highlightRhymes, setHighlightRhymes] = useState(false);
  // Chart clipboard — stores a chart_id to paste into another section.
  const [chartClipboard, setChartClipboard] = useState<string | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  // Load song
  useEffect(() => {
    if (!songId) return;
    getSong(songId)
      .then(setSong)
      .catch((e: any) => toast.error(e.message || 'Could not load song'));
  }, [songId]);

  // Autosave (debounced) whenever song changes via update()
  const scheduleSave = useCallback((next: Song) => {
    setSaveState('dirty');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState('saving');
      try {
        await updateSong(next.id, {
          title: next.title,
          sections: next.sections,
          notes: next.notes,
          tempo_bpm: next.tempo_bpm,
          key_signature: next.key_signature,
          graveyard: next.graveyard,
          chord_chart: next.chord_chart,
          chord_charts: next.chord_charts,
        });
        setSaveState('saved');
      } catch (e: any) {
        // Never drop to a terminal "error" state and never touch the
        // in-memory lyric text — keep the doc dirty and re-arm the debounce
        // so the next tick tries again on its own, without the user having
        // to type anything else to trigger a retry.
        setSaveState('dirty');
        toast.error('Autosave failed — retrying');
        scheduleSave(next);
      }
    }, 800);
  }, []);

  const update = useCallback((patch: Partial<Song>) => {
    setSong((curr) => {
      if (!curr) return curr;
      const next = { ...curr, ...patch } as Song;
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  // Share toggle — new in this multi-tenant app (old app had no visibility concept).
  async function handleVisibilityChange(v: 'private' | 'tenant') {
    if (!song || song.visibility === v) return;
    const prevVisibility = song.visibility;
    setSong({ ...song, visibility: v });
    try {
      await setVisibility(song.id, v);
      toast.success(v === 'tenant' ? 'Shared with your ensemble' : 'Set to private');
    } catch (e: any) {
      setSong((curr) => (curr ? { ...curr, visibility: prevVisibility } : curr));
      toast.error(e.message || 'Could not update sharing');
    }
  }

  // Section helpers
  function addSection(type: Section['type']) {
    if (!song) return;
    const label =
      type === 'verse' ? `Verse ${song.sections.filter((s) => s.type === 'verse').length + 1}` :
      type === 'chorus' ? 'Chorus' :
      type === 'pre-chorus' ? 'Pre-Chorus' :
      type === 'bridge' ? 'Bridge' :
      type === 'intro' ? 'Intro' : 'Outro';
    update({
      sections: [...song.sections, { id: crypto.randomUUID(), type, label, lines: [''] }],
    });
  }

  function updateSection(sectionId: string, patch: Partial<Section>) {
    if (!song) return;
    update({
      sections: song.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    });
  }

  function deleteSection(sectionId: string) {
    if (!song) return;
    const section = song.sections.find((s) => s.id === sectionId);
    const nowIso = new Date().toISOString();
    const cuts: GraveyardEntry[] = section
      ? section.lines
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
          .map((line) => ({ id: crypto.randomUUID(), line, section_label: section.label || section.type, cut_at: nowIso }))
      : [];
    update({
      sections: song.sections.filter((s) => s.id !== sectionId),
      graveyard: cuts.length ? [...cuts, ...(song.graveyard || [])] : song.graveyard,
    });
    if (cuts.length) toast.message(`${cuts.length} line${cuts.length === 1 ? '' : 's'} moved to graveyard`);
  }

  function restoreFromGraveyard(entry: GraveyardEntry) {
    if (!song) return;
    let nextSections = song.sections;
    if (focusedLine) {
      const section = song.sections.find((s) => s.id === focusedLine.sectionId);
      if (section) {
        const lines = [...section.lines];
        if (!lines[focusedLine.index]?.trim()) lines[focusedLine.index] = entry.line;
        else lines.splice(focusedLine.index + 1, 0, entry.line);
        nextSections = song.sections.map((s) => (s.id === section.id ? { ...s, lines } : s));
      }
    } else if (song.sections.length > 0) {
      const last = song.sections[song.sections.length - 1];
      nextSections = song.sections.map((s) =>
        s.id === last.id ? { ...s, lines: [...s.lines, entry.line] } : s
      );
    } else {
      nextSections = [{ id: crypto.randomUUID(), type: 'verse', label: 'Verse 1', lines: [entry.line] }];
    }
    update({
      sections: nextSections,
      graveyard: (song.graveyard || []).filter((e) => e.id !== entry.id),
    });
  }

  function discardFromGraveyard(entryId: string) {
    if (!song) return;
    update({ graveyard: (song.graveyard || []).filter((e) => e.id !== entryId) });
  }

  function applyTemplate(types: Section['type'][]) {
    if (!song) return;
    const hasContent = song.sections.some((s) => s.lines.some((l) => l.trim()));
    if (hasContent && !window.confirm('This will append the template sections to your existing song. Continue?')) return;

    const verseCount = { n: song.sections.filter((s) => s.type === 'verse').length };
    const newSections: Section[] = types.map((type) => {
      const label =
        type === 'verse' ? `Verse ${++verseCount.n}` :
        type === 'chorus' ? 'Chorus' :
        type === 'pre-chorus' ? 'Pre-Chorus' :
        type === 'bridge' ? 'Bridge' :
        type === 'intro' ? 'Intro' : 'Outro';
      return { id: crypto.randomUUID(), type, label, lines: [''] };
    });
    update({ sections: [...song.sections, ...newSections] });
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    if (!song) return;
    const idx = song.sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= song.sections.length) return;
    const next = [...song.sections];
    [next[idx], next[target]] = [next[target], next[idx]];
    update({ sections: next });
  }

  // ── Chord chart helpers (per-section) ────────────────────────────
  // Not rendered until Task 10 (ChordChartEditor / SectionChordSlot don't
  // exist yet), but kept intact so that task can reattach them as-is.
  function chartFor(section: Section): ChordChart | undefined {
    if (!song || !section.chart_id) return undefined;
    return song.chord_charts?.find((c) => c.id === section.chart_id);
  }

  function updateChart(chartId: string, next: ChordChart) {
    if (!song) return;
    const charts = song.chord_charts || [];
    update({
      chord_charts: charts.some((c) => c.id === chartId)
        ? charts.map((c) => (c.id === chartId ? next : c))
        : [...charts, next],
    });
  }

  function attachNewChart(sectionId: string) {
    if (!song) return;
    const newChart: ChordChart = {
      id: crypto.randomUUID(),
      time_signature: '4/4',
      bars: [],
      loop: null,
    };
    update({
      chord_charts: [...(song.chord_charts || []), newChart],
      sections: song.sections.map((s) => (s.id === sectionId ? { ...s, chart_id: newChart.id } : s)),
    });
  }

  function attachClipboardChart(sectionId: string) {
    if (!song || !chartClipboard) return;
    const exists = song.chord_charts?.some((c) => c.id === chartClipboard);
    if (!exists) {
      toast.error('Clipboard chart no longer exists');
      setChartClipboard(null);
      return;
    }
    update({
      sections: song.sections.map((s) => (s.id === sectionId ? { ...s, chart_id: chartClipboard } : s)),
    });
    toast.success('Pasted linked chart');
  }

  function detachChart(sectionId: string) {
    if (!song) return;
    update({
      sections: song.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const next = { ...s };
        delete (next as { chart_id?: string }).chart_id;
        return next;
      }),
    });
  }

  function copyChartToClipboard(chartId: string) {
    setChartClipboard(chartId);
    toast.success('Chart copied — paste it into another section');
  }

  function chartRefCount(chartId: string): number {
    if (!song) return 0;
    return song.sections.filter((s) => s.chart_id === chartId).length;
  }

  // Receive a line suggestion → insert at focused position
  // (Consumed by AIPanel, not rendered until Task 9 — kept intact.)
  function insertLine(line: string) {
    if (!song || !focusedLine) {
      toast.message('Click a line first to choose where this goes');
      return;
    }
    const section = song.sections.find((s) => s.id === focusedLine.sectionId);
    if (!section) return;
    const lines = [...section.lines];
    // If the focused line is empty, replace it; otherwise insert after
    if (!lines[focusedLine.index]?.trim()) {
      lines[focusedLine.index] = line;
    } else {
      lines.splice(focusedLine.index + 1, 0, line);
    }
    updateSection(section.id, { lines });
  }

  function replaceLine(line: string) {
    if (!song || !focusedLine) return;
    const section = song.sections.find((s) => s.id === focusedLine.sectionId);
    if (!section) return;
    const lines = [...section.lines];
    lines[focusedLine.index] = line;
    updateSection(section.id, { lines });
  }

  if (!song) {
    return <div className="p-4 md:p-6 max-w-4xl mx-auto text-sm text-muted-foreground">Loading song…</div>;
  }

  // Derived values for AIPanel — that component isn't rendered until Task 9,
  // but these stay live (not commented) so the wiring is a straight drop-in
  // when it lands. (Project tsconfig has noUnusedLocals/noUnusedParameters
  // off, so leaving these computed-but-unused is safe for the build.)
  const currentLine = focusedLine
    ? song.sections.find((s) => s.id === focusedLine.sectionId)?.lines[focusedLine.index] || ''
    : '';
  const currentSection = focusedLine ? song.sections.find((s) => s.id === focusedLine.sectionId) : null;
  const prevLines = currentSection
    ? currentSection.lines.slice(0, (focusedLine?.index ?? 0)).filter((l) => l.trim())
    : [];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <TopBar
        highlightRhymes={highlightRhymes}
        onToggleRhymes={() => setHighlightRhymes((v) => !v)}
        saveState={saveState}
        visibility={song.visibility}
        onVisibilityChange={handleVisibilityChange}
      />

      {/* Compact recorder for mobile/iPad — sits near Play lyrics so it's always reachable.
          <RecorderPanel songId={song.id} compact /> restored in Task 11 */}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        {/* Editor column */}
        <div>
          <input
            type="text"
            value={song.title}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full font-serif text-3xl md:text-4xl font-bold bg-transparent border-0 focus:outline-none mb-2 text-foreground"
            placeholder="Untitled"
          />

          {/* Song meta */}
          <div className="flex gap-4 mb-8 text-sm">
            <input
              type="text"
              value={song.key_signature || ''}
              onChange={(e) => update({ key_signature: e.target.value || null })}
              placeholder="Key (e.g. G major)"
              className="bg-transparent border-b border-border focus:border-primary focus:outline-none px-0 py-1 text-foreground placeholder:text-muted-foreground/60 w-36"
            />
            <input
              type="number"
              value={song.tempo_bpm || ''}
              onChange={(e) => update({ tempo_bpm: e.target.value ? Number(e.target.value) : null })}
              placeholder="BPM"
              className="bg-transparent border-b border-border focus:border-primary focus:outline-none px-0 py-1 text-foreground placeholder:text-muted-foreground/60 w-20"
            />
          </div>

          {/* Sections — each with its own optional chord chart slot */}
          <div className="space-y-8">
            {song.sections.map((section, i) => (
              <div key={section.id}>
                <SectionBlock
                  section={section}
                  canMoveUp={i > 0}
                  canMoveDown={i < song.sections.length - 1}
                  focusedLine={focusedLine?.sectionId === section.id ? focusedLine.index : null}
                  highlightRhymes={highlightRhymes}
                  onChange={(patch) => updateSection(section.id, patch)}
                  onDelete={() => deleteSection(section.id)}
                  onMoveUp={() => moveSection(section.id, -1)}
                  onMoveDown={() => moveSection(section.id, 1)}
                  onFocusLine={(index) => setFocusedLine({ sectionId: section.id, index })}
                  onSelectWord={setSelectedWord}
                />
                {/* <SectionChordSlot
                  section={section}
                  chart={chartFor(section)}
                  bpm={song.tempo_bpm}
                  refCount={chartFor(section) ? chartRefCount(chartFor(section)!.id) : 0}
                  clipboardChart={chartClipboard ? song.chord_charts?.find((c) => c.id === chartClipboard) ?? null : null}
                  clipboardChartLabel={null}
                  onChartChange={(next) => updateChart(next.id, next)}
                  onTempoChange={(tempo_bpm) => update({ tempo_bpm: tempo_bpm > 0 ? tempo_bpm : null })}
                  onAttachNew={attachNewChart}
                  onAttachClipboard={attachClipboardChart}
                  onCopy={copyChartToClipboard}
                  onDetach={detachChart}
                /> restored in Task 10 alongside ChordChartEditor */}
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-10">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</label>
            <textarea
              value={song.notes}
              onChange={(e) => update({ notes: e.target.value })}
              placeholder="Story, mood, references, arrangement ideas…"
              className="w-full min-h-[120px] bg-card border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Graveyard — cut lines saved here for restore */}
          {song.graveyard && song.graveyard.length > 0 && (
            <details className="mt-10 border border-border rounded-md bg-card">
              <summary className="px-4 py-2 cursor-pointer text-xs uppercase tracking-wider text-muted-foreground select-none">
                Graveyard · {song.graveyard.length} cut line{song.graveyard.length === 1 ? '' : 's'}
              </summary>
              <ul className="divide-y divide-border">
                {song.graveyard.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="font-serif text-sm text-foreground truncate">{g.line}</div>
                      <div className="text-xs text-muted-foreground">
                        {g.section_label ? `${g.section_label} · ` : ''}{new Date(g.cut_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => restoreFromGraveyard(g)}
                      className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary"
                      title="Restore to focused line / end of song"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => discardFromGraveyard(g.id)}
                      className="text-xs text-rose-500 hover:text-rose-700 px-1"
                      title="Discard permanently"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}

        </div>

        {/* AI panel + Recordings */}
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Sections
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {(['verse', 'pre-chorus', 'chorus', 'bridge', 'intro', 'outro'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => addSection(t)}
                  className="px-2.5 py-1 text-xs border border-border rounded-md hover:bg-muted capitalize"
                >
                  + {t}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <TemplateMenu onApply={applyTemplate} />
            </div>
          </div>

          {/* <AIPanel
            selectedWord={selectedWord}
            currentLine={currentLine}
            previousLines={prevLines}
            sectionType={currentSection?.type || 'verse'}
            onInsertLine={insertLine}
            onReplaceLine={replaceLine}
          /> restored in Task 9 */}

          <div className="hidden lg:block">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Recordings
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {/* <RecorderPanel songId={song.id} /> restored in Task 11 */}
          </div>
        </div>
      </div>
    </div>
  );
}

const SECTION_TEMPLATES: { name: string; description: string; types: Section['type'][] }[] = [
  { name: 'Pop standard', description: 'V – C – V – C – B – C', types: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'] },
  { name: 'Verse / chorus', description: 'V – C – V – C', types: ['verse', 'chorus', 'verse', 'chorus'] },
  { name: 'Folk', description: 'V – V – C – V – C', types: ['verse', 'verse', 'chorus', 'verse', 'chorus'] },
  { name: 'Ballad (AABA)', description: 'V – V – B – V', types: ['verse', 'verse', 'bridge', 'verse'] },
  { name: 'Full arc', description: 'I – V – C – V – C – B – C – O', types: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'] },
];

function TemplateMenu({ onApply }: { onApply: (types: Section['type'][]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted inline-flex items-center gap-1"
      >
        ≡ Templates
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 left-0 min-w-[16rem] bg-card border border-border rounded-md shadow-lg p-1">
            {SECTION_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => { onApply(t.types); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded hover:bg-muted"
              >
                <div className="text-sm font-medium text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.description}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

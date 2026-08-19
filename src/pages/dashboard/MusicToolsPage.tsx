// Standalone Music Tools page — Metronome, Pitch Pipe, Tuner stacked
// together. Same three components used inside the Viewer's Tools sheet,
// so a user can reach them either while reading a score or directly from
// the side nav for a quick warm-up / tuning check without opening a PDF.
//
// Piano sits at the BOTTOM (where a player's hands naturally rest on a
// tablet) and has a Stage Mode toggle that hands the keyboard a full
// 7-octave scrolling surface while the other tools collapse to a
// compact strip at the top.

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Metronome } from '@/components/audioTools/Metronome';
import { PitchPipe } from '@/components/audioTools/PitchPipe';
import { Tuner } from '@/components/audioTools/Tuner';
import { InstrumentPlayer } from '@/components/audioTools/InstrumentPlayer';
import { StandalonePiano } from '@/components/audioTools/StandalonePiano';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function MusicToolsPage() {
  const [pianoExpanded, setPianoExpanded] = useState(false);

  // URL context so other surfaces can link a user straight to the tool they
  // need rather than to a page of five tools:
  //   ?tool=metronome|pitch|tuner|piano   scroll to (and highlight) one tool
  //   ?bpm=120                            seed the metronome's tempo
  // Previously this page read no params at all, so a practice task could only
  // say "go to Music Tools" and leave the rest to the student.
  const [search] = useSearchParams();
  const tool = search.get('tool');
  const bpmParam = Number(search.get('bpm'));
  const initialBpm = Number.isFinite(bpmParam) && bpmParam > 0 ? bpmParam : undefined;
  const focusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (tool === 'piano') { setPianoExpanded(true); return; }
    if (!tool || !focusRef.current) return;
    // Wait for layout so the scroll lands accurately on first paint.
    const id = requestAnimationFrame(() => {
      focusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(id);
  }, [tool]);

  const highlight = 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg';

  // Hide the dashboard sidebar in stage mode so the keyboard can fill the
  // viewport. Class is read by DashboardShell's <aside> via a CSS rule in
  // index.css; reverts when stage mode is toggled off or the page unmounts.
  useEffect(() => {
    if (!pianoExpanded) return;
    document.body.classList.add('gw-stage-mode');
    return () => { document.body.classList.remove('gw-stage-mode'); };
  }, [pianoExpanded]);

  if (pianoExpanded) {
    // Stage mode — tools shrink to a header strip, piano fills the rest.
    return (
      <div className="h-[calc(100dvh-4.5rem)] flex flex-col">
        <header className="px-4 sm:px-6 pt-3 pb-2 border-b border-border bg-card">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight">Music Tools</h1>
              <p className="text-xs text-muted-foreground">Stage mode — scroll the keyboard to reach any octave.</p>
            </div>
            {/* Explicit exit affordance — Stage Mode hides the dashboard
                sidebar to let the keyboard take the width, and users
                reported "no nav" not realizing the piano's "Collapse"
                button was what to click. This button matches what they
                actually mean and puts it in the page header where they'd
                look for navigation. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPianoExpanded(false)}
              className="rounded-full"
              title="Return to normal layout with the sidebar"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Exit stage mode
            </Button>
          </div>
          {/* Tools collapsed into a horizontal strip. Each one occupies
              about a third of the width so the keyboard still gets the
              bottom of the viewport on iPad. */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Metronome />
            <PitchPipe />
            <Tuner />
            <InstrumentPlayer />
          </div>
        </header>
        <div className="flex-1 min-h-0 p-2 sm:p-3">
          <StandalonePiano
            className="h-full flex flex-col"
            expanded
            onToggleExpand={() => setPianoExpanded(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 pt-8 sm:pt-10 pb-6 space-y-4">
      <header>
        <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight">Music Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Piano, metronome, pitch pipe, guitar tuner, and an instrument-voice player — also available inside any score's Tools sheet in the Viewer.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <div ref={tool === 'metronome' ? focusRef : undefined}
             className={tool === 'metronome' ? highlight : undefined}>
          <Metronome initialBpm={initialBpm} />
        </div>
        <div ref={tool === 'pitch' ? focusRef : undefined}
             className={tool === 'pitch' ? highlight : undefined}>
          <PitchPipe />
        </div>
        <div ref={tool === 'tuner' ? focusRef : undefined}
             className={tool === 'tuner' ? highlight : undefined}>
          <Tuner />
        </div>
        <InstrumentPlayer />
      </div>
      {/* Piano lives at the bottom — where the player's hands naturally
          rest on an iPad. Tap "Stage mode" to expand into a full 88-key
          scrolling keyboard with real piano-key proportions. */}
      <StandalonePiano
        expanded={false}
        onToggleExpand={() => setPianoExpanded(true)}
      />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronUp, Mic, X } from 'lucide-react';
import { useIsPhone } from '@/hooks/use-mobile';
import { useAssistantOptional } from '@/lib/assistant/AssistantProvider';
import { sectionKeyFromPath, isFabCollapsed, setFabCollapsed } from '@/lib/assistant/fabPrefs';
import { cn } from '@/lib/utils';

const CAPTION_MS = 6000;

// Floating assistant entry point: tenant-glass mic (primary, voice-first)
// + caret that opens the chat sheet. Lives bottom-right on every
// dashboard page; the × collapses it to an edge dot, remembered per
// section (fabPrefs). Hidden entirely while the sheet or a video call is
// up — the sheet has its own mic and the call owns the screen.
export const AssistantFab = () => {
  const assistant = useAssistantOptional();
  const { pathname } = useLocation();
  const isPhone = useIsPhone();
  const section = sectionKeyFromPath(pathname);
  const [collapsed, setCollapsed] = useState(() => isFabCollapsed(section));
  // Re-read the pref when the section changes (collapse is per-section).
  useEffect(() => { setCollapsed(isFabCollapsed(section)); }, [section]);

  // Caption fades a few seconds after the spoken reply lands.
  const captionReply = assistant?.captionReply ?? null;
  const [visibleCaptionId, setVisibleCaptionId] = useState<string | null>(null);
  useEffect(() => {
    if (!captionReply) return;
    setVisibleCaptionId(captionReply.id);
    const t = setTimeout(() => setVisibleCaptionId(null), CAPTION_MS);
    return () => clearTimeout(t);
  }, [captionReply]);

  if (!assistant) return null;
  const { sheetOpen, setSheetOpen, micAvailable, listening, transcript, toggleMic, videoRoom, state } = assistant;
  if (sheetOpen || videoRoom) return null;

  // Above the floating MobileBottomNav pill on phones; corner on desktop.
  const bottom = isPhone
    ? 'calc(max(16px, env(safe-area-inset-bottom)) + 76px)'
    : '1.25rem';

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Show assistant"
        onClick={() => { setCollapsed(false); setFabCollapsed(section, false); }}
        className="fixed right-0 z-40 h-8 w-4 rounded-l-full bg-primary/25 backdrop-blur-xl border border-r-0 border-primary/30 shadow-md hover:bg-primary/40 transition-colors"
        style={{ bottom }}
      />
    );
  }

  const caption = listening
    ? (transcript || 'Listening…')
    : state.busy
      ? '…'
      : visibleCaptionId && captionReply?.id === visibleCaptionId
        ? captionReply.text
        : null;

  return (
    <div className="fixed right-4 z-40 flex flex-col items-end gap-2" style={{ bottom }}>
      {caption && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="max-w-[75vw] sm:max-w-sm rounded-2xl bg-background/70 backdrop-blur-xl border border-primary/30 shadow-lg px-3.5 py-2.5 text-sm text-left text-foreground"
        >
          {caption}
        </button>
      )}
      <div className="group relative flex items-center gap-1.5 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/30 shadow-lg p-1.5">
        <button
          type="button"
          aria-label="Hide assistant on this page"
          onClick={() => { setCollapsed(true); setFabCollapsed(section, true); }}
          className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-background/80 backdrop-blur border border-border shadow flex items-center justify-center text-muted-foreground opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
        <button
          type="button"
          aria-label="Open assistant chat"
          onClick={() => setSheetOpen(true)}
          className="h-8 w-8 rounded-full flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        {micAvailable && (
          <button
            type="button"
            aria-label="Talk to the assistant"
            onClick={toggleMic}
            className={cn(
              'h-11 w-11 rounded-full flex items-center justify-center transition-colors',
              listening
                ? 'bg-destructive/20 text-destructive animate-pulse'
                : 'bg-primary/25 text-primary hover:bg-primary/35',
            )}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

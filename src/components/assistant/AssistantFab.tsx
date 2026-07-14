import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronUp, Mic, Square, X } from 'lucide-react';
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
  const { sheetOpen, setSheetOpen, micAvailable, listening, transcript, toggleMic, speaking, stopSpeaking, videoRoom, state } = assistant;
  if (sheetOpen || videoRoom) return null;

  // Immersive full-screen routes (Viewer reader, Studio session editor)
  // cover the MobileBottomNav, so the FAB drops to the very corner there
  // instead of floating 76px up to clear a nav that isn't visible. On
  // normal phone pages it still sits above the nav pill; desktop is the
  // corner.
  const isImmersive =
    /^\/dashboard\/viewer\/[^/]+/.test(pathname) ||
    /^\/studio\/sessions\/[^/]+/.test(pathname);
  const bottom = isImmersive
    ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)'
    : isPhone
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
      <div className="group relative flex items-center gap-1 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/30 shadow-lg p-1">
        <button
          type="button"
          aria-label="Hide assistant on this page"
          onClick={() => { setCollapsed(true); setFabCollapsed(section, true); }}
          className="absolute -top-1.5 -left-1.5 h-4 w-4 rounded-full bg-background/80 backdrop-blur border border-border shadow flex items-center justify-center text-muted-foreground opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        >
          <X className="w-2.5 h-2.5" />
        </button>
        <button
          type="button"
          aria-label="Open assistant chat"
          onClick={() => setSheetOpen(true)}
          className="h-6 w-6 rounded-full flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        {/* While she's speaking, the primary button is a Stop — one tap
            silences her (Kevin: "she won't stop talking"). Otherwise it's
            the mic; tapping the mic also barges in (stops speech) via the
            provider. */}
        {speaking ? (
          <button
            type="button"
            aria-label="Stop talking"
            onClick={stopSpeaking}
            className="h-9 w-9 rounded-full flex items-center justify-center bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : micAvailable && (
          <button
            type="button"
            aria-label="Talk to the assistant"
            onClick={toggleMic}
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center transition-colors',
              listening
                ? 'bg-destructive/20 text-destructive animate-pulse'
                : 'bg-primary/25 text-primary hover:bg-primary/35',
            )}
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AudioLines, ChevronUp, Mic, Settings2, Square, X } from 'lucide-react';
import { AssistantQuickSettings } from './AssistantQuickSettings';
import { useIsCompactNav } from '@/hooks/use-mobile';
import { useAssistantOptional } from '@/lib/assistant/AssistantProvider';
import { sectionKeyFromPath, isFabCollapsed, setFabCollapsed } from '@/lib/assistant/fabPrefs';
import { cn } from '@/lib/utils';

const CAPTION_MS = 6000;

// Floating assistant entry point: tenant-glass mic (primary, voice-first)
// + caret that opens the chat sheet.
//
// RESTS as a tab on the right edge and slides out when tapped. It used to
// float over the bottom-right corner by default, which is exactly where
// pages put their Save button (Kevin: "assistant always blocks right bottom
// corner"). Pulling it out is remembered per section, so a page where you
// actually talk to it keeps it out; everywhere else stays clear.
//
// Hidden entirely while the sheet or a video call is up — the sheet has its
// own mic and the call owns the screen.
export const AssistantFab = () => {
  const assistant = useAssistantOptional();
  const { pathname } = useLocation();
  // Tracks the docked bottom tab bar's own <768 gate so the FAB floats
  // above the bar exactly when the bar exists.
  const isCompactNav = useIsCompactNav();
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
  const { sheetOpen, setSheetOpen, micAvailable, listening, transcript, toggleMic, speaking, stopSpeaking, videoRoom, state, liveStatus, startLive, endLive, muted, toggleMute } = assistant;
  if (sheetOpen || videoRoom) return null;

  // Immersive full-screen routes (Viewer reader, Studio session editor)
  // cover the MobileBottomNav, so the FAB drops to the very corner there
  // instead of floating up to clear a nav that isn't visible. On normal
  // phone pages it sits just above the docked nav bar (bar = 56px tall +
  // bottom safe-area inset, + a small gap); desktop is the corner.
  const isImmersive =
    /^\/dashboard\/viewer\/[^/]+/.test(pathname) ||
    /^\/studio\/sessions\/[^/]+/.test(pathname);
  const bottom = isImmersive
    ? 'calc(env(safe-area-inset-bottom, 0px) + 12px)'
    : isCompactNav
      ? 'calc(env(safe-area-inset-bottom, 0px) + 68px)'
      : '1.25rem';

  // Tucked: a tab on the right edge, which is the RESTING state. The old
  // version of this was a bare 16x32 sliver with no icon — findable only if
  // you already knew it was there, and well under a 44pt touch target. It
  // now carries the mic so it reads as the assistant, and is tall enough to
  // hit with a thumb.
  if (collapsed) {
    return (
      <button
        type="button"
        aria-label="Show assistant"
        title="Assistant"
        onClick={() => { setCollapsed(false); setFabCollapsed(section, false); }}
        className="fixed right-0 z-40 flex h-11 w-7 items-center justify-center rounded-l-full border border-r-0 border-border bg-background/85 text-primary shadow-md backdrop-blur-xl transition-colors hover:bg-muted"
        style={{ bottom }}
      >
        <Mic className="h-4 w-4" aria-hidden />
      </button>
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
      {/* Neutral adaptive surface (Kevin 2026-08-03): the old bg-primary/20
          translucency dissolved into photo/dark backgrounds — the pill now
          sits on the theme's background token at near-opacity so it reads
          on ANY backdrop, with primary reserved for the icons. */}
      <div className="group relative flex items-center gap-1 rounded-full bg-background/85 backdrop-blur-xl border border-border shadow-lg p-1 animate-in slide-in-from-right-4 fade-in duration-200">
        <button
          type="button"
          aria-label="Hide assistant on this page"
          title="Tuck away"
          onClick={() => { setCollapsed(true); setFabCollapsed(section, true); }}
          className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full bg-background/90 backdrop-blur border border-border shadow flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
        {/* Two distinct destinations, so a tap is never a guess:
              caret  → the chat, where you read and type
              gear   → settings, in a small window anchored here
            The mic stays the primary voice control it always was. */}
        <button
          type="button"
          aria-label="Open assistant chat"
          title="Open chat"
          onClick={() => setSheetOpen(true)}
          className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <AssistantQuickSettings muted={muted} onToggleMute={toggleMute}>
          <button
            type="button"
            aria-label="Assistant settings"
            title="Assistant settings"
            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </AssistantQuickSettings>
        {/* While she's speaking, the primary button is a Stop — one tap
            silences her (Kevin: "she won't stop talking"). Otherwise it's
            the mic; tapping the mic also barges in (stops speech) via the
            provider. */}
        {/* Live conversation (ElevenLabs full-duplex): while live, the
            agent hears the user THROUGH its own speech — voice interrupts
            voice, no tapping. The live button replaces the push-to-talk
            mic's job entirely for the session, so mic/stop hide. */}
        {liveStatus !== 'off' ? (
          <button
            type="button"
            aria-label="End live conversation"
            title="End live conversation"
            onClick={endLive}
            className={cn(
              'h-9 rounded-full px-3 flex items-center gap-1.5 transition-colors bg-destructive/20 text-destructive hover:bg-destructive/30',
              liveStatus === 'connecting' && 'opacity-70',
            )}
          >
            <AudioLines className={cn('w-4 h-4', liveStatus === 'live' && 'animate-pulse')} />
            <span className="text-xs font-semibold">{liveStatus === 'connecting' ? '…' : 'End'}</span>
          </button>
        ) : speaking ? (
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
        {liveStatus === 'off' && (
          <button
            type="button"
            aria-label="Start live conversation"
            title="Live conversation — talk naturally, your voice can interrupt"
            onClick={startLive}
            className="h-9 w-9 rounded-full flex items-center justify-center text-primary/80 hover:bg-primary/20 transition-colors"
          >
            <AudioLines className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

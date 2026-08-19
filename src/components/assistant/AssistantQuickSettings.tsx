import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Volume2, VolumeX } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { speak } from '@/lib/assistant/speech';
import {
  ASSISTANT_VOICES, BROWSER_VOICE_ID, DEFAULT_VOICE_ID, useMyAssistantVoice,
} from '@/lib/assistant/voices';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

/**
 * Assistant settings, reachable from the FAB instead of only from Workspace
 * Settings → Branding.
 *
 * Both settings here are PER USER:
 *
 *  - Mute lives in localStorage. Per device, which is right — you mute on the
 *    laptop in an office, not on your phone.
 *  - Voice is a personal OVERRIDE stored in user_preferences. Leaving it unset
 *    keeps whatever the workspace branded, so tenants that already chose a
 *    voice are unaffected and nothing needed backfilling.
 *
 * The tenant's branding voice remains the default everyone starts from, and is
 * still edited in Workspace Settings — this panel never writes branding.
 * gw_branding_settings has a known trap (a bare upsert without
 * onConflict:'tenant_id' and a tenant pin has poisoned the main tenant's row
 * twice), and a second write path behind a popover would be a third way to get
 * that wrong.
 */
export function AssistantQuickSettings({
  muted, onToggleMute, children,
}: {
  muted: boolean;
  onToggleMute: () => void;
  children: React.ReactNode;
}) {
  const { settings } = useBrandingSettings();
  const { voiceId: mine, save } = useMyAssistantVoice();

  const tenantVoice =
    (settings as { assistant_voice_id?: string | null })?.assistant_voice_id || DEFAULT_VOICE_ID;
  // WORKSPACE is the sentinel for "no personal choice" — a Select can't hold
  // null, and an empty string renders as a blank trigger.
  const WORKSPACE = '__workspace__';
  const current = mine ?? WORKSPACE;
  const tenantLabel =
    tenantVoice === BROWSER_VOICE_ID
      ? 'Browser default'
      : ASSISTANT_VOICES.find((v) => v.id === tenantVoice)?.label ?? 'App default';

  const pick = async (value: string) => {
    const voiceId = value === WORKSPACE ? null : value;
    const heard = voiceId ?? tenantVoice;
    const { data: { session } } = await supabase.auth.getSession();
    // Preview bypasses mute on purpose: picking a voice is an explicit action,
    // not an assistant reply.
    speak('This is how I sound.', {
      voiceId: heard,
      accessToken: session?.access_token,
      supabaseUrl: SUPABASE_URL,
      volume: 0.55,
      muted: false,
    });
    save.mutate(voiceId);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-72 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Assistant</h3>
          <p className="text-xs text-muted-foreground">Voice and sound settings.</p>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="flex w-full items-center justify-between gap-3 border border-border px-3 py-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2 text-sm">
            {muted ? <VolumeX className="w-4 h-4" aria-hidden /> : <Volume2 className="w-4 h-4" aria-hidden />}
            {muted ? 'Replies are muted' : 'Replies are spoken'}
          </span>
          <span className="text-xs text-muted-foreground">{muted ? 'Unmute' : 'Mute'}</span>
        </button>

        <div className="space-y-1.5">
          <Label className="text-xs">Voice</Label>
          <Select value={current} onValueChange={pick} disabled={save.isPending}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-[50vh]">
              <SelectItem value={WORKSPACE}>Workspace voice ({tenantLabel})</SelectItem>
              {ASSISTANT_VOICES.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
              ))}
              <SelectItem value={BROWSER_VOICE_ID}>Browser default</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Your choice, on every device you sign in to. Picking one plays a
            preview and saves it.
          </p>
        </div>

        <Link
          to="/dashboard/workspace?tab=branding"
          className="flex items-center gap-1.5 text-xs text-[hsl(var(--link))] hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          Workspace branding
        </Link>
      </PopoverContent>
    </Popover>
  );
}

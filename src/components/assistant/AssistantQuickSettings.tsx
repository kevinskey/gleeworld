import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Volume2, VolumeX } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { speak } from '@/lib/assistant/speech';
import { ASSISTANT_VOICES, BROWSER_VOICE_ID, DEFAULT_VOICE_ID } from '@/lib/assistant/voices';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';

/**
 * Assistant settings, reachable from the FAB instead of only from Workspace
 * Settings → Branding.
 *
 * Two kinds of setting live here and they are NOT the same:
 *
 *  - Mute is PER USER, in localStorage. Anyone can change it, and it only
 *    affects them.
 *  - Voice is PER TENANT — it is branding, the voice everyone in the workspace
 *    hears — so it stays admin-only. Non-admins see which voice is set and can
 *    preview it, but the control is disabled rather than hidden, because a
 *    setting that silently vanishes reads as a bug.
 *
 * Keeping the voice tenant-wide is deliberate: making it per-user here would
 * quietly change what the field means and orphan the value tenants have
 * already chosen.
 *
 * This panel deliberately does NOT write branding. gw_branding_settings has a
 * known trap — a bare upsert without onConflict:'tenant_id' and a tenant pin
 * has poisoned the main tenant's row twice — and the safe write already exists
 * in Workspace Settings. Duplicating it behind a popover would be a third way
 * to get it wrong, so the voice is previewed here and changed there.
 */
export function AssistantQuickSettings({
  muted, onToggleMute, children,
}: {
  muted: boolean;
  onToggleMute: () => void;
  children: React.ReactNode;
}) {
  const { settings } = useBrandingSettings();
  const { profile } = useUserRole();
  const canManage =
    !!profile && (
      (profile as { is_admin?: boolean }).is_admin === true ||
      (profile as { is_super_admin?: boolean }).is_super_admin === true ||
      ['admin', 'super_admin', 'super-admin'].includes(String((profile as { role?: string }).role ?? ''))
    );

  const current =
    (settings as { assistant_voice_id?: string | null })?.assistant_voice_id || DEFAULT_VOICE_ID;
  const voiceLabel =
    current === BROWSER_VOICE_ID
      ? 'Browser default'
      : ASSISTANT_VOICES.find((v) => v.id === current)?.label ?? 'App default';
  const [previewing, setPreviewing] = useState(false);

  const preview = async () => {
    setPreviewing(true);
    const { data: { session } } = await supabase.auth.getSession();
    // Preview bypasses mute on purpose: this is an explicit action, not an
    // assistant reply.
    speak('This is how I sound.', {
      voiceId: current,
      accessToken: session?.access_token,
      supabaseUrl: SUPABASE_URL,
      volume: 0.55,
      muted: false,
      onEnd: () => setPreviewing(false),
    });
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
          <div className="flex items-center justify-between gap-2 border border-border px-3 py-2">
            <span className="text-sm truncate">{voiceLabel}</span>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={preview}
              disabled={previewing}
            >
              {previewing ? 'Playing…' : 'Preview'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {canManage
              ? 'The voice everyone in this workspace hears.'
              : 'Set for the whole workspace by an administrator.'}
          </p>
        </div>

        {canManage && (
          <Link
            to="/dashboard/workspace?tab=branding"
            className="flex items-center gap-1.5 text-xs text-[hsl(var(--link))] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            Change voice in Branding
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}

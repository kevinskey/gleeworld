// Calendar settings — manage Calendars (CRUD against gw_calendars) and view
// the Category palette. Categories are sourced from CATEGORY_CONFIGS, which is
// a hardcoded constant in CommandCenterCalendar.tsx; a real categories table
// + UI would land in a follow-up. For now this gives directors a single place
// to organize the calendar surface from inside the dashboard shell.

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Eye, EyeOff, Loader2, Copy, RefreshCw, Apple, ExternalLink, Link2, Link2Off } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useEventCategories,
  useCreateEventCategory,
  useDeleteEventCategory,
} from '@/hooks/useEventCategories';
import {
  useGoogleConnection,
  useStartGoogleOAuth,
  useSyncGoogle,
  useDisconnectGoogle,
  usePushAllToGoogle,
  useGoogleCalendarSubscriptions,
  useRefreshGoogleCalendars,
  useToggleGoogleCalendar,
  hasWriteScope,
} from '@/hooks/useGoogleConnection';
import { useAuth } from '@/contexts/AuthContext';
import { IosCalendarPanel } from './IosCalendarPanel';

interface CalendarRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_visible: boolean;
  is_default: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: 'calendars' | 'categories' | 'sync';
}

export function CalendarSettingsDialog({ open, onOpenChange, initialTab = 'calendars' }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Calendar Settings</DialogTitle>
          <DialogDescription>
            Manage event categories, calendar subscriptions, and external sync.
          </DialogDescription>
        </DialogHeader>

        <Tabs key={open ? initialTab : 'closed'} defaultValue={initialTab} className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="calendars">Calendars</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
          </TabsList>

          <TabsContent value="calendars" className="mt-4">
            <CalendarsTab />
          </TabsContent>
          <TabsContent value="categories" className="mt-4">
            <CategoriesTab />
          </TabsContent>
          <TabsContent value="sync" className="mt-4">
            <SyncTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Calendars tab ──────────────────────────────────────────────────────────

function CalendarsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#0891b2');
  const [busy, setBusy] = useState(false);

  // Pull every calendar (hidden + visible) so admins can manage them all.
  // RLS already scopes to the caller's tenant; tenant_id is set by the
  // table's DEFAULT current_tenant_id() on insert.
  const { data: calendars = [], isLoading } = useQuery<CalendarRow[]>({
    queryKey: ['calendar-settings-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_calendars')
        .select('id, name, description, color, is_visible, is_default')
        .order('name');
      if (error) throw error;
      return (data as CalendarRow[]) || [];
    },
  });

  async function createCalendar() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('gw_calendars').insert({
        name: newName.trim(),
        color: newColor,
        is_visible: true,
        is_default: false,
      });
      if (error) throw error;
      setNewName('');
      qc.invalidateQueries({ queryKey: ['calendar-settings-all'] });
      qc.invalidateQueries({ queryKey: ['calendars'] });
      toast({ title: 'Calendar created' });
    } catch (e: any) {
      toast({ title: 'Could not create', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisibility(id: string, next: boolean) {
    const { error } = await supabase.from('gw_calendars').update({ is_visible: next }).eq('id', id);
    if (error) {
      toast({ title: 'Could not update', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['calendar-settings-all'] });
    qc.invalidateQueries({ queryKey: ['calendars'] });
  }

  async function removeCalendar(id: string, _name: string) {
    const { error } = await supabase.from('gw_calendars').delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    qc.invalidateQueries({ queryKey: ['calendar-settings-all'] });
    qc.invalidateQueries({ queryKey: ['calendars'] });
    toast({ title: 'Calendar deleted' });
  }

  return (
    <div className="space-y-4">
      {/* Add new */}
      <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add a calendar
        </Label>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Concert Choir, Bowman Scholars"
            className="flex-1"
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-10 w-10 rounded border border-border cursor-pointer"
            title="Pick a color"
          />
          <Button onClick={createCalendar} disabled={busy || !newName.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
      ) : calendars.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
          No calendars yet. Add one above to get started.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {calendars.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: c.color || '#94a3b8' }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {c.name}
                  {c.is_default && <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">default</span>}
                </div>
                {c.description && (
                  <div className="text-xs text-muted-foreground truncate">{c.description}</div>
                )}
              </div>
              <button
                onClick={() => toggleVisibility(c.id, !c.is_visible)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted"
                title={c.is_visible ? 'Hide from calendar' : 'Show on calendar'}
              >
                {c.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              {!c.is_default && (
                <button
                  onClick={() => removeCalendar(c.id, c.name)}
                  className="text-rose-600 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50"
                  title="Delete calendar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Categories tab ─────────────────────────────────────────────────────────
// Tenant-scoped CRUD against public.gw_event_categories. Defaults seeded by
// the migration have is_default=true so the trash icon is hidden on them.

function CategoriesTab() {
  const { toast } = useToast();
  const { data: categories = [], isLoading } = useEventCategories();
  const createMut = useCreateEventCategory();
  const deleteMut = useDeleteEventCategory();

  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#0891b2');

  async function create() {
    if (!newLabel.trim()) return;
    try {
      await createMut.mutateAsync({ label: newLabel.trim(), color: newColor });
      setNewLabel('');
      toast({ title: 'Category added' });
    } catch (e: any) {
      toast({ title: 'Could not add', description: e.message, variant: 'destructive' });
    }
  }

  async function remove(id: string, _label: string) {
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: 'Category deleted' });
    } catch (e: any) {
      toast({ title: 'Could not delete', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Add a category
        </Label>
        <div className="flex gap-2">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Workshops, Fundraising, Retreats"
            className="flex-1"
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-10 w-10 rounded border border-border cursor-pointer"
            title="Pick a color"
          />
          <Button
            onClick={create}
            disabled={createMut.isPending || !newLabel.trim()}
          >
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline" /></div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
          No categories yet. Add one above.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3">
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ background: c.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {c.label}
                  {c.is_default && (
                    <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">default</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{c.color}</div>
              </div>
              <button
                onClick={() => remove(c.id, c.label)}
                className="text-rose-600 hover:text-rose-700 p-1.5 rounded hover:bg-rose-50"
                title="Delete category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Sync tab — outbound iCal feed ──────────────────────────────────────────
// Pulls the caller's gw_profiles.ical_feed_token and renders a copy-able
// subscription URL plus per-provider paste instructions. "Regenerate"
// rotates the token, invalidating any existing subscription.

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://supabase.gleeworld.org';

function SyncTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: profile, isLoading } = useQuery<{ ical_feed_token: string } | null>({
    queryKey: ['ical-feed-token', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('ical_feed_token')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const feedUrl = profile?.ical_feed_token
    ? `${SUPABASE_URL}/functions/v1/ical-feed?token=${profile.ical_feed_token}`
    : '';

  async function copy() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Copy failed — select manually', variant: 'destructive' });
    }
  }

  async function rotate() {
    if (!user?.id) return;
    setBusy(true);
    try {
      // crypto.randomUUID is widely supported; fall back if not.
      const next = (globalThis.crypto as any)?.randomUUID?.() ?? null;
      const { error } = await supabase
        .from('gw_profiles')
        .update({ ical_feed_token: next })
        .eq('user_id', user.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['ical-feed-token', user.id] });
      toast({ title: 'New URL generated — old subscriptions will stop updating' });
    } catch (e: any) {
      toast({ title: 'Could not regenerate', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) {
    return <div className="text-center py-6"><Loader2 className="w-4 h-4 animate-spin inline" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Inbound: Google Calendar */}
      <GoogleConnectionPanel />
      <IosCalendarPanel />

      {/* Outbound: per-user iCal feed URL */}
      <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your personal feed URL
        </Label>
        <div className="flex gap-2">
          <Input value={feedUrl} readOnly onFocus={(e) => e.currentTarget.select()} className="flex-1 font-mono text-xs" />
          <Button onClick={copy} variant="outline" title="Copy URL">
            <Copy className="w-4 h-4" />
          </Button>
          <Button onClick={rotate} variant="ghost" disabled={busy} title="Regenerate URL (breaks existing subscriptions)">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This URL is your private subscription link. Anyone with it can read your GleeWorld events.
          Click the refresh icon to rotate it if it leaks.
        </p>
      </div>

      {/* Provider instructions */}
      <div className="space-y-3">
        <ProviderRow
          name="Google Calendar"
          steps={[
            'Open Google Calendar on desktop',
            'Left sidebar → Other calendars → +  → "From URL"',
            'Paste the URL above → Add calendar',
          ]}
          href="https://calendar.google.com/calendar/r/settings/addbyurl"
        />
        <ProviderRow
          name="Apple Calendar (iPhone / Mac)"
          steps={[
            'Mac: File → New Calendar Subscription → paste the URL',
            'iPhone: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste',
          ]}
          icon="apple"
        />
        <ProviderRow
          name="Outlook"
          steps={[
            'Outlook web → Calendar → Add calendar → Subscribe from web',
            'Paste the URL → Import',
          ]}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        Calendar apps poll for updates every few minutes to a few hours depending on the provider —
        new GleeWorld events may take a little while to appear.
      </p>
    </div>
  );
}

function ProviderRow({ name, steps, href, icon }: { name: string; steps: string[]; href?: string; icon?: 'apple' }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold inline-flex items-center gap-2">
          {icon === 'apple' && <Apple className="w-4 h-4" />}
          {name}
        </h4>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-5">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}

// ── Google Calendar inbound panel ──────────────────────────────────────────
// Shown above the outbound iCal section in the Sync tab. State:
//   - Not connected → "Connect Google Calendar" button. Calls
//     google-oauth-start, browser is sent to Google consent screen.
//     Until the GleeWorld admin sets GOOGLE_CLIENT_ID / _SECRET on the
//     edge-functions container, the start function returns 503 and we
//     surface that as "Not configured yet — your admin needs to set up
//     Google credentials."
//   - Connected → shows google_email, last_synced_at, "Sync now" and
//     "Disconnect" actions.

function GoogleConnectionPanel() {
  const { toast } = useToast();
  const { data: conn, isLoading } = useGoogleConnection();
  const startMut = useStartGoogleOAuth();
  const syncMut = useSyncGoogle();
  const disconnectMut = useDisconnectGoogle();
  const pushAllMut = usePushAllToGoogle();

  const writeScope = hasWriteScope(conn ?? null);

  async function connect() {
    try {
      await startMut.mutateAsync(window.location.pathname);
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('not configured') || msg.includes('503')) {
        toast({
          title: 'Google sync not set up yet',
          description: 'GleeWorld admin needs to add Google OAuth credentials. Once that\'s done you\'ll be able to connect.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Could not start connect', description: msg, variant: 'destructive' });
      }
    }
  }

  async function syncNow() {
    try {
      const r = await syncMut.mutateAsync();
      toast({ title: 'Google synced', description: `Fetched ${r.fetched}, upserted ${r.upserted}` });
    } catch (e: any) {
      toast({ title: 'Sync failed', description: e?.message || String(e), variant: 'destructive' });
    }
  }

  async function disconnect() {
    try {
      await disconnectMut.mutateAsync();
      toast({ title: 'Google disconnected' });
    } catch (e: any) {
      toast({ title: 'Disconnect failed', description: e?.message || String(e), variant: 'destructive' });
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Google Calendar
          </Label>
          {isLoading ? (
            <p className="text-sm text-muted-foreground mt-1">Loading…</p>
          ) : conn ? (
            <>
              <p className="text-sm font-medium mt-1 truncate">
                Connected as <span className="font-semibold">{conn.google_email || 'Google account'}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {conn.last_synced_at
                  ? <>Last sync {formatDistanceToNow(new Date(conn.last_synced_at), { addSuffix: true })}</>
                  : 'Not synced yet.'}
                {conn.last_error && (
                  <span className="block text-destructive mt-0.5 truncate">{conn.last_error}</span>
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Pull your personal Google events into GleeWorld so they appear alongside choir events.
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {conn ? (
          <>
            <Button onClick={syncNow} disabled={syncMut.isPending} variant="default" className="gap-2">
              {syncMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Pull from Google
            </Button>
            {writeScope ? (
              <Button
                onClick={async () => {
                  try {
                    const r = await pushAllMut.mutateAsync();
                    toast({ title: 'Pushed to Google', description: `${r.pushed} created, ${r.failed} failed` });
                  } catch (e: any) {
                    toast({ title: 'Push failed', description: e?.message || String(e), variant: 'destructive' });
                  }
                }}
                disabled={pushAllMut.isPending}
                variant="outline"
                className="gap-2"
              >
                {pushAllMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Push all to Google
              </Button>
            ) : (
              <Button onClick={connect} disabled={startMut.isPending} variant="outline" className="gap-2">
                <Link2 className="w-4 h-4" /> Upgrade to two-way sync
              </Button>
            )}
            <Button onClick={disconnect} disabled={disconnectMut.isPending} variant="ghost" className="gap-2">
              <Link2Off className="w-4 h-4" /> Disconnect
            </Button>
          </>
        ) : (
          <Button onClick={connect} disabled={startMut.isPending} className="gap-2">
            {startMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            Connect Google Calendar
          </Button>
        )}
      </div>

      {conn && !writeScope && (
        <p className="text-sm text-amber-700 mt-2">
          Your current connection is read-only. Click <span className="font-semibold">Upgrade to two-way sync</span> to grant
          write access — new and edited GleeWorld events will then appear in your Google calendar instantly.
        </p>
      )}

      {conn && <GoogleCalendarPicker />}
    </div>
  );
}

// ── Calendar picker ────────────────────────────────────────────────────────
// Lists every Google calendar the user can see and lets them choose which
// ones get pulled into GleeWorld. Backed by gw_google_calendar_subscriptions
// (one row per calendar, is_enabled flag).
function GoogleCalendarPicker() {
  const { toast } = useToast();
  const { data: subs = [], isLoading } = useGoogleCalendarSubscriptions();
  const refreshMut = useRefreshGoogleCalendars();
  const toggleMut = useToggleGoogleCalendar();

  async function refresh() {
    try {
      const r = await refreshMut.mutateAsync();
      toast({ title: 'Calendars refreshed', description: `Found ${r.found} on Google` });
    } catch (e: any) {
      toast({ title: 'Could not load calendars', description: e?.message || String(e), variant: 'destructive' });
    }
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3 mt-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Calendars to sync
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            Pick which of your Google calendars should appear in GleeWorld. Only enabled calendars get pulled.
          </p>
        </div>
        <Button
          onClick={refresh}
          disabled={refreshMut.isPending}
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
        >
          {refreshMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh list
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-2"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
      ) : subs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
          No calendars loaded yet. Click <span className="font-semibold">Refresh list</span> to pull them from Google.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
          {subs.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2">
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ background: s.background_color || '#94a3b8' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {s.summary || s.google_calendar_id}
                  {s.is_primary && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Primary</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground truncate">{s.google_calendar_id}</p>
              </div>
              <Switch
                checked={s.is_enabled}
                onCheckedChange={(next) => toggleMut.mutate({ id: s.id, enabled: next })}
                aria-label={`Toggle ${s.summary || s.google_calendar_id}`}
              />
            </li>
          ))}
        </ul>
      )}

      {subs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          After changing which calendars are enabled, click <span className="font-semibold">Pull from Google</span> above to re-sync events.
        </p>
      )}
    </div>
  );
}

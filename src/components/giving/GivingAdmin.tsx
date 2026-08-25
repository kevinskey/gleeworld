// Giving admin — campaign list, campaign detail, roster import, consent
// tracking, donor log, offline gifts, CSV export.
//
// The consent column is not decoration. Roster import creates every
// participant page unpublished on purpose; this screen is where a director
// sees at a glance who is still waiting on a permission slip and who is live.

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Loader2, Users, Link2, Check, Download, HandCoins, ExternalLink, ArrowLeft, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  listFundraisers, createFundraiser, setFundraiserStatus,
  listParticipants, importRoster, grantParticipantConsent, setParticipantVisibility,
  listDonations, recordOfflineDonation,
  fmtMoney, pctOfGoal, type AdminFundraiser, type AdminParticipant,
} from '@/lib/giving/api';

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export function GivingAdmin() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: fundraisers = [], isLoading, refetch } = useQuery({
    queryKey: ['giving', 'admin', 'fundraisers'],
    queryFn: listFundraisers,
  });

  const selected = fundraisers.find(f => f.id === selectedId) ?? null;

  if (isLoading) {
    return <div className="py-20 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (selected) {
    return <CampaignDetail fundraiser={selected} onBack={() => setSelectedId(null)} onChanged={refetch} />;
  }

  return <CampaignList fundraisers={fundraisers} onOpen={setSelectedId} onCreated={refetch} />;
}

// ── List + create ──────────────────────────────────────────────────────────

function CampaignList({
  fundraisers, onOpen, onCreated,
}: { fundraisers: AdminFundraiser[]; onOpen: (id: string) => void; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [goal, setGoal] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [story, setStory] = useState('');
  const [saving, setSaving] = useState(false);

  async function create() {
    const goalDollars = Number.parseFloat(goal);
    const finalSlug = slugify(slug || title);
    if (!title.trim() || !finalSlug || !Number.isFinite(goalDollars) || goalDollars <= 0) {
      toast.error('Title, link, and a goal amount are required.');
      return;
    }
    setSaving(true);
    try {
      await createFundraiser({
        title: title.trim(),
        slug: finalSlug,
        story: story.trim() || undefined,
        goal_cents: Math.round(goalDollars * 100),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      });
      toast.success('Fundraiser created as a draft.');
      setOpen(false);
      setTitle(''); setSlug(''); setGoal(''); setEndsAt(''); setStory('');
      onCreated();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not create the fundraiser.';
      toast.error(msg.includes('duplicate') ? 'That link is already taken — pick another.' : msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Donations settle directly in your own Stripe account. GleeWorld takes 0%.
        </p>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> New fundraiser</Button>
      </div>

      {fundraisers.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <HandCoins className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-semibold mb-1">No fundraisers yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a campaign, import your roster, and every singer gets their own shareable page.
          </p>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> New fundraiser</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {fundraisers.map(f => (
            <button
              key={f.id}
              onClick={() => onOpen(f.id)}
              className="text-left rounded-xl border bg-card p-4 hover:bg-muted/40 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{f.title}</div>
                  <div className="text-xs text-muted-foreground">/give/{f.slug}</div>
                </div>
                <Badge variant={f.status === 'live' ? 'default' : 'secondary'}>{f.status}</Badge>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-lg font-bold">{fmtMoney(f.raised_cents)}</span>
                <span className="text-sm text-muted-foreground">of {fmtMoney(f.goal_cents)}</span>
                <span className="text-sm text-muted-foreground ml-auto">{f.donor_count} donors</span>
              </div>
              <div className="h-1.5 mt-2 rounded bg-muted overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${pctOfGoal(f.raised_cents, f.goal_cents)}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New fundraiser</DialogTitle>
            <DialogDescription>It starts as a draft — nothing is public until you set it live.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="f-title">Title</Label>
              <Input
                id="f-title"
                value={title}
                onChange={e => { setTitle(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
                placeholder="2026 Spring Chorus Fundraiser"
              />
            </div>
            <div>
              <Label htmlFor="f-slug">Public link</Label>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">/give/</span>
                <Input id="f-slug" value={slug} onChange={e => setSlug(slugify(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="f-goal">Goal ($)</Label>
                <Input id="f-goal" inputMode="decimal" value={goal} onChange={e => setGoal(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="f-ends">Ends</Label>
                <Input id="f-ends" type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="f-story">Story</Label>
              <Textarea id="f-story" rows={4} value={story} onChange={e => setStory(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Detail ─────────────────────────────────────────────────────────────────

function CampaignDetail({
  fundraiser, onBack, onChanged,
}: { fundraiser: AdminFundraiser; onBack: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);

  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ['giving', 'admin', 'participants', fundraiser.id],
    queryFn: () => listParticipants(fundraiser.id),
  });
  const { data: donations = [], refetch: refetchDonations } = useQuery({
    queryKey: ['giving', 'admin', 'donations', fundraiser.id],
    queryFn: () => listDonations(fundraiser.id),
  });

  const awaitingConsent = participants.filter(p => !p.consent_granted_at).length;

  async function setStatus(status: 'draft' | 'live' | 'closed') {
    try {
      await setFundraiserStatus(fundraiser.id, status);
      toast.success(status === 'live' ? 'Fundraiser is live.' : `Fundraiser set to ${status}.`);
      onChanged();
      qc.invalidateQueries({ queryKey: ['giving'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.');
    }
  }

  function exportDonors() {
    const rows = [
      ['date', 'donor', 'email', 'amount', 'fee_covered', 'participant', 'message', 'status', 'source'],
      ...donations.map(d => [
        new Date(d.created_at).toISOString().slice(0, 10),
        d.is_anonymous ? 'Anonymous' : (d.donor_name ?? ''),
        d.donor_email ?? '',
        (d.amount_cents / 100).toFixed(2),
        (d.fee_cover_cents / 100).toFixed(2),
        participants.find(p => p.id === d.participant_id)?.display_name ?? '',
        d.message ?? '',
        d.status,
        d.source,
      ]),
    ];
    const csv = rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fundraiser.slug}-donors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> All fundraisers
          </Button>
          <h2 className="text-xl font-bold">{fundraiser.title}</h2>
          <a
            href={`/give/${fundraiser.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            /give/{fundraiser.slug} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex gap-2">
          {fundraiser.status !== 'live' && <Button onClick={() => setStatus('live')}>Set live</Button>}
          {fundraiser.status === 'live' && <Button variant="outline" onClick={() => setStatus('closed')}>Close</Button>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Raised" value={fmtMoney(fundraiser.raised_cents)} sub={`of ${fmtMoney(fundraiser.goal_cents)}`} />
        <Stat label="Donors" value={String(fundraiser.donor_count)} />
        <Stat
          label="Participants"
          value={String(participants.length)}
          sub={awaitingConsent > 0 ? `${awaitingConsent} awaiting permission` : 'all published'}
        />
      </div>

      <Tabs defaultValue="participants">
        <TabsList>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setImportOpen(true)}>
              <Users className="w-4 h-4 mr-1.5" /> Import from roster
            </Button>
          </div>
          {awaitingConsent > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
              {awaitingConsent} participant page{awaitingConsent === 1 ? ' is' : 's are'} not public yet. Send each
              singer their personal link so a parent or guardian can give permission, or record a returned paper
              permission slip with “Mark permitted”.
            </div>
          )}
          <ParticipantTable participants={participants} onChanged={refetchParticipants} />
        </TabsContent>

        <TabsContent value="donations" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setOfflineOpen(true)}>
              <HandCoins className="w-4 h-4 mr-1.5" /> Record cash / check
            </Button>
            <Button variant="outline" onClick={exportDonors} disabled={!donations.length}>
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
          </div>
          {donations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No donations yet.</p>
          ) : (
            <div className="rounded-xl border divide-y">
              {donations.map(d => (
                <div key={d.id} className="p-3 flex items-center gap-4">
                  <div className="w-20 font-semibold tabular-nums">{fmtMoney(d.amount_cents)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      {d.is_anonymous ? 'Anonymous' : (d.donor_name || d.donor_email || '—')}
                      {participants.find(p => p.id === d.participant_id) && (
                        <span className="text-muted-foreground"> → {participants.find(p => p.id === d.participant_id)?.display_name}</span>
                      )}
                    </div>
                    {d.message && <div className="text-xs text-muted-foreground italic truncate">{d.message}</div>}
                  </div>
                  <Badge variant={d.status === 'paid' ? 'default' : 'secondary'}>{d.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RosterImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        fundraiser={fundraiser}
        existing={participants}
        onImported={() => { refetchParticipants(); onChanged(); }}
      />
      <OfflineGiftDialog
        open={offlineOpen}
        onOpenChange={setOfflineOpen}
        fundraiser={fundraiser}
        participants={participants}
        onRecorded={() => { refetchDonations(); refetchParticipants(); onChanged(); }}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ParticipantTable({ participants, onChanged }: { participants: AdminParticipant[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);

  async function copyLink(p: AdminParticipant) {
    const url = `${window.location.origin}/p/${p.manage_token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Personal edit link for ${p.display_name} copied.`);
    } catch {
      toast.error('Could not copy the link.');
    }
  }

  async function markPermitted(p: AdminParticipant) {
    setBusy(p.id);
    try {
      await grantParticipantConsent(p.id, 'Recorded by staff (paper permission slip)');
      toast.success(`${p.display_name}'s page is now public.`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy(null);
    }
  }

  async function toggleVisibility(p: AdminParticipant) {
    setBusy(p.id);
    try {
      await setParticipantVisibility(p.id, !p.is_public);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy(null);
    }
  }

  if (!participants.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No participants yet — import your roster.</p>;
  }

  return (
    <div className="rounded-xl border divide-y">
      {participants.map(p => (
        <div key={p.id} className="p-3 flex items-center gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{p.display_name}</div>
            <div className="text-xs text-muted-foreground">
              {fmtMoney(p.raised_cents)} of {fmtMoney(p.goal_cents)} · {p.donor_count} donors
            </div>
          </div>
          {p.consent_granted_at
            ? <Badge variant={p.is_public ? 'default' : 'secondary'}>{p.is_public ? 'Public' : 'Hidden'}</Badge>
            : <Badge variant="secondary">Awaiting permission</Badge>}
          <Button size="sm" variant="ghost" onClick={() => copyLink(p)} title="Copy personal edit link">
            <Link2 className="w-4 h-4" />
          </Button>
          {p.consent_granted_at ? (
            <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => toggleVisibility(p)}>
              {p.is_public ? 'Hide' : 'Publish'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => markPermitted(p)}>
              <Check className="w-4 h-4 mr-1" /> Mark permitted
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Roster import ──────────────────────────────────────────────────────────

interface RosterMember { user_id: string; full_name: string | null; first_name: string | null; last_name: string | null; avatar_url: string | null; }

function RosterImportDialog({
  open, onOpenChange, fundraiser, existing, onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fundraiser: AdminFundraiser;
  existing: AdminParticipant[];
  onImported: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState(String(Math.round((fundraiser.default_participant_goal_cents ?? 20000) / 100)));
  const [saving, setSaving] = useState(false);

  const { data: roster = [], isLoading } = useQuery({
    queryKey: ['giving', 'admin', 'roster'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, first_name, last_name, avatar_url')
        .order('full_name');
      if (error) throw error;
      return (data as unknown as RosterMember[]) ?? [];
    },
    enabled: open,
  });

  const alreadyImported = useMemo(
    () => new Set(existing.map(p => p.user_id).filter(Boolean) as string[]),
    [existing],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roster
      .filter(m => m.user_id && !alreadyImported.has(m.user_id))
      .filter(m => !q || (m.full_name ?? '').toLowerCase().includes(q));
  }, [roster, search, alreadyImported]);

  async function run() {
    if (!selected.size) { toast.error('Select at least one singer.'); return; }
    const dollars = Number.parseFloat(goal);
    setSaving(true);
    try {
      const result = await importRoster(
        fundraiser.id,
        [...selected],
        Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : undefined,
      );
      toast.success(`${result.created} page${result.created === 1 ? '' : 's'} created${result.skipped ? `, ${result.skipped} already existed` : ''}.`);
      setSelected(new Set());
      onOpenChange(false);
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from roster</DialogTitle>
          <DialogDescription>
            Pages publish as “First L.” and stay hidden until a parent or guardian gives permission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative col-span-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div>
              <Input inputMode="decimal" value={goal} onChange={e => setGoal(e.target.value)} placeholder="Goal each ($)" />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{selected.size} selected</span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setSelected(
                selected.size === visible.length ? new Set() : new Set(visible.map(m => m.user_id)),
              )}
            >
              {selected.size === visible.length && visible.length > 0 ? 'Clear all' : 'Select all'}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
            {isLoading ? (
              <div className="p-6 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
            ) : visible.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">
                Everyone on the roster already has a page.
              </p>
            ) : visible.map(m => (
              <label key={m.user_id} className="flex items-center gap-3 p-2.5 cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={selected.has(m.user_id)}
                  onCheckedChange={v => setSelected(prev => {
                    const next = new Set(prev);
                    if (v === true) next.add(m.user_id); else next.delete(m.user_id);
                    return next;
                  })}
                />
                <span className="text-sm">{m.full_name || `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'Unnamed'}</span>
              </label>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={run} disabled={saving || !selected.size}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Create ${selected.size || ''} page${selected.size === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Offline gifts ──────────────────────────────────────────────────────────

function OfflineGiftDialog({
  open, onOpenChange, fundraiser, participants, onRecorded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fundraiser: AdminFundraiser;
  participants: AdminParticipant[];
  onRecorded: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [donor, setDonor] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const dollars = Number.parseFloat(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) { toast.error('Enter an amount.'); return; }
    setSaving(true);
    try {
      await recordOfflineDonation({
        fundraiser_id: fundraiser.id,
        participant_id: participantId || null,
        amount_cents: Math.round(dollars * 100),
        donor_name: donor.trim() || undefined,
      });
      toast.success('Recorded.');
      setAmount(''); setDonor(''); setParticipantId('');
      onOpenChange(false);
      onRecorded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not record the gift.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record a cash or check gift</DialogTitle>
          <DialogDescription>
            Counts toward the totals immediately so the leaderboard reflects what was really raised.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="o-amount">Amount ($)</Label>
            <Input id="o-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="o-donor">Donor name</Label>
            <Input id="o-donor" value={donor} onChange={e => setDonor(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <Label htmlFor="o-participant">Credit to</Label>
            <select
              id="o-participant"
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={participantId}
              onChange={e => setParticipantId(e.target.value)}
            >
              <option value="">General fund</option>
              {participants.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

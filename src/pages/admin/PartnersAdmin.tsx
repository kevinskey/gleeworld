import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useInvitePartner,
  useListPartnerInvites,
  useListPartners,
  useSetPartnerFeatured,
  useCreatePartnerByEmail,
  useSetGwFeaturedScore,
} from '@/lib/partner/api';
import { useStoreScores } from '@/lib/store/api';

const APP_HOST = window.location.origin;

export default function PartnersAdmin() {
  // Store/GW curation (featured_order, gw_featured_order) is super-admin
  // only at the DB layer (guard_partner_featured_order /
  // guard_gw_featured_order triggers) — AdminOnlyRoute lets tenant admins
  // reach this page, so hide the featuring controls they'd get a 42501
  // toast from.
  const { isSuperAdmin } = useUserRole();
  const canCurate = isSuperAdmin();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const invite = useInvitePartner();
  const invites = useListPartnerInvites();
  const partners = useListPartners();
  const setPartnerFeatured = useSetPartnerFeatured();

  const [addEmail, setAddEmail] = useState('');
  const [addDisplayName, setAddDisplayName] = useState('');
  const createByEmail = useCreatePartnerByEmail();

  const scores = useStoreScores();
  const setGwFeatured = useSetGwFeaturedScore();
  const [scoreSearch, setScoreSearch] = useState('');

  const submit = () => {
    if (!email.trim()) return;
    invite.mutate(
      { email: email.trim(), display_name: displayName.trim() || undefined },
      {
        onSuccess: (res) => {
          toast.success(`Invite sent to ${email}`);
          navigator.clipboard.writeText(`${APP_HOST}/partner/invite/${res.token}`).catch(() => {});
          setEmail(''); setDisplayName('');
        },
        onError: (err) => toast.error(`Invite failed: ${err.message}`),
      },
    );
  };

  const copyLink = (token: string) => {
    const url = `${APP_HOST}/partner/invite/${token}`;
    navigator.clipboard.writeText(url).then(() => toast.info('Invite link copied'));
  };

  const submitAddByEmail = () => {
    if (!addEmail.trim() || !addDisplayName.trim()) return;
    createByEmail.mutate(
      { display_name: addDisplayName.trim(), contact_email: addEmail.trim() },
      {
        onSuccess: () => {
          toast.success("Partner added — they'll be linked when they sign in with this email.");
          setAddEmail(''); setAddDisplayName('');
        },
        onError: (err) => toast.error(`Add partner failed: ${err.message}`),
      },
    );
  };

  const featurePartner = (id: string) => {
    const orders = (partners.data ?? [])
      .map((p) => p.featured_order)
      .filter((n): n is number => n != null);
    const nextOrder = (orders.length ? Math.max(...orders) : 0) + 1;
    setPartnerFeatured.mutate(
      { id, featured_order: nextOrder },
      { onError: (err) => toast.error(`Feature failed: ${err.message}`) },
    );
  };

  const unfeaturePartner = (id: string) => {
    setPartnerFeatured.mutate(
      { id, featured_order: null },
      { onError: (err) => toast.error(`Unfeature failed: ${err.message}`) },
    );
  };

  const scoreLabel = (s: { title: string; composer: string | null; partner: { display_name: string } | null }) =>
    `${s.title}${s.composer ? ` — ${s.composer}` : ''}${s.partner?.display_name ? ` · ${s.partner.display_name}` : ''}`;

  const featuredScores = (scores.data ?? [])
    .filter((s) => s.gw_featured_order != null)
    .sort((a, b) => (a.gw_featured_order ?? 0) - (b.gw_featured_order ?? 0));

  const q = scoreSearch.trim().toLowerCase();
  const otherScores = (scores.data ?? [])
    .filter((s) => s.gw_featured_order == null)
    .filter((s) => !q
      || s.title.toLowerCase().includes(q)
      || (s.composer ?? '').toLowerCase().includes(q)
      || (s.partner?.display_name ?? '').toLowerCase().includes(q));

  const featureScore = (id: string) => {
    const orders = (scores.data ?? [])
      .map((s) => s.gw_featured_order)
      .filter((n): n is number => n != null);
    const nextOrder = (orders.length ? Math.max(...orders) : 0) + 1;
    setGwFeatured.mutate(
      { id, gw_featured_order: nextOrder },
      { onError: (err) => toast.error(`Feature failed: ${err.message}`) },
    );
  };

  const removeScore = (id: string) => {
    setGwFeatured.mutate(
      { id, gw_featured_order: null },
      { onError: (err) => toast.error(`Remove failed: ${err.message}`) },
    );
  };

  return (
    <DashboardPageShell title="Partners" subtitle="Invite composers to sell scores in the GleeWorld store">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Invite a new partner</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pa-email" className="text-xs">Email *</Label>
                <Input id="pa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pa-name" className="text-xs">Display name (optional)</Label>
                <Input id="pa-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
            </div>
            <Button disabled={invite.isPending || !email.trim()} onClick={submit}>
              Send invite
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Add partner by email</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pa-add-name" className="text-xs">Display name *</Label>
                <Input id="pa-add-name" value={addDisplayName} onChange={(e) => setAddDisplayName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pa-add-email" className="text-xs">Email *</Label>
                <Input id="pa-add-email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              </div>
            </div>
            <Button
              disabled={createByEmail.isPending || !addEmail.trim() || !addDisplayName.trim()}
              onClick={submitAddByEmail}
            >
              Add partner
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">Open invites</CardTitle></CardHeader>
        <CardContent>
          {invites.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {invites.data && invites.data.filter(i => !i.redeemed_at).length === 0 && (
            <p className="text-xs text-muted-foreground">No open invites.</p>
          )}
          <ul className="space-y-2">
            {(invites.data ?? []).filter(i => !i.redeemed_at).map((i) => (
              <li key={i.id} className="flex items-center justify-between text-sm">
                <span>{i.email}{i.display_name ? ` (${i.display_name})` : ''}</span>
                <Button size="sm" variant="ghost" onClick={() => copyLink(i.token)}>
                  <Copy className="w-4 h-4 mr-1" /> Copy link
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">Partners</CardTitle></CardHeader>
        <CardContent>
          {partners.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {partners.data && partners.data.length === 0 && (
            <p className="text-xs text-muted-foreground">No partners yet.</p>
          )}
          <ul className="space-y-2">
            {(partners.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {p.display_name}
                  {p.featured_order != null && (
                    <span className="text-xs text-muted-foreground">★ #{p.featured_order}</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === 'active' ? 'default' : 'outline'} className="text-xs">{p.status}</Badge>
                  {canCurate && (
                    p.featured_order != null ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={setPartnerFeatured.isPending}
                        onClick={() => unfeaturePartner(p.id)}
                      >
                        Unfeature
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={setPartnerFeatured.isPending}
                        onClick={() => featurePartner(p.id)}
                      >
                        Feature
                      </Button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">GW featured pieces</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {scores.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Featured</p>
            {featuredScores.length === 0 && (
              <p className="text-xs text-muted-foreground">No featured pieces yet.</p>
            )}
            <ul className="space-y-2">
              {featuredScores.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span>★ #{s.gw_featured_order} {scoreLabel(s)}</span>
                  {canCurate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={setGwFeatured.isPending}
                      onClick={() => removeScore(s.id)}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {canCurate && (
            <div className="space-y-2">
              <Label htmlFor="pa-score-search" className="text-xs">Search published scores</Label>
              <Input
                id="pa-score-search"
                value={scoreSearch}
                onChange={(e) => setScoreSearch(e.target.value)}
                placeholder="Title, composer, or partner"
              />
              {otherScores.length === 0 && (
                <p className="text-xs text-muted-foreground">No matching scores.</p>
              )}
              <ul className="space-y-2">
                {otherScores.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span>{scoreLabel(s)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={setGwFeatured.isPending}
                      onClick={() => featureScore(s.id)}
                    >
                      Feature
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardPageShell>
  );
}

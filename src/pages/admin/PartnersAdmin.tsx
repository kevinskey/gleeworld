import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvitePartner, useListPartnerInvites, useListPartners } from '@/lib/partner/api';

const APP_HOST = window.location.origin;

export default function PartnersAdmin() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const invite = useInvitePartner();
  const invites = useListPartnerInvites();
  const partners = useListPartners();

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

  return (
    <DashboardPageShell title="Partners" subtitle="Invite composers to sell scores in the GleeWorld store">
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
                  <Copy className="w-3 h-3 mr-1" /> Copy link
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
                <span>{p.display_name}</span>
                <Badge variant={p.status === 'active' ? 'default' : 'outline'} className="text-xs">{p.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </DashboardPageShell>
  );
}

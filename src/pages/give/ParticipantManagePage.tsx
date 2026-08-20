// Participant self-service — /p/:token. No GleeWorld account required.
//
// Two jobs, and the second one is the important one:
//   1) Let a singer (or their parent) write their own story and set their own
//      goal. Roster-imported pages start blank, and a blank page raises
//      nothing.
//   2) Capture parental consent. A participant page is NOT public until an
//      adult affirmatively consents here — importing a roster deliberately
//      does not imply it. This is why the page ships before any bulk-invite
//      tooling does: there is no compliant way to publish a child's photo
//      and first name without it.
//
// The token is an opaque 48-hex secret and is the only credential; the RPC
// behind it refuses anything shorter than 32 characters and can only ever
// reach the one participant row it belongs to.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertTriangle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { toast } from 'sonner';
import { fetchManagedParticipant, updateManagedParticipant, fmtMoney } from '@/lib/giving/api';

export default function ParticipantManagePage() {
  const { token = '' } = useParams();
  const [story, setStory] = useState('');
  const [goalDollars, setGoalDollars] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentBy, setConsentBy] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: participant, isLoading, refetch } = useQuery({
    queryKey: ['giving', 'manage', token],
    queryFn: () => fetchManagedParticipant(token),
    enabled: token.length >= 32,
  });

  useEffect(() => {
    if (!participant) return;
    setStory(participant.story ?? '');
    setGoalDollars(String(Math.round(participant.goal_cents / 100)));
  }, [participant]);

  if (isLoading) {
    return (
      <UniversalLayout>
        <div className="min-h-[50vh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      </UniversalLayout>
    );
  }

  if (!participant) {
    return (
      <UniversalLayout>
        <div className="max-w-md mx-auto py-20 text-center px-4">
          <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-2">This link isn't valid</h1>
          <p className="text-muted-foreground">Ask your director to resend your fundraising page link.</p>
        </div>
      </UniversalLayout>
    );
  }

  const alreadyConsented = !!participant.consent_granted_at;
  const pageUrl = `${window.location.origin}/give/${participant.fundraiser_slug}/${participant.slug}`;

  async function save() {
    const dollars = Number.parseFloat(goalDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      toast.error('Enter a goal amount.');
      return;
    }
    if (!alreadyConsented && consent && !consentBy.trim()) {
      toast.error('Please type the name of the parent or guardian giving permission.');
      return;
    }
    setSaving(true);
    try {
      await updateManagedParticipant(token, {
        story: story.trim(),
        goal_cents: Math.round(dollars * 100),
        consent: alreadyConsented ? undefined : (consent || undefined),
        consent_by: consentBy.trim() || undefined,
      });
      toast.success(alreadyConsented ? 'Saved.' : consent ? 'Your page is live!' : 'Saved as a draft.');
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <UniversalLayout>
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{participant.display_name}'s fundraising page</h1>
          <p className="text-muted-foreground">{participant.fundraiser_title}</p>
        </div>

        {participant.is_public ? (
          <div className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Raised so far</div>
              <div className="text-xl font-bold">{fmtMoney(participant.raised_cents)}</div>
            </div>
            <Button variant="outline" asChild>
              <a href={pageUrl} target="_blank" rel="noreferrer">
                View page <ExternalLink className="w-4 h-4 ml-1.5" />
              </a>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
            This page is <strong>not published yet</strong>. It goes live once a parent or guardian gives
            permission below.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="goal">My goal ($)</Label>
            <Input id="goal" inputMode="numeric" value={goalDollars} onChange={e => setGoalDollars(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              Smaller goals fill up faster, and a page close to its goal raises more than an empty big one.
            </p>
          </div>

          <div>
            <Label htmlFor="story">My message to friends and family</Label>
            <Textarea
              id="story"
              rows={8}
              value={story}
              onChange={e => setStory(e.target.value)}
              placeholder={`Dear Friends and Family,\n\nI am so excited to be part of our chorus! Your support helps us with trips, music, and end-of-year celebrations. My goal is to raise $${goalDollars || '200'}.\n\nThank you!`}
            />
          </div>

          {!alreadyConsented && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4" /> Parent / guardian permission
              </div>
              <p className="text-sm text-muted-foreground">
                This page shows a first name, last initial, grade, and photo publicly to anyone with the link.
                It is never listed in search engines. Permission can be withdrawn at any time by contacting the
                director.
              </p>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox checked={consent} onCheckedChange={v => setConsent(v === true)} className="mt-0.5" />
                <span>I am the parent or legal guardian and I give permission to publish this page.</span>
              </label>
              {consent && (
                <div>
                  <Label htmlFor="consent-by">Parent / guardian name</Label>
                  <Input id="consent-by" value={consentBy} onChange={e => setConsentBy(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <Button onClick={save} disabled={saving} className="w-full h-11">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Save my page'}
          </Button>
        </div>
      </div>
    </UniversalLayout>
  );
}

// Audition Signup — a signed-in form for volunteering to sing (built for
// "Audition to Sing with Doc" on the retirement page; tenant-neutral).
//
// Unlike the display-only `audition` block (which links to an external
// form), this one collects the signup natively: voice part, the years/era
// the singer sang with the director, phone, and an optional note. Name and
// email ride the session — one signup per user per tenant (upsert), so
// re-submitting just updates. Signed-out visitors get a sign-in prompt.
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { SignInDialog } from '@/components/auth/SignInDialog';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  eyebrow: z.string().default('Auditions'),
  heading: z.string().default('Audition to Sing'),
  intro: z.string().default('Graduates and friends: join the choir for this concert. Tell us your voice part and when you sang, and we will be in touch.'),
  buttonLabel: z.string().default('Sign me up'),
  // Which parts the form offers — a treble choir lists S1/S2/A1/A2, a
  // mixed one adds Tenor/Bass. Editable per block instance.
  voiceParts: z.array(z.string()).default(['Soprano 1', 'Soprano 2', 'Alto 1', 'Alto 2', 'Tenor', 'Bass']),
  // Show the live audition session (dates/times/location/requirements)
  // beside the form — live data only, never placeholders.
  showSessionInfo: z.boolean().default(true),
});
type Config = z.infer<typeof schema>;

const DEFAULT_PARTS = ['Soprano 1', 'Soprano 2', 'Alto 1', 'Alto 2', 'Tenor', 'Bass'];

interface LiveSessionInfo {
  name: string | null; description: string | null; start_date: string | null;
  audition_slots: Array<{ date: string; time?: string; location?: string }> | null;
  location: string | null; requirements: string | null;
  application_deadline: string | null;
}

function fmtDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function parseReqLines(text: string): Array<{ title: string; detail: string }> {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const m = line.match(/^(.{2,80}?)\s*(?:—|–|: |\s-\s)\s*(.+)$/);
    return m ? { title: m[1], detail: m[2] } : { title: line, detail: '' };
  });
}

function Render({ config, ctx }: BlockRenderProps<Config>) {
  // An emptied editor list must not brick the form (review 2026-08-13).
  const voiceParts = config.voiceParts.length ? config.voiceParts : DEFAULT_PARTS;
  const { data: live } = useQuery<LiveSessionInfo | null>({
    queryKey: ['public-audition-session', ctx.slug],
    enabled: config.showSessionInfo,
    staleTime: 60 * 1000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_public_audition_session', { p_slug: ctx.slug });
      if (error) return null;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as LiveSessionInfo) ?? null;
    },
  });
  const slots = (config.showSessionInfo && live?.audition_slots?.filter((s) => s.date)) || [];
  const reqs = (config.showSessionInfo && live?.requirements?.trim()) ? parseReqLines(live.requirements) : [];
  const hasInfo = !!(slots.length || reqs.length || live?.location || live?.start_date);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const [voicePart, setVoicePart] = useState('');
  const [era, setEra] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [signInOpen, setSignInOpen] = useState(false);

  // Pre-fill from an existing signup so re-opening the page shows what was
  // submitted (and makes the upsert semantics visible to the user).
  const { data: existing } = useQuery({
    queryKey: ['audition-signup', ctx.slug, userId],
    enabled: !!userId,
    queryFn: async () => {
      // Slug-resolved RPC: a direct select is tenant-walled and misses the
      // signup for members homed on another tenant (review 2026-08-13).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).rpc('get_my_audition_signup', { p_slug: ctx.slug });
      const row = Array.isArray(data) ? data[0] : data;
      return (row as { voice_part: string; era: string | null; phone: string | null; note: string | null } | null) ?? null;
    },
  });
  useEffect(() => {
    if (!existing) return;
    setVoicePart((v) => v || existing.voice_part);
    setEra((v) => v || existing.era || '');
    setPhone((v) => v || existing.phone || '');
    setNote((v) => v || existing.note || '');
  }, [existing]);

  const submit = useMutation({
    mutationFn: async () => {
      if (!voicePart) throw new Error('Pick your voice part.');
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user;
      if (!user) throw new Error('Sign in to audition.');
      // Tenant comes from the PAGE slug, server-side — a signed-in visitor
      // homed on another tenant must not file into their own (review
      // 2026-08-13, finding 1).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('submit_audition_signup', {
        p_slug: ctx.slug,
        p_voice_part: voicePart,
        p_era: era.trim() || null,
        p_phone: phone.trim() || null,
        p_note: note.trim() || null,
      });
      if (error) throw error;
    },
  });

  return (
    <section id="audition-signup" className="max-w-6xl mx-auto w-full px-4">
      <div className="mb-6">
        {config.eyebrow && (
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--site-accent)', letterSpacing: '0.24em' }}>
            {config.eyebrow}
          </p>
        )}
        <h2 className="text-3xl cq-sm:text-4xl font-bold leading-tight">{config.heading}</h2>
        {config.intro && <p className="text-muted-foreground mt-2 max-w-2xl">{config.intro}</p>}
      </div>

      <div className={hasInfo ? 'grid gap-5 cq-lg:grid-cols-[2fr_3fr] items-start' : ''}>
      {hasInfo && (
        <div className="rounded-xl border border-border bg-white/60 p-4 space-y-4 text-left">
          {live?.start_date && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Performance</p>
              <p className="font-semibold text-sm mt-0.5">{fmtDay(live.start_date)}{live?.location ? ` · ${live.location}` : ''}</p>
            </div>
          )}
          {slots.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Audition dates</p>
              <ul className="mt-1 space-y-1">
                {slots.map((s, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{fmtDay(s.date)}</span>
                    <span className="text-muted-foreground">{[s.time, s.location].filter(Boolean).map((x) => ` · ${x}`).join('')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {reqs.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">What to prepare</p>
              <ol className="mt-1 space-y-1 list-decimal list-inside">
                {reqs.map((r, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{r.title}</span>
                    {r.detail && <span className="text-muted-foreground"> — {r.detail}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      <div>
      {!userId ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          <button type="button" className="underline font-medium" onClick={() => setSignInOpen(true)}>Sign in</button> to sign up to audition.
          <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
        </div>
      ) : submit.isSuccess ? (
        <div className="rounded-xl border border-border bg-white p-6 text-center">
          <Mic2 className="w-6 h-6 mx-auto mb-2" />
          <p className="font-medium">You&apos;re on the list.</p>
          <p className="text-sm text-muted-foreground">We&apos;ll reach out with rehearsal details. You can come back and update this any time.</p>
        </div>
      ) : (
        <form
          className="rounded-xl border border-border bg-white/70 p-5 space-y-4"
          onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
        >
          <div className="space-y-1.5">
            <Label>Voice part</Label>
            <div className="flex flex-wrap gap-2">
              {voiceParts.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={voicePart === p ? 'default' : 'outline'}
                  onClick={() => setVoicePart(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid cq-sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>When did you sing? (years, ensemble)</Label>
              <Input value={era} onChange={(e) => setEra(e.target.value)} placeholder="e.g. 2009–2013, Glee Club" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="(555) 555-5555" maxLength={30} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Anything we should know? (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={submit.isPending || !voicePart}>
              {submit.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mic2 className="w-4 h-4 mr-2" />}
              {config.buttonLabel}
            </Button>
            {submit.isError && <span className="text-sm text-destructive">{(submit.error as Error).message}</span>}
          </div>
        </form>
      )}
      </div>
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Intro</Label>
        <Textarea value={config.intro} onChange={(e) => set({ intro: e.target.value })} rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label>Voice parts (comma-separated)</Label>
        <Input
          value={config.voiceParts.join(', ')}
          onChange={(e) => set({ voiceParts: e.target.value.split(',').map((p) => p.trim()).filter(Boolean) })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Button label</Label>
        <Input value={config.buttonLabel} onChange={(e) => set({ buttonLabel: e.target.value })} />
      </div>
    </div>
  );
}

export const auditionSignupBlock: BlockModule<typeof schema> = {
  type: 'audition-signup',
  name: 'Audition Signup',
  description: 'Signed-in members and graduates sign up to sing: voice part, era, phone.',
  icon: Mic2,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};

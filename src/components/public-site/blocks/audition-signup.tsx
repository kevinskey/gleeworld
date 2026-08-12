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
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const VOICE_PARTS = ['Soprano 1', 'Soprano 2', 'Alto 1', 'Alto 2', 'Tenor', 'Bass'] as const;

const schema = z.object({
  heading: z.string().default('Audition to Sing'),
  intro: z.string().default('Graduates and friends: join the choir for this concert. Tell us your voice part and when you sang, and we will be in touch.'),
  buttonLabel: z.string().default('Sign me up'),
});
type Config = z.infer<typeof schema>;

function Render({ config }: BlockRenderProps<Config>) {
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

  // Pre-fill from an existing signup so re-opening the page shows what was
  // submitted (and makes the upsert semantics visible to the user).
  const { data: existing } = useQuery({
    queryKey: ['audition-signup', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_audition_signups' as never)
        .select('voice_part, era, phone, note')
        .eq('user_id', userId!)
        .maybeSingle();
      return data as { voice_part: string; era: string | null; phone: string | null; note: string | null } | null;
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
      const { error } = await supabase.from('gw_audition_signups' as never).upsert(
        {
          user_id: user.id,
          voice_part: voicePart,
          era: era.trim() || null,
          phone: phone.trim() || null,
          note: note.trim() || null,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'tenant_id,user_id' } as never,
      );
      if (error) throw error;
    },
  });

  return (
    <section id="audition-signup" className="max-w-6xl mx-auto w-full px-4">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">{config.heading}</h2>
        {config.intro && <p className="text-muted-foreground">{config.intro}</p>}
      </div>

      {!userId ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <a href="/login" className="underline font-medium">Sign in</a> to sign up to audition.
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
              {VOICE_PARTS.map((p) => (
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

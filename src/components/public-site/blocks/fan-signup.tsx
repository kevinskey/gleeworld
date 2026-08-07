import { useState } from 'react';
import { z } from 'zod';
import { Heart, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const schema = z.object({
  heading: z.string().default('Become a fan'),
  blurb: z.string().default('Join our mailing list for concert announcements, behind-the-scenes stories, and ways to support our program.'),
  buttonLabel: z.string().default('Sign me up'),
  successMessage: z.string().default('Thanks for joining — check your inbox for a welcome note.'),
  showName: z.boolean().default(true),
  showCity: z.boolean().default(false),
  requireConsent: z.boolean().default(true),
  consentText: z.string().default('I\u2019d like to receive occasional emails. (You can unsubscribe anytime.)'),
});
type Config = z.infer<typeof schema>;

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (config.requireConsent && !consent) {
      setStatus('error');
      setErrorMsg('Please agree to receive emails before signing up.');
      return;
    }
    setStatus('submitting');
    setErrorMsg(null);
    const { error } = await supabase.rpc('gw_fan_signup_submit', {
      p_slug: ctx.slug,
      p_email: email.trim(),
      p_name: name.trim() || null,
      p_city: city.trim() || null,
      p_consent: consent,
    });
    if (error) {
      setStatus('error');
      setErrorMsg(
        error.message.toLowerCase().includes('invalid email')
          ? 'That email doesn\'t look quite right.'
          : 'Something went wrong. Please try again.',
      );
      return;
    }
    setStatus('success');
  };

  return (
    <section id="fan-signup" className="gw-container py-5">
      {config.heading && (
        <h2 className="normal-case text-2xl cq-sm:text-3xl font-bold mb-4 flex items-center gap-2">
          <Heart className="w-6 h-6" style={{ color: 'var(--site-accent)' }} />
          {config.heading}
        </h2>
      )}
      {config.blurb && (
        <p className="text-muted-foreground mb-6 max-w-2xl">{config.blurb}</p>
      )}
      <div className="rounded-2xl border border-border bg-card p-6 max-w-2xl">
        {status === 'success' ? (
          <div className="flex items-start gap-3 text-foreground">
            <CheckCircle2 className="w-6 h-6 mt-0.5 shrink-0" style={{ color: 'var(--site-accent)' }} />
            <p className="text-base leading-relaxed">{config.successMessage}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3" noValidate>
            <div className={`grid gap-3 ${config.showName || config.showCity ? 'cq-sm:grid-cols-2' : ''}`}>
              {config.showName && (
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="bg-background"
                />
              )}
              {config.showCity && (
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  autoComplete="address-level2"
                  className="bg-background"
                />
              )}
            </div>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="bg-background"
            />
            {config.requireConsent && (
              <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                />
                <span>{config.consentText}</span>
              </label>
            )}
            {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
            <Button
              type="submit"
              disabled={status === 'submitting' || !email.trim()}
              className="rounded-full px-6 text-white"
              style={{ background: 'var(--site-accent)' }}
            >
              <Send className="w-4 h-4 mr-1.5" />
              {status === 'submitting' ? 'Joining…' : (config.buttonLabel || 'Sign me up')}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

function EditorForm({ config, onChange }: BlockEditorFormProps<Config>) {
  const set = (patch: Partial<Config>) => onChange({ ...config, ...patch });
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Intro</Label>
        <Textarea
          value={config.blurb}
          onChange={(e) => set({ blurb: e.target.value })}
          rows={3}
          placeholder="A short pitch for why someone should sign up."
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Button label</Label>
          <Input
            value={config.buttonLabel}
            onChange={(e) => set({ buttonLabel: e.target.value })}
            placeholder="Sign me up"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Success message</Label>
          <Input
            value={config.successMessage}
            onChange={(e) => set({ successMessage: e.target.value })}
            placeholder="Thanks for joining!"
            className="h-9"
          />
        </div>
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Fields to collect</div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={config.showName} onCheckedChange={(v) => set({ showName: v === true })} />
          <span>Ask for name</span>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={config.showCity} onCheckedChange={(v) => set({ showCity: v === true })} />
          <span>Ask for city</span>
        </label>
        <p className="text-sm text-slate-500 mt-1">Email is always required.</p>
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={config.requireConsent} onCheckedChange={(v) => set({ requireConsent: v === true })} />
          <span className="font-medium">Show email consent checkbox</span>
        </label>
        {config.requireConsent && (
          <div className="space-y-1.5">
            <Label className="text-xs">Consent line</Label>
            <Textarea
              value={config.consentText}
              onChange={(e) => set({ consentText: e.target.value })}
              rows={2}
              className="text-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const fanSignupBlock: BlockModule<typeof schema> = {
  type: 'fan-signup',
  name: 'Become a Fan',
  description: 'Mailing list signup — collect emails (and optionally names + cities) right from your public page.',
  icon: Heart,
  tier: 'free',
  group: 'gleeworld',
  poweredBy: 'Fans',
  configSchema: schema,
  defaultConfig: {
    heading: 'Become a fan',
    blurb: 'Join our mailing list for concert announcements, behind-the-scenes stories, and ways to support our program.',
    buttonLabel: 'Sign me up',
    successMessage: 'Thanks for joining — check your inbox for a welcome note.',
    showName: true,
    showCity: false,
    requireConsent: true,
    consentText: 'I\u2019d like to receive occasional emails. (You can unsubscribe anytime.)',
  },
  EditorForm,
  Render,
};

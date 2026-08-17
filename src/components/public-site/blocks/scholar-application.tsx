// Scholar Application — a public application form for a scholarship music
// program (built for Lyke House's Sr. Thea Bowman Scholar Music Program;
// tenant-neutral). Unlike audition-signup, applicants do NOT need an
// account: the form submits anonymously through the slug-resolving
// submit_scholar_application RPC. Staff review applications in the linked
// course's People tab; accepting one creates the account, enrolls the
// student, and emails their sign-in link (gw-invite-student).
import { useState } from 'react';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { GraduationCap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { AddressAutocomplete } from '@/components/calendar/AddressAutocomplete';
import type { BlockModule, BlockEditorFormProps, BlockRenderProps } from '../types';

const DEFAULT_TERMS = `1. Scholarship — the program provides a music and liturgy scholarship for the academic year. The Scholar demonstrates musical and liturgical scholarship by attending music seminars/rehearsals and liturgical celebrations, and by providing leadership during program events.
2. Punctuality & preparedness — arrive 15 minutes before rehearsals and 45 minutes before liturgical celebrations, with music and writing materials. Business or business-casual attire is required at liturgical celebrations.
3. Attendance — give the Director advance notice of tardiness or absence by text or phone call. Only limited illness, school-obligation, or family-emergency absences are excused.
4. Substitutes — in the event of absence, the Scholar secures (and is responsible for compensating) a substitute music/liturgical leader.
5. Formation — attend program workshops, retreats, and music/liturgical formation activities.
6. Weekly commitment — select one day per week for Mass and Bible study/faith sharing with the student ministry team.
7. Prayer Partners — form a group of at least five students who meet regularly for faith sharing, and invite them to Sunday Mass throughout the year.
8. Media release — the Scholar permits the organization to use their name, likeness, and voice in all forms and media.
Disbursement — scholarship funds are released per quarter following the conclusion of each academic quarter, based on demonstrated competence, leadership, and scholarship. The Scholar is not an employee or contractor. Either party may revoke this agreement with two weeks' written notice.`;

const schema = z.object({
  eyebrow: z.string().default('Scholarships'),
  heading: z.string().default('Scholar Music Program Application'),
  intro: z.string().default('Apply to join the program. Review the agreement below, complete the form, and sign. If accepted, your class login will be emailed to you.'),
  buttonLabel: z.string().default('Submit application'),
  /** Course the accepted applicant is enrolled in (gw_courses.course_code). */
  courseCode: z.string().default(''),
  academicYear: z.string().default(''),
  terms: z.string().default(DEFAULT_TERMS),
});
type Config = z.infer<typeof schema>;

interface FormState {
  full_name: string; email: string; phone: string; alt_phone: string;
  address: string; city_state_zip: string; classification: string; age: string;
  school: string; major_minor: string; instrument_voice: string;
  emergency_name: string; emergency_relationship: string; emergency_phone: string;
  signature_name: string;
}
const EMPTY_FORM: FormState = {
  full_name: '', email: '', phone: '', alt_phone: '', address: '',
  city_state_zip: '', classification: '', age: '', school: '', major_minor: '',
  instrument_voice: '', emergency_name: '', emergency_relationship: '',
  emergency_phone: '', signature_name: '',
};

const CLASSIFICATIONS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];

function Render({ config, ctx }: BlockRenderProps<Config>) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [agreed, setAgreed] = useState(false);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const submit = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) throw new Error('Enter your name.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) throw new Error('Enter a valid email address.');
      if (!agreed) throw new Error('Check the agreement box to continue.');
      if (!form.signature_name.trim()) throw new Error('Type your full name as your signature.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('submit_scholar_application', {
        p_slug: ctx.slug,
        p_course_code: config.courseCode || null,
        p_payload: { ...form, academic_year: config.academicYear, agreed: 'true' },
      });
      if (error) throw error;
      if (data && data.ok !== true) throw new Error('Submission failed — please try again.');
    },
  });

  const field = (key: keyof FormState, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={form[key]} onChange={(e) => set({ [key]: e.target.value } as Partial<FormState>)} maxLength={120} {...props} />
    </div>
  );

  return (
    <section id="scholar-application" className="w-full border-y" style={{ background: 'color-mix(in oklab, var(--site-accent) 6%, transparent)', borderColor: 'color-mix(in oklab, var(--site-accent) 22%, transparent)' }}>
      <div className="gw-container">
        <div className="mb-6">
          {config.eyebrow && (
            <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--site-accent)', letterSpacing: '0.24em' }}>
              {config.eyebrow}
            </p>
          )}
          <h2 className="text-3xl cq-sm:text-4xl font-bold leading-tight" style={{ fontFamily: 'var(--site-heading-font)' }}>
            {config.heading}{config.academicYear ? ` · ${config.academicYear}` : ''}
          </h2>
          {config.intro && <p className="text-muted-foreground mt-2 max-w-2xl">{config.intro}</p>}
        </div>

        {submit.isSuccess ? (
          <div className="rounded-xl border border-border bg-white p-8 text-center max-w-xl">
            <GraduationCap className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--site-accent)' }} />
            <p className="font-semibold text-lg">Application received.</p>
            <p className="text-muted-foreground mt-1">Thank you, {form.full_name.trim()}. The program director will review your application — if you are accepted, your class sign-in link will be emailed to {form.email.trim()}.</p>
          </div>
        ) : (
          <form
            className="rounded-xl border border-border bg-white p-5 cq-sm:p-6 space-y-6 max-w-3xl"
            onSubmit={(e) => { e.preventDefault(); submit.mutate(); }}
          >
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">About you</h3>
              <div className="grid cq-sm:grid-cols-2 gap-4">
                {field('full_name', 'Full name', { required: true })}
                {field('email', 'Email', { type: 'email', required: true })}
                <div className="space-y-1.5">
                  <Label>Classification</Label>
                  <div className="flex flex-wrap gap-2">
                    {CLASSIFICATIONS.map((c) => (
                      <Button key={c} type="button" size="sm" variant={form.classification === c ? 'default' : 'outline'} onClick={() => set({ classification: c })}>
                        {c}
                      </Button>
                    ))}
                  </div>
                </div>
                {field('age', 'Age', { inputMode: 'numeric', maxLength: 3, className: 'max-w-[8rem]' })}
                {field('phone', 'Phone', { type: 'tel', maxLength: 30 })}
                {field('alt_phone', 'Alternate phone (optional)', { type: 'tel', maxLength: 30 })}
              </div>
              {/* Google Places autocomplete (via the google-places-lookup
                  edge fn — server-side proxy, no client API key). Picking a
                  suggestion also fills City/State/Zip from the formatted
                  address. Plain typing still works if the lookup is down. */}
              <div className="space-y-1.5">
                <Label>Permanent mailing address</Label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(v) => set({ address: v })}
                  onSelect={(description) => {
                    const parts = description.split(', ').filter((p) => p !== 'USA');
                    if (parts.length >= 3) {
                      set({ address: parts.slice(0, -2).join(', '), city_state_zip: parts.slice(-2).join(', ') });
                    } else {
                      set({ address: description });
                    }
                  }}
                  placeholder="Street address"
                />
              </div>
              {field('city_state_zip', 'City, State, Zip')}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">School &amp; music</h3>
              <div className="grid cq-sm:grid-cols-2 gap-4">
                {field('school', 'College / University')}
                {field('major_minor', 'Major / Minor')}
                {field('instrument_voice', 'Instrument / Voice type', { placeholder: 'e.g. Soprano, Piano, Organ' })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Emergency contact</h3>
              <div className="grid cq-sm:grid-cols-3 gap-4">
                {field('emergency_name', 'Name')}
                {field('emergency_relationship', 'Relationship', { maxLength: 60 })}
                {field('emergency_phone', 'Phone', { type: 'tel', maxLength: 30 })}
              </div>
            </div>

            {config.terms && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Terms &amp; conditions</h3>
                <div className="rounded-lg border border-border bg-muted/40 p-4 max-h-56 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap">
                  {config.terms}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I have read the agreement above, understand its meaning and intent, and enter it knowingly and voluntarily.</span>
              </label>
              <div className="grid cq-sm:grid-cols-2 gap-4 items-end">
                {field('signature_name', 'Signature (type your full name)', { placeholder: form.full_name || 'Your full name' })}
                <p className="text-xs text-muted-foreground pb-2.5">Dated automatically when you submit.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button type="submit" size="lg" disabled={submit.isPending}>
                {submit.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GraduationCap className="w-4 h-4 mr-2" />}
                {config.buttonLabel}
              </Button>
              {submit.isError && <span className="text-sm text-destructive">{(submit.error as Error).message}</span>}
            </div>
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
        <Label>Heading</Label>
        <Input value={config.heading} onChange={(e) => set({ heading: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Intro</Label>
        <Textarea value={config.intro} onChange={(e) => set({ intro: e.target.value })} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label>Course code</Label>
          <Input value={config.courseCode} onChange={(e) => set({ courseCode: e.target.value })} placeholder="e.g. LH101" />
          <p className="text-[11px] text-slate-500">Accepted applicants are enrolled in this class. Applications appear in its People tab.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Academic year</Label>
          <Input value={config.academicYear} onChange={(e) => set({ academicYear: e.target.value })} placeholder="2026–2027" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Terms &amp; conditions</Label>
        <Textarea value={config.terms} onChange={(e) => set({ terms: e.target.value })} rows={10} className="text-xs" />
      </div>
      <div className="space-y-1.5">
        <Label>Button label</Label>
        <Input value={config.buttonLabel} onChange={(e) => set({ buttonLabel: e.target.value })} />
      </div>
    </div>
  );
}

export const scholarApplicationBlock: BlockModule<typeof schema> = {
  type: 'scholar-application',
  name: 'Scholar Application',
  description: 'Public application form for a scholarship program — applicants sign the agreement; accepted students get enrolled and emailed a class sign-in link.',
  icon: GraduationCap,
  tier: 'free',
  group: 'core',
  configSchema: schema,
  defaultConfig: schema.parse({}),
  EditorForm,
  Render,
};

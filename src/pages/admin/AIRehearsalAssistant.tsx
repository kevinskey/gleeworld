// /admin/ai-rehearsal — Director's AI helper. Four task-specific generators:
// rehearsal plan, warm-ups, concert program notes, and parent letter. Each
// builds a structured prompt for the existing `ai-chat` edge function so we
// don't need a new backend.
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Copy, Loader2 } from 'lucide-react';

type Mode = 'plan' | 'warmup' | 'notes' | 'letter';

const MODE_LABEL: Record<Mode, string> = {
  plan: 'Rehearsal Plan',
  warmup: 'Warm-Ups',
  notes: 'Program Notes',
  letter: 'Parent Letter',
};

function buildPrompt(mode: Mode, fields: Record<string, string>): string {
  switch (mode) {
    case 'plan':
      return `You are an expert choral director. Write a detailed rehearsal plan for a ${fields.duration || '60'}-minute rehearsal.
Ensemble: ${fields.ensemble || 'mixed choir'}
Pieces to rehearse: ${fields.pieces || 'TBD'}
Focus / goals for this rehearsal: ${fields.focus || 'general musicianship'}
Format the plan as a clear minute-by-minute schedule with section headings (Warm-Up, Repertoire, Notes for next time). Be specific and actionable.`;
    case 'warmup':
      return `You are an expert vocal coach. Design a ${fields.duration || '10'}-minute warm-up sequence for a ${fields.ensemble || 'mixed choir'}.
Skill focus: ${fields.focus || 'breath, resonance, blend'}
Voice parts: ${fields.voices || 'SATB'}
List each exercise with: name, purpose, how to lead it, and a sample solfège or pitch pattern. Use clear numbered steps.`;
    case 'notes':
      return `You are a choral musicologist. Write concert program notes (2-3 short paragraphs each) for these pieces:
${fields.pieces || ''}
Audience: ${fields.audience || 'general concert audience'}
Tone: ${fields.tone || 'warm, accessible, informative'}
For each piece, include: composer + dates, brief historical/cultural context, what to listen for. Keep each piece under 200 words.`;
    case 'letter':
      return `You are a thoughtful choral director writing to parents. Draft a parent letter.
Subject: ${fields.subject || 'Upcoming event'}
Key details to include: ${fields.details || ''}
Tone: ${fields.tone || 'warm and professional'}
Sign-off as: ${fields.signoff || 'Director'}
Keep it concise (300-400 words). Use clear sections and a friendly opening.`;
  }
}

export default function AIRehearsalAssistant() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('plan');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  function update(k: string, v: string) {
    setFields((prev) => ({ ...prev, [k]: v }));
  }

  async function generate() {
    setLoading(true);
    setOutput('');
    try {
      const prompt = buildPrompt(mode, fields);
      const { data, error } = await supabase.functions.invoke('ai-chat', { body: { prompt } });
      if (error) throw error;
      const text = data?.choices?.[0]?.message?.content || data?.content || '';
      if (!text) throw new Error('No response from AI');
      setOutput(text);
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function copyOutput() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    toast({ title: 'Copied to clipboard' });
  }

  function switchMode(m: Mode) {
    setMode(m);
    setFields({});
    setOutput('');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> AI Rehearsal Assistant
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a task, fill in a couple of fields, and get a draft you can copy or edit.
        </p>
      </div>

      <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="plan">Rehearsal Plan</TabsTrigger>
          <TabsTrigger value="warmup">Warm-Ups</TabsTrigger>
          <TabsTrigger value="notes">Program Notes</TabsTrigger>
          <TabsTrigger value="letter">Parent Letter</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Rehearsal Plan</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Length (minutes)" placeholder="60" onChange={(v) => update('duration', v)} />
              <Field label="Ensemble" placeholder="Mixed choir (40 students)" onChange={(v) => update('ensemble', v)} />
              <FieldArea label="Pieces to rehearse" placeholder="One piece per line — title, composer" onChange={(v) => update('pieces', v)} />
              <Field label="Focus / goals" placeholder="Diction in m. 30–48; dynamics in the chorale" onChange={(v) => update('focus', v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warmup" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Warm-Ups</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Length (minutes)" placeholder="10" onChange={(v) => update('duration', v)} />
              <Field label="Ensemble" placeholder="High school mixed choir" onChange={(v) => update('ensemble', v)} />
              <Field label="Voice parts" placeholder="SATB" onChange={(v) => update('voices', v)} />
              <Field label="Skill focus" placeholder="Breath, blend, intonation" onChange={(v) => update('focus', v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Program Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <FieldArea label="Pieces" placeholder="One per line — title, composer, dates if known" onChange={(v) => update('pieces', v)} />
              <Field label="Audience" placeholder="Family + community concert" onChange={(v) => update('audience', v)} />
              <Field label="Tone" placeholder="Warm, accessible, informative" onChange={(v) => update('tone', v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="letter" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Parent Letter</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Subject" placeholder="Spring concert details" onChange={(v) => update('subject', v)} />
              <FieldArea label="Key details" placeholder="Date, time, location, attire, what to bring, RSVP info..." onChange={(v) => update('details', v)} />
              <Field label="Tone" placeholder="Warm and professional" onChange={(v) => update('tone', v)} />
              <Field label="Sign-off as" placeholder="Dr. Smith, Choir Director" onChange={(v) => update('signoff', v)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={generate} disabled={loading} size="lg">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Generate {MODE_LABEL[mode]}
        </Button>
      </div>

      {output && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Draft</CardTitle>
            <Button variant="ghost" size="sm" onClick={copyOutput}>
              <Copy className="w-4 h-4 mr-2" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea
              value={output}
              onChange={(e) => setOutput(e.target.value)}
              className="min-h-[400px] font-mono text-sm whitespace-pre-wrap"
            />
            <p className="text-xs text-muted-foreground mt-2">Edit freely before copying — this is a starting point, not a final draft.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, placeholder, onChange }: { label: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <Input placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function FieldArea({ label, placeholder, onChange }: { label: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <Textarea placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="min-h-[100px]" />
    </div>
  );
}

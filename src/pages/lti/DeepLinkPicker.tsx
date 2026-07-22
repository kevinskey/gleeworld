// LTI Deep Linking picker — shown when a Canvas instructor clicks
// "+ Tool" → "GleeWorld" while building an assignment or module item.
//
// We arrive here with ?handle=... after the lti-launch flow stashed a
// deep-link-return bundle keyed by that handle. The instructor picks
// what to embed; we POST { handle, items } to lti-deep-link-response,
// which returns HTML that auto-submits the signed JWT back to Canvas.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Library, Home, Mic, ExternalLink, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

interface Score {
  id: string;
  title: string;
  composer: string | null;
}

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) ?? 'https://gleeworld.org';

export default function DeepLinkPicker() {
  const [params] = useSearchParams();
  const handle = params.get('handle');
  const [scores, setScores] = useState<Score[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkTitle, setLinkTitle] = useState('Open GleeWorld');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer')
        .order('title')
        .limit(50);
      if (!cancelled) {
        setScores((data ?? []) as Score[]);
        setScoresLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async (items: { title: string; url: string }[]) => {
    if (!handle) return;
    setSubmitting(true);
    setError(null);
    try {
      const sess = await supabase.auth.getSession();
      const accessToken = sess.data.session?.access_token;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL ?? 'https://supabase.gleeworld.org'}/functions/v1/lti-deep-link-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ handle, items }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail ?? j.error ?? `HTTP ${res.status}`);
      }
      // Response is HTML that auto-submits a form. Render it in-place.
      const html = await res.text();
      document.open();
      document.write(html);
      document.close();
    } catch (e: any) {
      setSubmitting(false);
      setError(e?.message ?? 'Could not return to Canvas');
    }
  };

  const presets = useMemo(() => ([
    {
      key: 'dashboard',
      icon: Home,
      title: 'Open GleeWorld Dashboard',
      body: 'Drops the student on their personalized GleeWorld home screen.',
      url: `${SITE_URL}/dashboard`,
    },
    {
      key: 'practice',
      icon: Mic,
      title: 'Open Practice Studio',
      body: 'Students record practice takes with the built-in metronome + audio engine.',
      url: `${SITE_URL}/practice-studio`,
    },
    {
      key: 'library',
      icon: Library,
      title: 'Open Music Library',
      body: 'Students see the tenant\'s full sheet-music library.',
      url: `${SITE_URL}/music-library`,
    },
  ]), []);

  if (!handle) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center p-6">
          <Card className="max-w-md"><CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">This page is only reachable from a Canvas Deep Linking launch.</p>
          </CardContent></Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
    <div className="bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Add GleeWorld to your Canvas course</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick what students should see when they click this assignment.
            Canvas will create the link for you.
          </p>
        </header>

        {error && (
          <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            {error}
          </div>
        )}

        {/* Preset links — the common cases. */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quick links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {presets.map((p) => (
              <Card key={p.key} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col h-full">
                  <p.icon className="w-5 h-5 text-primary mb-2" />
                  <div className="font-semibold text-sm">{p.title}</div>
                  <p className="text-xs text-muted-foreground flex-1 mt-1">{p.body}</p>
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    disabled={submitting}
                    onClick={() => submit([{ title: p.title, url: p.url }])}
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Add to Canvas
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Specific score from the library. */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Or pick a specific score from your library
          </h2>
          <Card><CardContent className="p-4">
            {scoresLoading ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading scores…
              </div>
            ) : scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scores in this tenant's library yet.</p>
            ) : (
              <ul className="divide-y">
                {scores.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{s.title}</div>
                      {s.composer && <div className="text-xs text-muted-foreground truncate">{s.composer}</div>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => submit([{ title: s.title, url: `${SITE_URL}/scores/${s.id}` }])}
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </section>

        {/* Manual custom link — for power users. */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Or paste a custom GleeWorld URL
          </h2>
          <Card><CardContent className="p-4 space-y-3">
            <div>
              <Label htmlFor="dl-title" className="text-xs">Title shown in Canvas</Label>
              <Input
                id="dl-title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Custom URL launches will use the GleeWorld dashboard for now.
              Set the title and click below to add it as an assignment.
            </p>
            <Button
              disabled={submitting || !linkTitle.trim()}
              onClick={() => submit([{ title: linkTitle.trim(), url: `${SITE_URL}/dashboard` }])}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
              Add custom link
            </Button>
          </CardContent></Card>
        </section>
      </div>
    </div>
    </UniversalLayout>
  );
}

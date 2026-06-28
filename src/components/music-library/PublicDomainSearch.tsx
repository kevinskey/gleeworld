// CP3 — Public-Domain catalog search UI.
//
// IMPORTANT: this component queries our OWN `pd_works` table via the
// `pd_works_search` Postgres RPC. It NEVER touches CPDL live. The
// CPDL Action API is hit only by the `pd-ingest-cpdl` edge function
// (CP2). Local-only search keeps user latency low and our CPDL API
// etiquette obvious.
//
// CP3 ships the search + filters + result list. The "Add to library"
// action is wired but stubbed pending CP4 (PDF caching to DO Spaces
// + creating the tenant-side library row).

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ExternalLink, Plus, Loader2, ShieldCheck, BookOpen, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PdSearchRow {
  id: string;
  source: string;
  source_id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  language: string | null;
  source_page_url: string;
  license_type: 'public_domain' | 'cpdl_license';
  attribution: string | null;
  has_cached_pdf: boolean;
  rank: number;
}

// Filter dropdowns — curated common values for choirs. Empty = no filter.
const VOICING_OPTIONS = ['', 'SATB', 'SSAA', 'SSA', 'TTBB', 'SAB', 'SSAATTBB', 'TBB', 'SSATB'];
const LANGUAGE_OPTIONS = [
  '', 'English', 'Latin', 'German', 'French', 'Italian',
  'Spanish', 'Hebrew', 'Russian', 'Polish', 'Czech', 'Welsh',
];

export function PublicDomainSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [voicing, setVoicing] = useState('');
  const [language, setLanguage] = useState('');
  const [composer, setComposer] = useState('');

  // Debounce the free-text query so we don't fire an RPC on every keystroke.
  useEffect(() => {
    const h = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(h);
  }, [query]);

  const filtersActive = !!(debouncedQuery || voicing || language || composer.trim());

  const { data: rows = [], isLoading, error } = useQuery<PdSearchRow[]>({
    queryKey: ['pd-works-search', debouncedQuery, voicing, language, composer.trim()],
    // Skip the empty-everything default load (would return the whole
    // catalog ranked by alpha) until the user actually starts filtering.
    // Keeps the initial render snappy and the RPC quiet.
    enabled: filtersActive,
    queryFn: async () => {
      const { data, error: rpcErr } = await supabase.rpc('pd_works_search', {
        p_query: debouncedQuery || null,
        p_voicing: voicing || null,
        p_language: language || null,
        p_composer: composer.trim() || null,
        p_limit: 50,
        p_offset: 0,
      });
      if (rpcErr) throw rpcErr;
      return (data ?? []) as PdSearchRow[];
    },
  });

  const totalShown = rows.length;

  return (
    <div className="space-y-5">
      {/* Search controls */}
      <Card className="border-0 rounded-2xl bg-card shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Public-domain catalog
            </h2>
            <p className="text-xs text-muted-foreground">
              Searches our local catalog of works ingested from the Choral Public Domain Library (CPDL).
              CPDL editions carry a share-alike-style license — the editor must be credited when you use the score.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or composer (e.g. Ave Maria, Palestrina)"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Voicing</Label>
              <select
                value={voicing}
                onChange={(e) => setVoicing(e.target.value)}
                className="w-full mt-1 h-9 border border-border rounded-md bg-background px-2 text-sm"
              >
                {VOICING_OPTIONS.map((v) => (
                  <option key={v} value={v}>{v || 'Any voicing'}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Language</Label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full mt-1 h-9 border border-border rounded-md bg-background px-2 text-sm"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l} value={l}>{l || 'Any language'}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Composer</Label>
              <Input
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Last name…"
                className="h-9 mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {!filtersActive ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-1">
            <Search className="w-6 h-6 mx-auto opacity-40" />
            <p>Type a search term or pick a filter to begin.</p>
            <p className="text-xs">Catalog is local — no live calls to CPDL.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Searching the catalog…
        </div>
      ) : error ? (
        <div className="text-sm text-destructive p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          Search failed: {(error as Error).message}
        </div>
      ) : totalShown === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <p>No works match those filters.</p>
            <p className="text-xs mt-1">
              If the catalog hasn't been crawled yet, a platform admin needs to run the CPDL ingester.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            {totalShown} {totalShown === 1 ? 'result' : 'results'} {totalShown === 50 ? '(showing first 50)' : ''}
          </div>
          <ul className="space-y-3">
            {rows.map((r) => <PdResultCard key={r.id} row={r} />)}
          </ul>
        </>
      )}
    </div>
  );
}

function PdResultCard({ row }: { row: PdSearchRow }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      // Calls the pd-add-to-library edge function which:
      //   - caches the source PDF to our sheet-music bucket on first
      //     request (subsequent tenants reuse the cached object), and
      //   - inserts a gw_sheet_music row in the caller's tenant with
      //     rights_status='public_domain' (the rights gate auto-approves
      //     PD works — see Copyright & Content Policy).
      const { data, error } = await supabase.functions.invoke('pd-add-to-library', {
        body: { pd_work_id: row.id },
      });
      if (error) throw error;
      if (data?.already_in_library) {
        toast.success('Already in your library', {
          description: `"${row.title}" was added previously.`,
        });
      } else {
        toast.success('Added to library', {
          description: `"${row.title}" is now available in Scores. Editor credit is preserved per the CPDL share-alike license.`,
        });
      }
      setAdded(true);
      // Refresh the Music Library Scores tab so the new row appears
      // without a page reload.
      queryClient.invalidateQueries({ queryKey: ['music-library-scores'] });
    } catch (e: any) {
      toast.error('Could not add to library', {
        description: e?.message ?? 'Try again, or contact support if it persists.',
      });
    } finally {
      setAdding(false);
    }
  };
  const licenseLabel = useMemo(
    () => row.license_type === 'public_domain' ? 'Public domain' : 'CPDL edition (share-alike)',
    [row.license_type],
  );
  return (
    <li>
      <Card className="border-0 rounded-xl bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm leading-tight">{row.title}</span>
                {row.has_cached_pdf && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 border-emerald-200 text-emerald-800">
                    PDF ready
                  </Badge>
                )}
              </div>
              {row.composer && <div className="text-xs text-muted-foreground">{row.composer}</div>}
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {row.voicing && <Badge variant="outline" className="text-[10px]">{row.voicing}</Badge>}
                {row.language && <Badge variant="outline" className="text-[10px]">{row.language}</Badge>}
                <Badge variant="outline" className="text-[10px] inline-flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {licenseLabel}
                </Badge>
              </div>
              {row.attribution && (
                <div className="text-[11px] text-muted-foreground italic">{row.attribution}</div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 text-xs"
              >
                <a href={row.source_page_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> View on CPDL
                </a>
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={adding || added}
                className="h-8 text-xs"
              >
                {adding ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Adding…</>
                ) : added ? (
                  <><Check className="w-3.5 h-3.5 mr-1" /> Added</>
                ) : (
                  <><Plus className="w-3.5 h-3.5 mr-1" /> Add to library</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

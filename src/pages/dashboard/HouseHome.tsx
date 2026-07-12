// House home — replaces the Command Center bento at /dashboard. Layout
// order is spec-fixed: greeting -> up next -> two role widgets -> app grid.
// Letterpress plates: bg-card border border-border (+ the up-next plate's
// top accent stripe); no other elevations.
// Spec: docs/superpowers/specs/2026-07-04-house-and-stage-design.md
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { HomeNewsRail } from '@/components/dashboard/HomeNewsRail';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useModuleAccess';
import { useTenantNavPrefs } from '@/hooks/useTenantNavPrefs';
import { isFacultyProfile } from '@/lib/roles';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { getAppTiles, type ModuleFlags } from '@/lib/navigation/appDestinations';
import { toModuleFlags, toModuleSet } from '@/lib/navigation/moduleFlags';
import type { NavContext } from '@/lib/navigation/navCatalog';
import { selectUpNext, fuseProgress, greetingFor } from '@/lib/home/upNext';
import { ledgerGlyphs } from '@/lib/home/ledger';
import { useHomeTileLayout } from '@/hooks/useHomeTileLayout';
import { HomeTileGrid } from '@/components/dashboard/HomeTileGrid';

interface FeedRow {
  section: string; subtype: string | null; id: string; title: string;
  detail: string | null; event_at: string; severity: string | null;
  meta: Record<string, unknown> | null;
}

export default function HouseHome() {
  const { profile, canEditMusicLibrary } = useUserRole();
  const isFaculty = isFacultyProfile(profile);
  const firstName = (profile?.full_name || 'there').split(' ')[0];

  const { data: rows = [], isLoading } = useQuery<FeedRow[]>({
    queryKey: ['house-home-feed'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_command_center_feed')
        .select('section, subtype, id, title, detail, event_at, severity, meta')
        .order('event_at', { ascending: false });
      if (error) throw error;
      return (data as FeedRow[]) || [];
    },
  });

  // Faculty: unreviewed practice submissions (verbatim pattern from the
  // former CommandCenter — teacher_notes IS NULL = unlistened proxy).
  const { data: unreviewed = [] } = useQuery<FeedRow[]>({
    queryKey: ['house-home-unreviewed'],
    enabled: isFaculty,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: recs, error } = await supabase
        .from('gw_practice_recordings')
        .select('id, user_id, title, created_at')
        .is('teacher_notes', null)
        .is('reviewed_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const userIds = Array.from(new Set((recs ?? []).map((r) => r.user_id)));
      const nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('gw_profiles_directory')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        (profs ?? []).forEach((p: { user_id: string; full_name: string | null; email: string | null }) => {
          const name = `${p.full_name ?? ''}`.trim() || p.email || 'A student';
          nameMap.set(p.user_id, name);
        });
      }
      return (recs ?? []).map((r: { id: string; user_id: string; title: string | null; created_at: string }) => {
        const student = nameMap.get(r.user_id) ?? 'A student';
        return {
          section: 'urgent_task', subtype: 'practice_recording', id: `practice:${r.id}`,
          title: `${student} — ${r.title || 'Practice recording'}`, detail: 'Awaiting review',
          event_at: r.created_at, severity: 'medium', meta: { recording_id: r.id, user_id: r.user_id },
        };
      });
    },
  });

  // Student: own practice days this week for the ledger.
  const uid = profile?.user_id ?? 'anon';
  const { data: myPracticeDates = [] } = useQuery<string[]>({
    queryKey: ['house-home-my-practice', uid],
    enabled: !isFaculty && uid !== 'anon',
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_practice_recordings')
        .select('created_at')
        .eq('user_id', uid)
        .gte('created_at', new Date(Date.now() - 8 * 86400000).toISOString());
      if (error) throw error;
      return (data ?? []).map((r: { created_at: string }) => r.created_at);
    },
  });

  const now = new Date();
  const upNext = useMemo(() => selectUpNext(rows, now), [rows]);
  const urgent = useMemo(
    () => [...rows.filter((r) => r.section === 'urgent_task'), ...unreviewed]
      .sort((a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime())
      .slice(0, 6),
    [rows, unreviewed],
  );
  const todayRows = useMemo(
    () => rows.filter((r) => r.section === 'schedule'
      && new Date(r.event_at).toDateString() === now.toDateString())
      .sort((a, b) => new Date(a.event_at).getTime() - new Date(b.event_at).getTime())
      .slice(0, 4),
    [rows],
  );
  const glyphs = useMemo(() => ledgerGlyphs(myPracticeDates, now), [myPracticeDates]);

  // Module flags drive the app grid only — never the tab bar's flagless
  // core. While modules are still loading, `modules` defaults to `[]`
  // (every gated flag false), which would surface a fallback tile set
  // that then swaps identity once real data lands. Render an empty grid
  // area during the load instead of a set of tiles that might disappear
  // a moment later (mirrors the MobileBottomNav loading guard).
  const { data: modules = [], isLoading: modulesLoading } = useTenantModules();
  const flags: ModuleFlags = toModuleFlags(modules);
  const tenantSlug = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
  const hiddenNav = useTenantNavPrefs();
  const moduleSet = useMemo(() => toModuleSet(modules), [modules]);
  const nav: NavContext = useMemo(() => ({
    hasModule: (k) => moduleSet.has(k),
    isTenantAdmin: !!profile?.is_admin || !!profile?.is_super_admin,
    isPlatformAdmin: !!profile?.is_super_admin && tenantSlug === 'main',
    canLibrarian: typeof canEditMusicLibrary === 'function'
      ? canEditMusicLibrary()
      : !!(profile?.is_admin || profile?.is_super_admin),
    hiddenRoutes: hiddenNav,
  }), [moduleSet, profile, tenantSlug, canEditMusicLibrary, hiddenNav]);
  const { layout, layoutLoading, save: saveTileLayout } = useHomeTileLayout();
  const { primary, overflow } = modulesLoading || layoutLoading
    ? { primary: [], overflow: [] }
    : getAppTiles(isFaculty ? 'faculty' : 'student', flags, nav, layout);

  return (
    <DashboardShell>
      <div className="px-4 sm:px-6 pt-3 pb-8 space-y-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold">{greetingFor(now.getHours(), firstName)}</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {format(now, 'EEE · MMM d')}
          </p>
        </div>

        {/* Status cards sit in a left column; the News panel on the right
            spans their combined height (single column again below lg). */}
        <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
        {/* Up next — the plate that answers what/where/when. */}
        <div className="bg-card border border-border border-t-2 border-t-primary p-3">
          {upNext ? (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-primary tabular-nums">
                Up next · {format(new Date(upNext.event_at), 'h:mm a')}
              </div>
              <div className="py-1.5 font-serif text-lg">{upNext.title}</div>
              {upNext.detail && <div className="text-sm text-muted-foreground">{upNext.detail}</div>}
              <div className="h-0.5 bg-muted mt-2 overflow-hidden">
                <div className="h-full bg-primary origin-left motion-reduce:transition-none"
                  style={{ transform: `scaleX(${fuseProgress(new Date(upNext.event_at), now)})` }} />
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              {isLoading ? 'Loading your day…' : 'Nothing on the calendar — enjoy the rest.'}
            </div>
          )}
        </div>

        {/* Widget 1 */}
        {isFaculty ? (
          <div className="bg-card border border-border p-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Needs attention</div>
            {urgent.length === 0 ? (
              <div className="text-sm text-muted-foreground">All caught up.</div>
            ) : (
              <ul className="divide-y divide-border">
                {urgent.map((r) => (
                  <li key={r.id}>
                    <Link to={r.subtype === 'practice_recording' ? '/dashboard/practice-recordings' : '/attendance'}
                      className="flex items-center justify-between py-2 text-sm min-h-[44px]">
                      <span className="truncate">{r.title}</span>
                      <span className="text-xs text-status-warning-fg bg-status-warning-bg border border-status-warning-border px-1.5 py-0.5 ml-2 shrink-0">
                        {r.detail ?? 'Open'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="bg-card border border-border p-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Practice this week</div>
            <div className="text-xl tracking-[0.35em] text-primary"
              aria-label={`${glyphs.filter((g) => g === 'note').length} of 7 days practiced this week`}>
              {glyphs.map((g, i) => (
                <span key={i} aria-hidden="true" className={g === 'note' ? '' : 'text-muted-foreground/40'}>
                  {/* '○' rather than the quarter rest U+1D13D — the Musical
                      Symbols block has no font coverage on Android and some
                      desktop stacks, so it renders as tofu. */}
                  {g === 'note' ? '♩' : g === 'rest' ? '○' : '·'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Widget 2: Today */}
        <div className="bg-card border border-border p-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Today</div>
          {todayRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No sessions today.</div>
          ) : (
            <ul className="divide-y divide-border">
              {todayRows.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate">{r.title}</span>
                  <span className="tabular-nums text-muted-foreground ml-2 shrink-0">
                    {format(new Date(r.event_at), 'h:mm a')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>

        {/* News — right rail beside the status cards, fed by the
            fetch-news-feeds edge function (sources managed in Feed Control). */}
        <HomeNewsRail />
        </div>

        {/* Keycap app grid (editable — see HomeTileGrid) */}
        {!modulesLoading && !layoutLoading && (
          <HomeTileGrid primary={primary} overflow={overflow} onSave={saveTileLayout} />
        )}
      </div>
    </DashboardShell>
  );
}

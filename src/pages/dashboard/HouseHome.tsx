// House home — replaces the Command Center bento at /dashboard. Layout
// order is spec-fixed: greeting -> up next -> two role widgets -> app grid.
// Letterpress plates: bg-card border border-border (+ the up-next plate's
// top accent stripe); no other elevations.
// Spec: docs/superpowers/specs/2026-07-04-house-and-stage-design.md
import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { HomeNewsRail } from '@/components/dashboard/HomeNewsRail';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { supabase } from '@/integrations/supabase/client';
import { useIsCompactNav, useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/useUserRole';
import { useTenantModules } from '@/hooks/useModuleAccess';
import { useTenantNavPrefs } from '@/hooks/useTenantNavPrefs';
import { useEffectivePreviewRole } from '@/hooks/useEffectivePreviewRole';
import { useBrandingSettings } from '@/hooks/useBrandingSettings';
import { isFacultyProfile } from '@/lib/roles';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { getAppTiles, type ModuleFlags } from '@/lib/navigation/appDestinations';
import { toModuleFlags, toModuleSet } from '@/lib/navigation/moduleFlags';
import { applyPreviewRole, previewRoleIsFaculty, resolveNav, type NavContext } from '@/lib/navigation/navCatalog';
import { selectUpNext, fuseProgress, greetingFor } from '@/lib/home/upNext';
import { ledgerGlyphs } from '@/lib/home/ledger';
import { useMyTools } from '@/hooks/useMyTools';
import { mergeGridOrder, MY_TOOLS_CAP, resolvedTools } from '@/lib/navigation/myTools';
import { resolveWidgets } from '@/lib/navigation/homeWidgets';
import { HomeTileGrid } from '@/components/dashboard/HomeTileGrid';
import { FirstRunSheet } from '@/components/dashboard/FirstRunSheet';
import { DateCardSlot } from '@/components/home/date-card/DateCardSlot';
import { hasParsableEventAt } from '@/components/home/date-card/eventAt';
import type { DateCardContext } from '@/components/home/date-card/types';
import { PageTitle } from '@/components/dashboard/DashboardPageShell';
import { YouOweCard } from '@/components/dashboard/YouOweCard';

interface FeedRow {
  section: string; subtype: string | null; id: string; title: string;
  detail: string | null; event_at: string; severity: string | null;
  meta: Record<string, unknown> | null;
}

export default function HouseHome() {
  const { profile, loading: roleLoading, canEditMusicLibrary } = useUserRole();
  const isFaculty = isFacultyProfile(profile);
  const firstName = (profile?.full_name || 'there').split(' ')[0];
  const { settings: brandingSettings } = useBrandingSettings();
  const isMobile = useIsMobile();

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
  // ensembleName comes from gw_branding_settings.org_name (via
  // useBrandingSettings, the same hook the tenant branding UI reads) rather
  // than the profile — the profile has no ensemble_name field. When org_name
  // is unset, ensembleName stays '' and dateCardTokenContext omits the
  // {{ensemble_name}} token rather than blanking it, so an admin-authored
  // custom card leaves the placeholder visible instead of silently dropping
  // it — matching DateCardTabPanel's preview, which sets a non-empty value.
  // Malformed event_at rows are dropped here: date-fns v4's format() throws
  // on an unparseable date, and up_next/today are the first cards to see
  // live v_command_center_feed rows rather than test fixtures.
  const dateCardCtx: DateCardContext = useMemo(() => ({
    now,
    firstName,
    ensembleName: brandingSettings.org_name ?? '',
    upNext: upNext && hasParsableEventAt(upNext.event_at)
      ? { id: '', title: upNext.title, detail: upNext.detail, event_at: upNext.event_at }
      : null,
    todayRows: todayRows
      .filter((r) => hasParsableEventAt(r.event_at))
      .map((r) => ({ id: r.id, title: r.title, detail: r.detail, event_at: r.event_at })),
  }), [now, firstName, brandingSettings.org_name, upNext, todayRows]);

  // Module flags drive the app grid only — never the tab bar's flagless
  // core. While modules are still loading, `modules` defaults to `[]`
  // (every gated flag false), which would surface a fallback tile set
  // that then swaps identity once real data lands. Render an empty grid
  // area during the load instead of a set of tiles that might disappear
  // a moment later (mirrors the MobileBottomNav loading guard). We also wait
  // on the role (`roleLoading` below): until the profile resolves,
  // `isFacultyProfile(null)` is `false`, so the student tile set would render
  // and then swap to the faculty set — the same identity flash the tab bar
  // guards against.
  const { data: modules = [], isLoading: modulesLoading } = useTenantModules();
  const flags: ModuleFlags = toModuleFlags(modules);
  const tenantSlug = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
  const hiddenNav = useTenantNavPrefs();
  const previewRole = useEffectivePreviewRole();
  const moduleSet = useMemo(() => toModuleSet(modules), [modules]);
  const nav: NavContext = useMemo(() => applyPreviewRole({
    hasModule: (k) => moduleSet.has(k),
    isTenantAdmin: !!profile?.is_admin || !!profile?.is_super_admin,
    isPlatformAdmin: !!profile?.is_super_admin && tenantSlug === 'main',
    canLibrarian: typeof canEditMusicLibrary === 'function'
      ? canEditMusicLibrary()
      : !!(profile?.is_admin || profile?.is_super_admin),
    isPartner: !!profile?.is_partner,
    hiddenRoutes: hiddenNav,
  }, previewRole), [moduleSet, profile, tenantSlug, canEditMusicLibrary, hiddenNav, previewRole]);
  // Same gated pool getAppTiles resolves internally (resolveNav(nav), minus
  // the implicit 'home' entry) — the first-run sheet's ⊕ picker must never
  // offer an entry this member cannot actually open.
  const available = useMemo(() => resolveNav(nav).filter((e) => e.key !== 'home'), [nav]);
  const { myTools, loading: layoutLoading, saveTools } = useMyTools(isFaculty ? 'faculty' : 'student');
  // First-run sheet: shown once, on a brand-new member's very first load of
  // this page. `firstRunDismissed` is held locally (not derived solely from
  // myTools.setupComplete) so a Skip/Looks good tap closes the sheet
  // immediately and it stays closed for the rest of this mount even during
  // the brief window before the optimistic saveMyTools write is reflected
  // back in the query cache — without it the sheet could flash open again
  // before the save round-trips.
  const [firstRunDismissed, setFirstRunDismissed] = useState(false);
  const showFirstRun = !firstRunDismissed && !layoutLoading && !roleLoading && myTools?.setupComplete === false;
  // The member's chosen home widgets (My Space, Phase 2) — falls back to
  // the role default pair when unset, so the home never renders zero.
  const shownWidgets = useMemo(
    () => resolveWidgets(isFaculty ? 'faculty' : 'student', myTools?.widgets ?? []),
    [isFaculty, myTools],
  );
  // The phone tab bar is what the grid must not duplicate, and it only
  // exists below md — the same gate MobileBottomNav itself uses. Above it,
  // Calendar/Messages belong on the grid exactly as they do on the shelf.
  const tabBarVisible = useIsCompactNav();
  const { primary, overflow } = modulesLoading || layoutLoading || roleLoading
    ? { primary: [], overflow: [] }
    // Tile set follows the previewed role too — otherwise previewing as a
    // student still renders the faculty grid.
    : getAppTiles(
        (previewRole ? previewRoleIsFaculty(previewRole) : isFaculty) ? 'faculty' : 'student',
        flags, nav, myTools?.tools ?? null, { tabBarVisible },
      );

  // Which stored keys this grid is able to show at all. A stored key outside
  // this set (route claimed by the tab bar, module switched off, key retired)
  // has no keycap, so an edit session cannot speak for it — mergeGridOrder
  // carries it through untouched instead of letting Done delete it.
  const representable = useMemo(
    () => new Set([...primary, ...overflow].map((t) => t.key)),
    [primary, overflow],
  );
  // resolvedTools (not the raw myTools?.tools ?? []) so a stored merged key
  // (e.g. the retired 'merch') matches `representable` by its resolved name
  // ('shop') below — representable is built from getAppTiles/primary+overflow,
  // which resolves internally. Comparing a raw stored key against a resolved
  // representable set undercounted gridCap and made mergeGridOrder treat the
  // stored key as un-representable, carrying it through unresolved instead
  // of recognizing it already had a keycap under its new name (Phase 5
  // review, 2026-08-09).
  const storedTools = useMemo(() => resolvedTools(myTools), [myTools]);
  // Room left for keycaps once the un-representable stored keys have taken
  // their share of MY_TOOLS_CAP. Without this the merged record could exceed
  // the cap and sanitizeTools would silently truncate the tail — the same
  // class of silent drop this whole path exists to prevent.
  const gridCap = Math.max(0, MY_TOOLS_CAP - storedTools.filter((k) => !representable.has(k)).length);
  const saveGridOrder = useCallback(
    (draft: string[]) => saveTools(mergeGridOrder(storedTools, draft, representable)),
    [saveTools, storedTools, representable],
  );

  return (
    <DashboardShell>
      <div className="px-4 sm:px-6 pt-3 pb-8 space-y-4">
        <YouOweCard />
        <div className="flex items-start justify-between gap-3">
          <div>
            {/* No date line here — the DateCardSlot directly below already
                leads with the full date and weekday. */}
            <PageTitle>{greetingFor(now.getHours(), firstName)}</PageTitle>
          </div>
        </div>

        <DateCardSlot ctx={dateCardCtx} activeAddons={Array.from(moduleSet)} />

        {/* Status cards on the left, News rail on the right. Below lg they
            stack. On lg+ they render inside a horizontal resizable pair —
            drag the divider to widen either side. Split is persisted in
            localStorage via autoSaveId so it survives reloads. */}
        {(() => {
          const statusColumn = (
            <div className="min-w-0 space-y-4 h-full">
        {/* Up next — the plate that answers what/where/when. */}
        <div className="bg-card border border-border border-t-2 border-t-primary p-3">
          {upNext ? (
            <>
              <div className="text-xs font-bold uppercase tracking-widest text-primary tabular-nums">
                Up next · {format(new Date(upNext.event_at), 'h:mm a')}
              </div>
              <div className="py-1.5 text-lg">{upNext.title}</div>
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

        {/* Widget 1 — 'needs-attention' (faculty) or 'practice-ledger'
            (student), only when the member chose it in My Space. Gated on
            the same three loading flags as the keycap grid below: shownWidgets
            depends on isFaculty (roleLoading) and myTools (layoutLoading), so
            rendering before those resolve would show the guessed pair and
            then flip to the real one — the same flash the grid's own gate
            exists to prevent. */}
        {!modulesLoading && !layoutLoading && !roleLoading && (
          <>
            {isFaculty ? (
              shownWidgets.includes('needs-attention') && (
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
              )
            ) : (
              shownWidgets.includes('practice-ledger') && (
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
              )
            )}

            {/* Widget 2: Today */}
            {shownWidgets.includes('today') && (
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
            )}
          </>
        )}
            </div>
          );

          if (isMobile) {
            return (
              <div className="space-y-4">
                {statusColumn}
                <HomeNewsRail />
              </div>
            );
          }

          return (
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="house-home-status-news"
              className="min-h-[280px]"
            >
              <ResizablePanel defaultSize={66} minSize={35} className="min-w-0 pr-3">
                {statusColumn}
              </ResizablePanel>
              <ResizableHandle withHandle className="mx-1" />
              <ResizablePanel defaultSize={34} minSize={22} className="min-w-0 pl-3">
                <HomeNewsRail />
              </ResizablePanel>
            </ResizablePanelGroup>
          );
        })()}

        {/* Keycap app grid (editable — see HomeTileGrid) */}
        {!modulesLoading && !layoutLoading && !roleLoading && (
          <HomeTileGrid primary={primary} overflow={overflow} cap={gridCap} onSave={saveGridOrder} />
        )}
      </div>

      {/* Mounted CONDITIONALLY, not rendered with open={false}. The sheet
          seeds its draft from the tenant default the moment that query
          resolves, and useUserRole caches nothing — `roleLoading` starts
          true on every mount while useTenantDefaultTools has a 60s
          staleTime, so on any remount inside that window the defaults
          resolve first and a mounted-but-closed sheet would seed against
          `role='student'` computed from a still-null profile. The role
          then flips to 'faculty' and every exit path persists that student
          shelf. `showFirstRun` already waits on !roleLoading, so gating the
          MOUNT on it means the seed cannot be computed from a guess. It
          also stops every member's home load firing a gw_tenant_nav_prefs
          query for a sheet they will never see. */}
      {showFirstRun && (
        <FirstRunSheet
          open
          onOpenChange={(next) => { if (!next) setFirstRunDismissed(true); }}
          available={available}
          role={isFaculty ? 'faculty' : 'student'}
        />
      )}
    </DashboardShell>
  );
}

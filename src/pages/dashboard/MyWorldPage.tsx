// MyWorldPage — the personal /dashboard/my-world settings screen. Mounts
// MyWorldEditor (Task 3) over the member's own My Tools record, wiring its
// presentation-only callbacks to useMyTools' persistence.
//
// Persists on every change; there is no Save button. useMyTools writes
// optimistically, so edits feel instant on both the shelf and the home
// grid, and an unsaved-changes state on a mobile settings screen is a trap
// (leave the page mid-edit and the change is gone). A toast fires only when
// a save returns false, so a failure is never silent.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.4
import { useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { useTenantNavPrefs } from '@/hooks/useTenantNavPrefs';
import { useEffectivePreviewRole } from '@/hooks/useEffectivePreviewRole';
import { useMyTools } from '@/hooks/useMyTools';
import { useTenantDefaultTools } from '@/hooks/useTenantDefaultTools';
import { useToast } from '@/hooks/use-toast';
import { isFacultyProfile } from '@/lib/roles';
import {
  applyPreviewRole, resolveNav, HIDEABLE_NAV_ROLES, type NavContext, type NavRole, GATED_MODULE_KEYS } from '@/lib/navigation/navCatalog';
import {
  DEFAULT_TOOLS_FACULTY, DEFAULT_TOOLS_STUDENT, sanitizeShelf,
  type Shelf, type ToolGroup,
} from '@/lib/navigation/myTools';
import { flattenShelf } from '@/lib/navigation/toolGroups';
import { widgetsFor, resolveWidgets } from '@/lib/navigation/homeWidgets';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { MyWorldEditor } from '@/components/dashboard/MyWorldEditor';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/** Platform default shelf for a given tenant-nav role — same seeding rule
 * DEFAULT_TOOLS_FACULTY/STUDENT already encode: faculty shelf for admins,
 * student shelf for students AND members (there is no separate member
 * default; the two roles historically share one plain-member shelf). */
function platformDefaultFor(role: NavRole): string[] {
  return role === 'admin' ? DEFAULT_TOOLS_FACULTY : DEFAULT_TOOLS_STUDENT;
}

// Same fixed key list DashboardShell's Sidebar/MobileNav loop over — a
// gated nav entry with a module key missing here silently hides for every
// consumer, this page included. Hooks must run unconditionally and in
// stable order, so the loop below carries the same rules-of-hooks
// disable DashboardShell uses.
// Derived from NAV_CATALOG (GATED_MODULE_KEYS) rather than hand-listed: a
// gated nav entry whose module id was missing from this list rendered
// nowhere, silently. See navCatalog.ts for the two times that shipped.
const MODULE_KEYS = GATED_MODULE_KEYS;

export default function MyWorldPage() {
  const { toast } = useToast();
  const { profile, canEditMusicLibrary } = useUserRole();
  const userCanLibrarian = typeof canEditMusicLibrary === 'function'
    ? canEditMusicLibrary()
    : !!(profile?.is_admin || profile?.is_super_admin);
  const isTenantAdmin = !!profile?.is_admin || !!profile?.is_super_admin;
  const tenantSlug = (typeof window !== 'undefined' && (window as { __TENANT_CONFIG__?: { tenant?: string } }).__TENANT_CONFIG__?.tenant) || null;
  const isPlatformAdmin = !!profile?.is_super_admin && tenantSlug === 'main';

  const moduleAccess: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed-length loop over a const array; call order is stable across renders
    moduleAccess[key] = useModuleAccess(key).hasAccess;
  }
  const hiddenNav = useTenantNavPrefs();
  const previewRole = useEffectivePreviewRole();

  // Identical derivation to DashboardShell's Sidebar — an entry the member
  // cannot open must never be offered by the ⊕ picker below.
  //
  // MEMOIZED, like HouseHome's equivalent: navCtx is the dep of three
  // downstream useMemos (available, defaultsAvailable, preview), so a fresh
  // object every render made all three inert — they re-resolved the whole
  // catalog on every keystroke-equivalent render. `moduleAccess` is rebuilt
  // by the loop above on every render, so it can't be a dep; its VALUES are
  // what matter, and they collapse to a stable bit-string.
  const moduleAccessKey = MODULE_KEYS.map((k) => (moduleAccess[k] ? '1' : '0')).join('');
  const isPartner = !!profile?.is_partner;
  const navCtx: NavContext = useMemo(() => applyPreviewRole({
    hasModule: (k) => k === 'academy' || !!moduleAccess[k],
    isTenantAdmin, isPlatformAdmin, canLibrarian: userCanLibrarian,
    isPartner,
    hiddenRoutes: hiddenNav,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- moduleAccess is rebuilt every render; moduleAccessKey is its stable value-identity
  }, previewRole), [moduleAccessKey, isTenantAdmin, isPlatformAdmin, userCanLibrarian, isPartner, hiddenNav, previewRole]);
  // resolveNav, NOT buildNavSections — the latter filters to sidebar
  // surfaces and would hide grid-only entries like merch. 'home' is
  // filtered out here: it carries no gate, so resolveNav returns it like
  // any other entry, but it always renders on the shelf first and is
  // never a stored/choosable tool (sanitizeTools deliberately drops it).
  // Leaving it in `available` offered a ⊕ "Command Center" row that did
  // nothing when tapped — a dead affordance.
  const available = useMemo(() => resolveNav(navCtx).filter((e) => e.key !== 'home'), [navCtx]);

  const isFaculty = isFacultyProfile(profile);
  const role: 'student' | 'faculty' = isFaculty ? 'faculty' : 'student';
  const { myTools, loading: toolsLoading, loaded: toolsLoaded, saveMyTools } = useMyTools(role);
  // Until the record has actually landed, myTools is null and tools/widgets
  // would read as empty — mounting the editor against that would let a tap
  // in this window persist an empty/near-empty record over whatever the
  // member really has stored (useMyTools.saveMyTools fills any omitted
  // field from the CURRENT myTools, so a widget toggle fired here writes
  // `tools: []` right over their real 8-tool set). Not ready until loading
  // is done AND a record actually exists.
  //
  // `myTools != null` is NOT enough on its own: useMyTools deliberately
  // falls back to FABRICATED role defaults (DEFAULT_TOOLS_STUDENT/FACULTY)
  // when the load fails, specifically so the shelf elsewhere never blanks —
  // but that means myTools is non-null after a failed load too. Mounting
  // the editor against that fabrication let an edit's saveMyTools call fill
  // every omitted field from it, persisting the role defaults straight over
  // the member's real curated set. `loaded` is the only signal that
  // distinguishes "genuinely fetched" from "fabricated fallback" — gate on
  // it too. The render fallback (shelf/home grid elsewhere) is untouched;
  // this only withholds the WRITE-capable editor on this page.
  const ready = !toolsLoading && toolsLoaded && myTools != null;
  // ONE sanitizeShelf over BOTH lists, exactly as HouseHome reads them —
  // never resolvedTools on the loose list with the groups read raw.
  //
  // MyWorldEditor renders any key with no matching catalog entry as an
  // "Unavailable — <key>" row (deliberately — it's the one surface that can
  // clear a truly dead key). A stored key that MERGED into a live entry
  // (e.g. retired 'merch' -> 'shop') is not dead, so it must resolve before
  // reaching the editor — otherwise it shows as "Unavailable" AND its living
  // successor shows a second time in "More Tools" as addable (Phase 5 review,
  // 2026-08-09).
  //
  // Fixing only the loose list left that same bug alive one level down, and
  // made it worse (final review, 2026-08-10). A key retired AFTER a member
  // filed it into a group rendered dead inside the group while its successor
  // was offered as addable; adding it meant the next sanitizeShelf on WRITE
  // resolved both to 'shop', kept the loose copy, and silently emptied the
  // group. And where the record legitimately holds two sides of a merge —
  // 'merch' loose, 'shop' grouped, both separately pinnable until
  // 2026-08-09 — resolving only one side rendered the same string twice, so
  // sortableIds and the <ul>'s React keys carried a duplicate: broken drag.
  //
  // Reading both through one pass makes read and write agree on resolved
  // keys, and shares the one-key-one-place `seen` set across them. For a
  // member with NO groups this is exactly resolvedTools' old behaviour:
  // sanitizeShelf's loose pass is sanitizeTools with the same resolve, drop
  // 'home', dedupe, and MY_TOOLS_SANITY_MAX steps.
  const shelf = useMemo(
    () => sanitizeShelf(myTools?.tools ?? [], myTools?.groups ?? []),
    [myTools],
  );
  const tools = shelf.tools;
  const groups = shelf.groups;
  const widgetOptions = widgetsFor(role);
  const widgets = useMemo(() => resolveWidgets(role, myTools?.widgets ?? []), [role, myTools]);

  // Loose AND grouped: the strip covers everything in the member's world,
  // so filing a tool into a group must not make it read as unchosen.
  const chosenKeys = useMemo(
    () => new Set(flattenShelf({ tools, groups })),
    [tools, groups],
  );

  // MyWorldEditor hands BOTH lists up on every group edit — its two
  // callbacks are one edit, not two (moveTool and deleteGroup each touch
  // loose AND groups). Saving each half on its own would put two RPCs in
  // flight against the same row with no ordering guarantee, and the FIRST
  // one carries a half-applied shelf: moveTool's removal without its
  // insertion. If that one landed last the moved tool would be gone from the
  // stored record entirely; and if the second one failed, saveMyTools would
  // roll the cache back to that half-applied state and two toasts would fire
  // for one edit. So both halves merge into one patch, written once on the
  // microtask after the edit — one RPC, one optimistic write, one toast.
  const pendingShelf = useRef<Partial<Shelf> | null>(null);

  const flushShelf = async () => {
    const patch = pendingShelf.current;
    pendingShelf.current = null;
    if (!patch) return;
    const ok = await saveMyTools(patch);
    if (!ok) {
      toast({
        title: 'Could not save your tools',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  // The editor only mounts once `ready`, so this gate is belt-and-braces —
  // but it is the write path, and saveMyTools fills every omitted field from
  // the current record, so an edit committed before the record landed would
  // persist emptiness over the member's real shelf. Not `!toolsLoading`:
  // that is also true after a FAILED load, where the in-memory record holds
  // fabricated role defaults rather than the member's data.
  const queueShelf = (patch: Partial<Shelf>) => {
    if (!ready) return;
    const isFirstOfTick = pendingShelf.current === null;
    pendingShelf.current = { ...pendingShelf.current, ...patch };
    if (isFirstOfTick) queueMicrotask(() => { void flushShelf(); });
  };

  const handleToolsChange = (next: string[]) => queueShelf({ tools: next });
  const handleGroupsChange = (next: ToolGroup[]) => queueShelf({ groups: next });

  // The chip strip's tap handler. Adding lands in the loose list (same as
  // the editor's ⊕); removing has to sweep loose AND groups in ONE patch —
  // two queueShelf calls would still merge same-tick, but one call keeps
  // the remove atomic on its face.
  const toggleToolChip = (key: string) => {
    if (!chosenKeys.has(key)) {
      handleToolsChange([...tools, key]);
      return;
    }
    queueShelf({
      tools: tools.filter((k) => k !== key),
      groups: groups.map((g) => ({ ...g, tools: g.tools.filter((k) => k !== key) })),
    });
  };

  const handleWidgetsChange = async (next: string[]) => {
    const ok = await saveMyTools({ widgets: next });
    if (!ok) {
      toast({
        title: 'Could not save your widgets',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  // Second mode, admin-only: setting the default shelf each ROLE starts
  // with, rather than editing the viewer's own. Same editor, different
  // record — widgets are personal and never part of a tenant default, so
  // no widgetOptions is passed in this mode.
  const [worldMode, setWorldMode] = useState<'mine' | 'defaults'>('mine');
  // Students are the far more common target for a default shelf — the
  // first thing an admin will want to set.
  const [defaultsRole, setDefaultsRole] = useState<NavRole>('student');
  const { defaultsByRole, saveDefaults } = useTenantDefaultTools();
  const showDefaults = isTenantAdmin && worldMode === 'defaults';
  // The ⊕ pool must reflect the ROLE being configured, not the viewing
  // admin — reusing `available` (built from the admin's own navCtx) let an
  // admin editing Students' or Members' defaults add an adminOnly entry
  // (People, Finance, …). On a member's own My World that key is filtered
  // out by their own adminOnly gate, so it silently occupies one of their
  // 8 slots forever, invisible and unremovable. applyPreviewRole already
  // exists for exactly this "edit as if this role" narrowing — the same
  // helper WorkspaceSettingsPage's preview toggle uses.
  const defaultsAvailable = useMemo(
    () => resolveNav(applyPreviewRole(navCtx, defaultsRole)).filter((e) => e.key !== 'home'),
    [navCtx, defaultsRole],
  );
  // Seed from the platform default until this tenant has actually saved
  // one for the role — an admin edits a real starting point, never an
  // empty box. (The underlying gw_tenant_nav_prefs.default_tools column
  // isn't applied to any live DB yet, so this path is also what a
  // production tenant sees today: the query fails, the hook degrades to
  // EMPTY for every role, and this seed fills the gap.)
  const storedDefaults = defaultsByRole[defaultsRole];
  const defaultsTools = storedDefaults.length > 0 ? storedDefaults : platformDefaultFor(defaultsRole);

  const handleDefaultsChange = async (next: string[]) => {
    const ok = await saveDefaults(defaultsRole, next);
    if (!ok) {
      toast({
        title: 'Could not save defaults',
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardShell>
      <DashboardPageShell
        title="My World"
        subtitle="Choose the tools and widgets you want close at hand."
      >
        {isTenantAdmin && (
          <Tabs
            value={worldMode}
            onValueChange={(v) => setWorldMode(v as 'mine' | 'defaults')}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="mine">Mine</TabsTrigger>
              <TabsTrigger value="defaults">Defaults for members</TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {showDefaults ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {HIDEABLE_NAV_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setDefaultsRole(r.value)}
                  className={cn(
                    'inline-flex items-center justify-center h-8 px-3.5 rounded-full text-xs font-medium transition-colors',
                    defaultsRole === r.value
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              New members with this role start with these tools. They can change their own world any time.
            </p>
            {/* Tenant defaults stay FLAT in Phase 1: default_tools is still
                text[] and cannot carry groups, so the group props are omitted
                and the editor renders no group UI here at all. Phase 2
                migrates the column and turns this on — see the spec's §6.1
                warning about ADD COLUMN IF NOT EXISTS. */}
            <MyWorldEditor
              available={defaultsAvailable}
              tools={defaultsTools}
              onToolsChange={handleDefaultsChange}
            />
          </div>
        ) : !ready ? (
          // No editor mounted yet — a null record has nothing safe to save
          // over it, so no handler exists to (mis)fire while this shows.
          <div data-testid="my-world-loading" className="space-y-6" aria-live="polite" aria-busy="true">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Loading your world…</span>
            </div>
            <div className="h-40 rounded-xl bg-muted animate-pulse" />
            <div className="h-24 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            {/* Tool chip strip — every available tool, tappable. Chosen ones
                are filled with a check; the identical-pill readout it
                replaced was unreadable as state (Kevin, 2026-08-13: "I
                can't tell when an item is selected"). */}
            <div data-testid="my-world-preview" className="flex flex-wrap gap-2">
              {available.map((entry) => {
                const chosen = chosenKeys.has(entry.key);
                return (
                  <button
                    key={entry.key}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => toggleToolChip(entry.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-medium transition-colors',
                      chosen
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {chosen
                      ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      : <entry.icon className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                    {entry.label}
                  </button>
                );
              })}
            </div>

            <MyWorldEditor
              available={available}
              tools={tools}
              onToolsChange={handleToolsChange}
              groups={groups}
              onGroupsChange={handleGroupsChange}
              widgetOptions={widgetOptions}
              widgets={widgets}
              onWidgetsChange={handleWidgetsChange}
            />
          </>
        )}
      </DashboardPageShell>
    </DashboardShell>
  );
}

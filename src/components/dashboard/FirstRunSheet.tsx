// FirstRunSheet — greets a brand-new member once, on first login
// (myTools.setupComplete === false), prefilled with their role's tenant
// default (falling back to the platform default) so nobody's first
// impression of My Space is an empty box. `Skip` and `Looks good` are
// deliberately the SAME action: both persist whatever is currently shown
// and flip setupComplete so the sheet never reopens — "skipping" a
// first-run picker must never mean "start with nothing".
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6.4
import { useEffect, useRef, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useIsCompactNav } from '@/hooks/use-mobile';
import { useMyTools } from '@/hooks/useMyTools';
import { useTenantDefaultTools } from '@/hooks/useTenantDefaultTools';
import { DEFAULT_TOOLS_FACULTY, DEFAULT_TOOLS_STUDENT } from '@/lib/navigation/myTools';
import { MySpaceEditor } from '@/components/dashboard/MySpaceEditor';
import type { CatalogEntry, NavRole } from '@/lib/navigation/navCatalog';

export interface FirstRunSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every entry this member may use, already gated — same pool the caller
   *  built for its own grid/shelf. */
  available: CatalogEntry[];
  role: 'student' | 'faculty';
}

export function FirstRunSheet({ open, onOpenChange, available, role }: FirstRunSheetProps) {
  // Radix Sheet: bottom sheet below md (matches the tab-bar breakpoint —
  // see useIsCompactNav), right-side panel at md and above.
  const isCompact = useIsCompactNav();

  // This component owns its own read/write of the member's record — the
  // same hook the personal My Space page uses — rather than taking it as a
  // prop, so it can be mounted anywhere with just a role.
  const { myTools, loading, saveMyTools } = useMyTools(role);
  const { defaultsByRole, loading: defaultsLoading } = useTenantDefaultTools();

  // NavRole ('admin' | 'student' | 'member') is a DIFFERENT vocabulary from
  // the two-value profile role this component receives ('faculty' |
  // 'student'). gw_tenant_nav_prefs keys its rows by NavRole, so reading a
  // tenant default requires mapping faculty -> 'admin' (the tenant-admin
  // default shelf) and student -> 'student'. Swapping this mapping silently
  // hands faculty the student default shelf and vice versa.
  const roleKey: NavRole = role === 'faculty' ? 'admin' : 'student';
  const platformDefault = role === 'faculty' ? DEFAULT_TOOLS_FACULTY : DEFAULT_TOOLS_STUDENT;
  const tenantDefault = defaultsByRole[roleKey];
  const seed = tenantDefault.length > 0 ? tenantDefault : platformDefault;

  // Seed the draft ONCE — from the tenant default once it has actually
  // loaded, otherwise straight from the platform default so the sheet never
  // shows an empty picker while the tenant query is in flight. Re-seeding on
  // every render would stomp the member's in-sheet edits every time
  // defaultsByRole's object identity changes.
  const [tools, setTools] = useState<string[]>(() => (defaultsLoading ? platformDefault : seed));
  const seededRef = useRef(!defaultsLoading);
  useEffect(() => {
    if (seededRef.current || defaultsLoading) return;
    seededRef.current = true;
    setTools(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed intentionally excluded: this must fire exactly once, when defaultsLoading flips false
  }, [defaultsLoading]);

  // The one thing that must not go wrong (Task 4 shipped this bug once
  // already): saveMyTools fills any omitted field from whatever is CURRENTLY
  // on the member's record. If this sheet could fire a save before myTools
  // has loaded, `tools` here is just the seed/platform guess, not a merge —
  // there is nothing to omit-and-preserve, so a premature save could
  // overwrite a real record with a smaller, guessed one. Gate every save
  // path on the record actually being loaded and present.
  const canSave = !loading && myTools != null;

  const handleAccept = () => {
    if (!canSave) return;
    void saveMyTools({ tools, setupComplete: true });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isCompact ? 'bottom' : 'right'}
        className="flex flex-col gap-4 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Set up your space</SheetTitle>
          <SheetDescription>
            Pick the tools you&apos;ll use. You can change this any time in Setup.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto -mx-4 px-4 sm:-mx-6 sm:px-6">
          <MySpaceEditor
            available={available}
            tools={tools}
            onToolsChange={setTools}
            disabled={!canSave}
          />
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button type="button" variant="ghost" onClick={handleAccept} disabled={!canSave}>
            Skip
          </Button>
          <Button type="button" onClick={handleAccept} disabled={!canSave}>
            Looks good
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

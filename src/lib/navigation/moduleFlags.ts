// Shared mapper from the raw tenant module list (v_tenant_active_modules,
// via useTenantModules()) to the ModuleFlags shape the navigation registry
// consumes. Single source of truth so MobileBottomNav and HouseHome (and
// any future consumer) derive flags identically.
import type { TenantModule } from '@/hooks/useModuleAccess';
import type { ModuleFlags } from './appDestinations';

export function toModuleFlags(modules: TenantModule[]): ModuleFlags {
  const hasModule = (moduleId: string) => modules.some((m) => m.module_id === moduleId);
  return {
    hasViewer: hasModule('viewer'),
    hasPartTracks: hasModule('part_tracks'),
    hasStudio: hasModule('studio'),
    hasSightReading: hasModule('sight_reading'),
    hasBoxOffice: hasModule('box_office'),
    hasConcertPlanner: hasModule('concert_planner'),
    hasMerch: hasModule('merch'),
    hasFinance: hasModule('finance'),
    hasAcademy: true, // Academy is core, not a gated add-on.
  };
}

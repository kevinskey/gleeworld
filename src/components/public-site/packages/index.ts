// Template packages for the public site builder. A package is a curated
// bundle of theme tokens + starter blocks that a tenant can adopt with one
// click. The tenant still owns everything — packages just replace the
// default seeder that used to plant seven half-configured blocks.
//
// Adding a package: create a file in this directory that exports a
// TemplatePackage matching the shape below, then add it to PACKAGE_REGISTRY.
// The site editor picks up new entries automatically.

import type { SiteTheme } from '../types';
import { modernPackage } from './modern';
import { institutionalPackage } from './institutional';
import { minimalistPackage } from './minimalist';
import { elegantPackage } from './elegant';
import { boldPackage } from './bold';

/** One seeded block in a package. `configOverrides` merge on top of the
 *  block module's `defaultConfig`, so we only spell out what's specific to
 *  this package (headline, section heading, etc). */
export interface PackageBlockSeed {
  type: string;
  config?: Record<string, unknown>;
}

export interface TemplatePackage {
  id: 'modern' | 'institutional' | 'minimalist' | 'elegant' | 'bold';
  name: string;
  description: string;
  /** Preview thumbnail — a data URL or served asset path. */
  thumbnail?: string;
  /** Marks packages that aren't fully ready yet — shown in the picker as
   *  "coming soon" and can't be selected. */
  comingSoon?: boolean;
  /** Theme token defaults (colors default to tenant branding if omitted). */
  theme: Partial<SiteTheme>;
  /** Blocks to seed, in order. Header is always position 0 and its config
   *  comes from tenant branding, so packages don't include it explicitly —
   *  the RPC injects it. */
  blocks: PackageBlockSeed[];
}

export const PACKAGE_REGISTRY: Record<TemplatePackage['id'], TemplatePackage> = {
  modern: modernPackage,
  institutional: institutionalPackage,
  minimalist: minimalistPackage,
  elegant: elegantPackage,
  bold: boldPackage,
};

export const PACKAGE_LIST: TemplatePackage[] = Object.values(PACKAGE_REGISTRY);

export function getPackage(id: string): TemplatePackage | undefined {
  return PACKAGE_REGISTRY[id as TemplatePackage['id']];
}

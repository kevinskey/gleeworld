import { z } from 'zod';
import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

export const themeSchema = z.object({
  primaryColor: z.string().default('#0f172a'),
  accentColor: z.string().default('#9333ea'),
  fontFamily: z.enum(['sans', 'serif']).default('sans'),
});
export type SiteTheme = z.infer<typeof themeSchema>;

// A block row as stored in gw_site_blocks (and snapshotted into published_blocks).
export interface SiteBlock {
  id: string;
  block_type: string;
  position: number;
  config: Record<string, unknown>;
  is_visible: boolean;
}

// Context handed to every block render. isPreview = editor preview (admin
// session, draft data, tenant-scoped queries); otherwise the public /sites/:slug
// page (anon, published snapshot + RPCs only).
export interface SiteRenderContext {
  slug: string;
  theme: SiteTheme;
  orgName: string;
  logoUrl: string | null;
  isPreview: boolean;
  activeAddons: string[];
}

export interface BlockRenderProps<C = Record<string, unknown>> {
  config: C;
  ctx: SiteRenderContext;
}

export interface BlockEditorFormProps<C = Record<string, unknown>> {
  config: C;
  onChange: (config: C) => void;
}

export interface BlockModule<S extends z.ZodTypeAny = z.ZodTypeAny> {
  type: string;
  name: string;
  description: string;
  icon: LucideIcon;
  tier: 'free' | 'addon';
  /** gw_billing_modules.id that must be active for this block */
  requiredAddon?: string;
  /** Locked blocks pin to position 0 and can't be hidden or deleted (header). */
  locked?: boolean;
  configSchema: S;
  defaultConfig: z.infer<S>;
  /** Custom settings form; falls back to the generic zod-driven AutoForm. */
  EditorForm?: ComponentType<BlockEditorFormProps<z.infer<S>>>;
  Render: ComponentType<BlockRenderProps<z.infer<S>>>;
}

/** Parse a stored config against the block schema, falling back to defaults per field. */
export function safeConfig<S extends z.ZodTypeAny>(mod: BlockModule<S>, raw: unknown): z.infer<S> {
  const parsed = mod.configSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return mod.configSchema.parse(mod.defaultConfig);
}

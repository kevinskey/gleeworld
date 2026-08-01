// Which `/` landing branch renders, from the tenant bootstrap config.
// The apex (slug 'main' or missing) is ALWAYS the GleeWorld marketing site.
// `org` alone must never decide: the apex bootstrap can carry a truthy org —
// restore-tenant-bootstraps.sh writes gw_tenants.name ("GW Preview") for every
// slug, which flipped gleeworld.org into the tenant-clone events landing
// (2026-07-16, again 2026-07-31).
export const isTenantCloneLanding = (
  slug: string | undefined,
  org: string | undefined,
) => !!slug && slug !== "main" && !!org;

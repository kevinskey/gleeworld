import { describe, expect, it } from "vitest";
import { isTenantCloneLanding } from "../landingGate";

describe("isTenantCloneLanding", () => {
  it("never treats the apex as a tenant clone, even with a truthy org", () => {
    // Regression: restore-tenant-bootstraps.sh rewrote tenants/main with
    // org "GW Preview" (2026-07-31), which flipped gleeworld.org from the
    // MarketingSite to the tenant-clone events landing.
    expect(isTenantCloneLanding("main", "GW Preview")).toBe(false);
  });

  it("treats a missing slug as the apex", () => {
    expect(isTenantCloneLanding(undefined, "GW Preview")).toBe(false);
    expect(isTenantCloneLanding(undefined, undefined)).toBe(false);
  });

  it("is false on the apex with no org", () => {
    expect(isTenantCloneLanding("main", "")).toBe(false);
    expect(isTenantCloneLanding("main", undefined)).toBe(false);
  });

  it("is true for a tenant slug with an org", () => {
    expect(isTenantCloneLanding("spelman", "Spelman Glee Club")).toBe(true);
  });

  it("still requires an org for tenant slugs", () => {
    expect(isTenantCloneLanding("spelman", "")).toBe(false);
    expect(isTenantCloneLanding("spelman", undefined)).toBe(false);
  });
});

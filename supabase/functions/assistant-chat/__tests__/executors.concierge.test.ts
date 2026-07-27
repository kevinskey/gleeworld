import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeServerTool } from '../executors';

const stubSupabase = { from: () => ({}) } as any;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({
      places: [{ formattedAddress: '350 Spelman Ln SW, Atlanta, GA 30314', location: { latitude: 33.7461, longitude: -84.4128 } }],
    }),
  })));
});
afterEach(() => vi.unstubAllGlobals());

describe('get_ride executor', () => {
  it('geocodes destination and returns Uber+Lyft deep links + ride panel', async () => {
    const out = await executeServerTool('get_ride', { destination: 'Spelman College' }, {
      supabase: stubSupabase, googleMapsApiKey: 'test',
    });
    const panel = out.resultsPanel as any;
    expect(panel.kind).toBe('ride');
    expect(panel.resolvedAddress).toContain('Spelman');
    expect(panel.uberUrl).toContain('dropoff%5Blatitude%5D=33.7461');
    expect(panel.uberUrl).toContain('dropoff%5Blongitude%5D=-84.4128');
    expect(panel.uberUrl).toContain('m.uber.com/ul/');
    expect(panel.lyftUrl).toContain('ride.lyft.com/ride');
    expect(panel.lyftUrl).toContain('destination%5Blatitude%5D=33.7461');
    expect(panel.lyftUrl).toContain('destination%5Blongitude%5D=-84.4128');
    expect(JSON.parse(out.replyJson).resolvedAddress).toContain('Spelman');
  });

  it('resolves "home" to the profile home_address', async () => {
    const out = await executeServerTool('get_ride', { destination: 'home' }, {
      supabase: stubSupabase, googleMapsApiKey: 'test', homeAddress: '100 Main St, Atlanta, GA',
    });
    // Executor should have called fetch with the resolved home_address, not "home".
    const fetchArg = (globalThis.fetch as any).mock.calls[0][1].body;
    expect(fetchArg).toContain('100 Main St');
  });

  it('returns a helpful error when no Google Maps key is configured', async () => {
    const out = await executeServerTool('get_ride', { destination: 'anywhere' }, { supabase: stubSupabase });
    expect(out.resultsPanel).toBeUndefined();
    expect(JSON.parse(out.replyJson).error).toContain('not configured');
  });

  it('asks for a destination when "home" is unresolved', async () => {
    const out = await executeServerTool('get_ride', { destination: 'home' }, {
      supabase: stubSupabase, googleMapsApiKey: 'test',
    });
    // No home_address in deps → executor must NOT hit fetch.
    expect((globalThis.fetch as any)).not.toHaveBeenCalled();
    expect(JSON.parse(out.replyJson).error).toContain("don't have your home address");
  });
});

describe('order_food executor', () => {
  it('returns three service deep links with the query in each URL', async () => {
    const out = await executeServerTool('order_food', { query: 'donuts' }, { supabase: stubSupabase });
    const panel = out.resultsPanel as any;
    expect(panel.kind).toBe('food');
    expect(panel.query).toBe('donuts');
    const names = panel.services.map((s: any) => s.name).sort();
    expect(names).toEqual(['DoorDash', 'Grubhub', 'Uber Eats']);
    for (const svc of panel.services) {
      expect(svc.deepLinkUrl).toMatch(/donuts/i);
      expect(svc.deepLinkUrl).toMatch(/^https:\/\//);
    }
  });

  it('with no query, returns homepage URLs (no query fragment)', async () => {
    const out = await executeServerTool('order_food', {}, { supabase: stubSupabase });
    const panel = out.resultsPanel as any;
    expect(panel.query).toBe('');
    for (const svc of panel.services) {
      expect(svc.deepLinkUrl).not.toMatch(/donuts/);
    }
  });

  it('preserves preferred service in payload', async () => {
    const out = await executeServerTool('order_food', { query: 'pizza', preferred: 'grubhub' }, { supabase: stubSupabase });
    expect((out.resultsPanel as any).preferred).toBe('grubhub');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const from = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a), from: (...a: unknown[]) => from(...a) } }));

import { fetchSharePeople, isMissingRpc, summarizeReach } from '../sharePeople';

const people = [
  { user_id: 'u1', full_name: 'Babette', email: 'b@example.org', member_role: 'member', voice_part: 'alto_1' },
  { user_id: 'u2', full_name: 'Natasha', email: 'n@example.org', member_role: 'member', voice_part: 'alto_1' },
  { user_id: 'u3', full_name: null, email: 'x@example.org', member_role: 'fan', voice_part: null },
];

function profilesChain(rows: unknown[], error: unknown = null) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(async () => ({ data: rows, error })),
  };
  return chain;
}

describe('fetchSharePeople', () => {
  beforeEach(() => { rpc.mockReset(); from.mockReset(); });

  it('lists the workspace members from gw_share_people', async () => {
    rpc.mockResolvedValue({ data: people, error: null });
    const out = await fetchSharePeople();
    expect(rpc).toHaveBeenCalledWith('gw_share_people');
    expect(out.map((p) => p.user_id)).toEqual(['u1', 'u2', 'u3']);
    expect(from).not.toHaveBeenCalled();
  });

  it('falls back to profiles homed here only while the RPC is missing', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'not found' } });
    from.mockReturnValue(profilesChain([{ user_id: 'u1', full_name: 'Babette', email: 'b@example.org', voice_part: null }]));
    const out = await fetchSharePeople();
    expect(from).toHaveBeenCalledWith('gw_profiles');
    expect(out).toEqual([{ user_id: 'u1', full_name: 'Babette', email: 'b@example.org', voice_part: null, member_role: null }]);
  });

  it('surfaces a real error (e.g. not allowed to share here) instead of hiding it', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'not allowed to share in this workspace' } });
    await expect(fetchSharePeople()).rejects.toMatchObject({ code: '42501' });
    expect(from).not.toHaveBeenCalled();
  });
});

describe('summarizeReach', () => {
  it('counts members and members per voice part', () => {
    expect(summarizeReach(people)).toEqual({ members: 3, byVoicePart: { alto_1: 2 } });
  });
  it('is empty for nobody', () => {
    expect(summarizeReach([])).toEqual({ members: 0, byVoicePart: {} });
  });
});

describe('isMissingRpc', () => {
  it('recognises both PostgREST and Postgres "no such function" codes', () => {
    expect(isMissingRpc({ code: 'PGRST202' })).toBe(true);
    expect(isMissingRpc({ code: '42883' })).toBe(true);
    expect(isMissingRpc({ code: '42501' })).toBe(false);
    expect(isMissingRpc(null)).toBe(false);
  });
});

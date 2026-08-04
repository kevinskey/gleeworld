import { describe, it, expect } from 'vitest';
import { toolsForRole } from '../toolCatalog.ts';

describe('advisor tools', () => {
  it('gives members the five self tools but not roster flags', () => {
    const names = toolsForRole('member').map((t) => t.name);
    for (const n of ['get_assignments','get_grades','get_grade_trend','get_attendance','get_balance']) {
      expect(names).toContain(n);
    }
    expect(names).not.toContain('get_roster_flags');
  });

  it('gives admins roster flags too', () => {
    expect(toolsForRole('admin').map((t) => t.name)).toContain('get_roster_flags');
  });
});

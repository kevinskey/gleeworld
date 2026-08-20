import { describe, it, expect } from 'vitest';
import {
  permissionAtLeast, describePermission, isPlausibleEmail, PERMISSION_LADDER,
} from './sharesApi';

describe('permissionAtLeast', () => {
  it('treats the ladder as ordered, not as equality', () => {
    // The whole point: an editor can also comment and view. Policies that
    // test equality break the moment a level is added.
    expect(permissionAtLeast('edit', 'view')).toBe(true);
    expect(permissionAtLeast('edit', 'comment')).toBe(true);
    expect(permissionAtLeast('comment', 'edit')).toBe(false);
    expect(permissionAtLeast('view', 'comment')).toBe(false);
  });

  it('puts owner above every granted level', () => {
    for (const level of PERMISSION_LADDER) {
      expect(permissionAtLeast('owner', level)).toBe(true);
    }
  });

  it('denies when there is no permission at all', () => {
    // Someone the document was never shared with — and the loading state,
    // which must not render an editable page before the answer arrives.
    expect(permissionAtLeast(null, 'view')).toBe(false);
    expect(permissionAtLeast(undefined, 'view')).toBe(false);
  });

  it('matches the order the SQL helper uses', () => {
    // gw_doc_can() indexes into array['view','comment','edit','owner'].
    // If these two ever disagree, the UI offers actions RLS will refuse.
    expect([...PERMISSION_LADDER]).toEqual(['view', 'comment', 'edit', 'owner']);
  });
});

describe('describePermission', () => {
  it('names every level', () => {
    expect(describePermission('owner')).toBe('Owner');
    expect(describePermission('edit')).toBe('Can edit');
    expect(describePermission('comment')).toBe('Can comment');
    expect(describePermission('view')).toBe('Can view');
  });
});

describe('isPlausibleEmail', () => {
  it('accepts ordinary addresses, including padded input', () => {
    expect(isPlausibleEmail('kevin@gleeworld.org')).toBe(true);
    expect(isPlausibleEmail('  kevin@gleeworld.org  ')).toBe(true);
  });

  it('rejects the obvious nonsense', () => {
    expect(isPlausibleEmail('')).toBe(false);
    expect(isPlausibleEmail('kevin')).toBe(false);
    expect(isPlausibleEmail('kevin@')).toBe(false);
    expect(isPlausibleEmail('kevin@localhost')).toBe(false);
    expect(isPlausibleEmail('two addresses@example.com')).toBe(false);
  });
});

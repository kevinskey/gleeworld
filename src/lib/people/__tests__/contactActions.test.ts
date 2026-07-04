import { describe, it, expect } from 'vitest';
import { displayName, initials, bestPhone, contactHrefs, sectionLabel } from '../contactActions';

const base = { full_name: null, display_name: null, first_name: null, last_name: null, email: null, phone: null, phone_number: null, voice_part: null };

describe('displayName', () => {
  it('prefers display_name, then full_name, then first+last, then email', () => {
    expect(displayName({ ...base, display_name: 'Ray', full_name: 'Raymond K' })).toBe('Ray');
    expect(displayName({ ...base, full_name: 'Raymond K' })).toBe('Raymond K');
    expect(displayName({ ...base, first_name: 'Ada', last_name: 'Lee' })).toBe('Ada Lee');
    expect(displayName({ ...base, email: 'a@b.org' })).toBe('a@b.org');
    expect(displayName(base)).toBe('Member');
  });
});

describe('initials', () => {
  it('two letters from name, one from single word, uppercased', () => {
    expect(initials({ ...base, full_name: 'Ada Lee' })).toBe('AL');
    expect(initials({ ...base, full_name: 'Cher' })).toBe('C');
  });
});

describe('bestPhone / contactHrefs', () => {
  it('prefers phone_number, falls back to phone, null when blank', () => {
    expect(bestPhone({ ...base, phone_number: ' 555-111-2222 ', phone: '999' })).toBe('555-111-2222');
    expect(bestPhone({ ...base, phone: '999' })).toBe('999');
    expect(bestPhone({ ...base, phone_number: '  ' })).toBeNull();
  });
  it('builds sanitized hrefs and nulls when data missing', () => {
    const h = contactHrefs({ ...base, phone_number: '+1 (555) 111-2222', email: 'a@b.org' });
    expect(h.tel).toBe('tel:+15551112222');
    expect(h.sms).toBe('sms:+15551112222');
    expect(h.mailto).toBe('mailto:a@b.org');
    expect(contactHrefs(base)).toEqual({ tel: null, sms: null, mailto: null });
  });
});

describe('sectionLabel', () => {
  it('humanizes voice_part enum values', () => {
    expect(sectionLabel('soprano_1')).toBe('Soprano 1');
    expect(sectionLabel('bass_2')).toBe('Bass 2');
    expect(sectionLabel(null)).toBeNull();
  });
});

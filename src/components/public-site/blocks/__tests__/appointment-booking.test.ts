// The bug this block was rewritten for: a visitor who taps "Book now" on a
// tenant's public page must never be handed off to a route behind auth. These
// tests pin the two places that decision is actually made.

import { describe, it, expect } from 'vitest';
import { appointmentBookingBlock, externalUrl, parseDurationMinutes } from '../appointment-booking';
import { safeConfig } from '../../types';

describe('appointment-booking · outbound links', () => {
  it('refuses in-app paths, which are the login wall this block existed to hit', () => {
    // These are the values tenants actually had stored in bookingUrl.
    expect(externalUrl('/appointments')).toBeNull();
    expect(externalUrl('/dashboard/appointments')).toBeNull();
    expect(externalUrl('appointments')).toBeNull();
    expect(externalUrl('')).toBeNull();
  });

  it('honors a real external scheduler', () => {
    expect(externalUrl('https://calendly.com/choir/lesson')).toBe('https://calendly.com/choir/lesson');
    expect(externalUrl('  http://example.com/book  ')).toBe('http://example.com/book');
  });
});

describe('appointment-booking · duration parsing', () => {
  // These are the exact strings on the live `kevin` site, plus the shapes a
  // tenant could plausibly type next. "1 hour" is the one that matters: a naive
  // digit-strip reads it as 1, which is below the floor and silently becomes a
  // 30-minute booking for an hour-long session.
  it.each([
    ['30 min', 30],
    ['45 min', 45],
    ['1 hour', 60],
    ['1.5 hours', 90],
    ['90 minutes', 90],
    ['1 hr 30 min', 90],
    ['2 hours', 120],
    ['45', 45],
  ])('parses %j as %i minutes', (raw, expected) => {
    expect(parseDurationMinutes(raw)).toBe(expected);
  });

  it.each(['', 'about an hour', 'TBD', '2 min', '20 hours'])(
    'refuses %j rather than guessing',
    (raw) => {
      expect(parseDurationMinutes(raw)).toBeNull();
    },
  );
});

describe('appointment-booking · service duration back-compat', () => {
  const parse = (raw: unknown) => safeConfig(appointmentBookingBlock, raw);

  it('reads the minutes out of the old free-text duration field', () => {
    const cfg = parse({
      services: [{ name: 'Voice lesson', duration: '60 min', description: '' }],
    });
    expect(cfg.services[0].durationMinutes).toBe(60);
    // The display string is untouched — it is what the tenant wrote.
    expect(cfg.services[0].duration).toBe('60 min');
  });

  it('keeps the live site\'s services bookable at their advertised lengths', () => {
    const cfg = parse({
      bookingUrl: '/book-appointment',
      services: [
        { name: 'Private voice lesson', duration: '30 min', price: '$60' },
        { name: 'Music theory tutoring', duration: '45 min', price: '$70' },
        { name: 'Recording / producer session', duration: '1 hour', price: '$150' },
      ],
    });
    expect(cfg.services.map((s) => s.durationMinutes)).toEqual([30, 45, 60]);
    // Price is authored content and must survive a republish.
    expect(cfg.services.map((s) => s.price)).toEqual(['$60', '$70', '$150']);
    // And the stored in-app path must not become a link.
    expect(externalUrl(cfg.bookingUrl)).toBeNull();
  });

  it('prefers the structured field when both are present', () => {
    const cfg = parse({
      services: [{ name: 'Audition', duration: '60 min', durationMinutes: 45 }],
    });
    expect(cfg.services[0].durationMinutes).toBe(45);
  });

  it('falls back to 30 when the old string has no usable number', () => {
    for (const duration of ['', 'about an hour', 'TBD']) {
      const cfg = parse({ services: [{ name: 'Consult', duration }] });
      expect(cfg.services[0].durationMinutes).toBe(30);
    }
  });

  it('ignores out-of-range junk rather than booking a 1-minute lesson', () => {
    const cfg = parse({ services: [{ name: 'Lesson', duration: '2 min' }] });
    expect(cfg.services[0].durationMinutes).toBe(30);
  });

  it('keeps the eyebrow and footnote that live configs already carry', () => {
    const cfg = parse({ eyebrow: 'One-on-one', ctaFootnote: 'Response within 24 hours' });
    expect(cfg.eyebrow).toBe('One-on-one');
    expect(cfg.ctaFootnote).toBe('Response within 24 hours');
  });
});

describe('appointment-booking · defaults', () => {
  it('gives a block that has never been configured a bookable week', () => {
    const cfg = safeConfig(appointmentBookingBlock, {});
    // Mon–Fri, so a tenant who only adds services still takes bookings.
    expect(cfg.availability.map((w) => w.day)).toEqual([1, 2, 3, 4, 5]);
    expect(cfg.bookingUrl).toBe('');
  });

  it('keeps availability that a tenant has customized', () => {
    const cfg = safeConfig(appointmentBookingBlock, {
      availability: [{ day: 6, start: '10:00', end: '14:00' }],
    });
    expect(cfg.availability).toEqual([{ day: 6, start: '10:00', end: '14:00' }]);
  });
});

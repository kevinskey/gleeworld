import { describe, it, expect } from 'vitest';
import { pickInitialTrip, type Trip } from './ActiveTripContext';

const trip = (id: string, status: string, start = '2026-03-01'): Trip => ({
  id, name: `Trip ${id}`, start_date: start, end_date: start, status, course_id: 'c1',
});

describe('pickInitialTrip', () => {
  it('returns null when there are no trips', () => {
    expect(pickInitialTrip([], null)).toBeNull();
    expect(pickInitialTrip([], 'anything')).toBeNull();
  });

  it('honours a stored choice that is still visible', () => {
    const trips = [trip('a', 'planning'), trip('b', 'confirmed')];
    expect(pickInitialTrip(trips, 'b')?.id).toBe('b');
  });

  it('ignores a stored id that is not in scope', () => {
    // The stored trip may have been deleted, or belong to another course whose
    // rows this scope can't see. Falling through must not select nothing.
    const trips = [trip('a', 'planning')];
    expect(pickInitialTrip(trips, 'deleted-or-other-course')?.id).toBe('a');
  });

  it('prefers an in-flight trip over an archived one', () => {
    // Trips are ordered start_date DESC, so an archived tour can sort first.
    // A fresh visit should still land on the live one.
    const trips = [trip('old', 'archived', '2027-01-01'), trip('live', 'planning', '2026-03-01')];
    expect(pickInitialTrip(trips, null)?.id).toBe('live');
  });

  it('falls back to the first trip when every trip is archived', () => {
    const trips = [trip('x', 'archived'), trip('y', 'archived')];
    expect(pickInitialTrip(trips, null)?.id).toBe('x');
  });

  it('still honours a stored archived trip — an explicit choice wins', () => {
    const trips = [trip('live', 'planning'), trip('old', 'archived')];
    expect(pickInitialTrip(trips, 'old')?.id).toBe('old');
  });
});

import { describe, it, expect } from 'vitest';
import { repertoireSearchQueryKey, repertoireFeaturedQueryKey } from '../api';

describe('repertoire query keys', () => {
  it('search key encodes every param so different filters miss cache', () => {
    const a = repertoireSearchQueryKey({ query: 'mozart', ensemble: 'choral' });
    const b = repertoireSearchQueryKey({ query: 'mozart', ensemble: 'band' });
    expect(a).not.toEqual(b);
  });

  it('search key is stable for identical params', () => {
    const a = repertoireSearchQueryKey({ query: 'mozart', ensemble: 'choral' });
    const b = repertoireSearchQueryKey({ query: 'mozart', ensemble: 'choral' });
    expect(a).toEqual(b);
  });

  it('featured key includes ensemble', () => {
    expect(repertoireFeaturedQueryKey('choral', 24)).not.toEqual(
      repertoireFeaturedQueryKey('band', 24)
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  EMAIL_EXTRACTION_SYSTEM_PROMPT,
  buildEmailExtractionMessages,
  extractSenderDomain,
  htmlToText,
  matchSourceByDomain,
  parseEmailExtraction,
} from '../auctionEmail.ts';

describe('extractSenderDomain', () => {
  it('reads the domain out of a display-name address', () => {
    expect(extractSenderDomain('Heritage Global <auctions@hgpauction.com>')).toBe('hgpauction.com');
  });

  it('reads a bare address', () => {
    expect(extractSenderDomain('news@govdeals.com')).toBe('govdeals.com');
  });

  it('lowercases the domain', () => {
    expect(extractSenderDomain('A <B@HGPAuction.COM>')).toBe('hgpauction.com');
  });

  it('returns null for junk', () => {
    expect(extractSenderDomain('not an address')).toBeNull();
    expect(extractSenderDomain('')).toBeNull();
    expect(extractSenderDomain(null)).toBeNull();
  });
});

describe('matchSourceByDomain', () => {
  const sources = [
    { id: 's1', name: 'Heritage Global Partners', base_url: 'https://www.hgpauction.com' },
    { id: 's2', name: 'GovDeals', base_url: 'https://www.govdeals.com' },
    { id: 's3', name: 'No website', base_url: null },
  ];

  it('matches the sending domain to a house', () => {
    expect(matchSourceByDomain('bids@hgpauction.com', sources)?.id).toBe('s1');
  });

  it('matches a subdomain the house sends marketing from', () => {
    expect(matchSourceByDomain('news@email.govdeals.com', sources)?.id).toBe('s2');
  });

  it('does not match a lookalike domain', () => {
    // hgpauction.com.evil.test must never be treated as hgpauction.com.
    expect(matchSourceByDomain('a@hgpauction.com.evil.test', sources)).toBeNull();
    expect(matchSourceByDomain('a@nothgpauction.com', sources)).toBeNull();
  });

  it('returns null when nothing matches, rather than guessing a house', () => {
    expect(matchSourceByDomain('someone@unknown.test', sources)).toBeNull();
  });

  it('skips sources with no website', () => {
    expect(matchSourceByDomain('x@', sources)).toBeNull();
  });
});

describe('htmlToText', () => {
  it('strips tags and keeps the words', () => {
    expect(htmlToText('<p>Lot 12: <b>MRI</b></p>')).toBe('Lot 12: MRI');
  });

  it('drops script and style content entirely', () => {
    const html = '<style>.a{color:red}</style><script>alert(1)</script><p>Real text</p>';
    expect(htmlToText(html)).toBe('Real text');
  });

  it('decodes the common entities', () => {
    expect(htmlToText('<p>Smith &amp; Sons &lt;tag&gt; &quot;q&quot; &#39;s&#39; &nbsp;end</p>'))
      .toBe(`Smith & Sons <tag> "q" 's' end`);
  });

  it('turns block boundaries into line breaks instead of running words together', () => {
    expect(htmlToText('<div>One</div><div>Two</div>')).toBe('One\nTwo');
    expect(htmlToText('First<br>Second')).toBe('First\nSecond');
  });

  it('collapses runaway whitespace', () => {
    expect(htmlToText('<p>a     b\n\n\n\n\nc</p>')).toBe('a b\n\nc');
  });

  it('handles empty input', () => {
    expect(htmlToText('')).toBe('');
    expect(htmlToText(null)).toBe('');
  });
});

describe('buildEmailExtractionMessages', () => {
  const email = {
    from: 'auctions@hgpauction.com',
    subject: 'Imaging auction closes Thursday',
    text: 'Lot 12 — Siemens Avanto MRI\nLot 13 — GE CT',
    received_at: '2026-08-18T12:00:00Z',
  };

  it('pins the system prompt as the exact prefix', () => {
    const a = buildEmailExtractionMessages(email);
    const b = buildEmailExtractionMessages({ ...email, subject: 'different' });
    expect(a[0].content).toBe(EMAIL_EXTRACTION_SYSTEM_PROMPT);
    expect(a[0].content).toBe(b[0].content);
  });

  it('includes the sender, subject, and body', () => {
    const content = buildEmailExtractionMessages(email)[1].content;
    expect(content).toContain('hgpauction.com');
    expect(content).toContain('closes Thursday');
    expect(content).toContain('Siemens Avanto');
  });

  it('states the date the mail arrived, so relative dates can be resolved', () => {
    expect(buildEmailExtractionMessages(email)[1].content).toContain('2026-08-18');
  });
});

describe('parseEmailExtraction', () => {
  it('accepts a well-formed extraction', () => {
    const raw = JSON.stringify({
      auction: {
        title: 'August imaging sale', opens_at: '2026-09-01T14:00:00Z',
        closes_at: '2026-09-03T18:00:00Z', catalog_released_at: null,
        location_city: 'Atlanta', location_state: 'GA',
        catalog_url: 'https://example.test/c', confidence: 0.9,
      },
      lots: [
        { lot_number: '12', title: 'Siemens Avanto MRI', url: 'https://example.test/12' },
        { lot_number: '13', title: 'GE CT', url: null },
      ],
    });
    const { auction, lots, problems } = parseEmailExtraction(raw);
    expect(problems).toHaveLength(0);
    expect(auction?.title).toBe('August imaging sale');
    expect(auction?.location_state).toBe('GA');
    expect(lots).toHaveLength(2);
  });

  it('reports an unparseable response instead of throwing', () => {
    const { auction, lots, problems } = parseEmailExtraction('sorry, I cannot help with that');
    expect(auction).toBeNull();
    expect(lots).toHaveLength(0);
    expect(problems.length).toBeGreaterThan(0);
  });

  it('returns no auction when the mail was not about one', () => {
    const raw = JSON.stringify({ auction: null, lots: [] });
    const { auction, lots, problems } = parseEmailExtraction(raw);
    expect(auction).toBeNull();
    expect(lots).toHaveLength(0);
    expect(problems).toHaveLength(0);
  });

  it('rejects an auction with no title, which would be unusable on a calendar', () => {
    const raw = JSON.stringify({ auction: { title: '  ', confidence: 0.9 }, lots: [] });
    expect(parseEmailExtraction(raw).auction).toBeNull();
  });

  it('rejects an unparseable date rather than storing garbage', () => {
    const raw = JSON.stringify({
      auction: { title: 'Sale', opens_at: 'next Tuesday-ish', confidence: 0.9 },
      lots: [],
    });
    const { auction, problems } = parseEmailExtraction(raw);
    expect(auction).toBeNull();
    expect(problems.join(' ')).toMatch(/date/i);
  });

  it('normalises a two-letter state and rejects a long one', () => {
    const ok = parseEmailExtraction(JSON.stringify({
      auction: { title: 'S', location_state: 'ga', confidence: 0.8 }, lots: [],
    }));
    expect(ok.auction?.location_state).toBe('GA');

    const bad = parseEmailExtraction(JSON.stringify({
      auction: { title: 'S', location_state: 'Georgia', confidence: 0.8 }, lots: [],
    }));
    expect(bad.auction?.location_state).toBeNull();
  });

  it('drops a lot with no title but keeps the good ones', () => {
    const raw = JSON.stringify({
      auction: null,
      lots: [{ lot_number: '1', title: '' }, { lot_number: '2', title: 'Real lot' }],
    });
    const { lots, problems } = parseEmailExtraction(raw);
    expect(lots).toHaveLength(1);
    expect(lots[0].title).toBe('Real lot');
    expect(problems).toHaveLength(1);
  });

  it('refuses a non-http url so a javascript: link can never be stored', () => {
    const raw = JSON.stringify({
      auction: null,
      lots: [{ lot_number: '1', title: 'Lot', url: 'javascript:alert(1)' }],
    });
    expect(parseEmailExtraction(raw).lots[0].url).toBeNull();
  });

  it('caps how many lots one email can create', () => {
    const many = Array.from({ length: 700 }, (_, i) => ({ lot_number: String(i), title: `Lot ${i}` }));
    const { lots, problems } = parseEmailExtraction(JSON.stringify({ auction: null, lots: many }));
    expect(lots.length).toBeLessThanOrEqual(500);
    expect(problems.join(' ')).toMatch(/cap|too many/i);
  });
});

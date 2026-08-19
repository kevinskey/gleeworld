import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompt';

describe('buildSystemPrompt', () => {
  const ctx = {
    firstName: 'Kevin', role: 'admin' as const, tenantName: 'Harmony Hall Choir',
    activeModules: ['studio', 'planner'], nowIso: '2026-07-12T20:00:00-04:00',
    timezone: 'America/New_York',
  };
  it('includes user, tenant, date, and modules', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('Kevin');
    expect(p).toContain('Harmony Hall Choir');
    expect(p).toContain('2026-07-12');
    expect(p).toContain('studio');
  });
  /**
   * "Open the video" is a playback request, not a navigation one.
   *
   * The nav rule ("open X" → open_page) matched it against the `video` page
   * key and silently navigated to the video library, while the user meant the
   * recording they had just been discussing. Both halves of the distinction
   * have to survive: the nav rule stays, but it must not swallow media.
   */
  it('tells her "open the video" means play it, not open the library', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('open the video');
    expect(p).toContain('play_video');
    expect(p.toLowerCase()).toContain('video library');
  });

  it('still routes ordinary "open X" requests to a page', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('"open X": pick the closest match from this list and call open_page');
  });

  it('never hardcodes a tenant name in the template', () => {
    const p = buildSystemPrompt({ ...ctx, tenantName: 'X' });
    expect(p).not.toMatch(/spelman/i);
  });
  it('tells member-role assistants they cannot message people', () => {
    const p = buildSystemPrompt({ ...ctx, role: 'member' });
    expect(p.toLowerCase()).toContain('cannot send');
  });

  /**
   * TTS reads a bare Roman numeral as a letter — "the i chord" is heard as
   * "the eye chord" (Kevin, 2026-08-11). Chords are named by quality and
   * scale degree in words; typed replies may carry the symbol in parentheses,
   * spoken turns must not carry a symbol at all.
   */
  it('names chords in words, symbol in parens on typed turns', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('the minor one chord (i)');
    expect(p).toContain('the dominant seven (V7)');
    expect(p).toContain('"D minor", never "Dm"');
    expect(p).toContain('pre-dominant');
  });

  it('bans chord symbols outright on spoken turns', () => {
    const p = buildSystemPrompt({ ...ctx, voice: true });
    expect(p).toContain('Never write a Roman numeral or chord symbol at all');
    expect(p).not.toContain('the minor one chord (i)');
    // First live voice test slipped "a iv–V–i or ... to V to i" past the
    // general ban — progressions get their own prescribed wording.
    expect(p).toContain('"four, then five, then one"');
    expect(p).toContain('Every mention of a chord is words');
  });

  it('typed turns put progression chains in the one parenthetical', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('"four, five, one (iv–V–i)"');
    expect(p).toContain('use the words alone');
  });

  it('admins get the course-builder interview section; members do not', () => {
    const base = {
      firstName: 'Kevin', tenantName: 'GleeWorld', activeModules: [],
      nowIso: '2026-07-13T12:00:00Z', timezone: 'America/New_York',
    };
    const admin = buildSystemPrompt({ ...base, role: 'admin' as const });
    const member = buildSystemPrompt({ ...base, role: 'member' as const });
    expect(admin).toContain('create_course_draft');
    expect(admin).toContain('draft course');
    expect(member).not.toContain('create_course_draft');
  });
});

describe('academy guidance', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Test Choir',
    activeModules: [], nowIso: '2026-08-04T12:00:00Z', timezone: 'America/New_York',
  };

  it('tells the assistant to search before answering subject questions', () => {
    expect(buildSystemPrompt(ctx)).toContain('search_academy');
  });

  it('names the covered domains', () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toMatch(/conducting history/i);
    expect(prompt).toMatch(/terminology/i);
    expect(prompt).toMatch(/repertoire/i);
  });

  it('forbids inventing an answer when nothing is found', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/do not (guess|invent)/i);
  });

  it('forbids attributing the material to another source', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/never attribute/i);
  });

  it('gives the guidance to admins too', () => {
    expect(buildSystemPrompt({ ...ctx, role: 'admin' as const })).toContain('search_academy');
  });
});

/**
 * Voice turns are read aloud in full, so length is latency twice over —
 * once while DeepSeek generates (~110 chars/sec observed 2026-08-10) and
 * again while the agent speaks. The contract: short-first, depth on demand.
 */
describe('voice mode (spoken turns)', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-10T19:00:00-04:00', timezone: 'America/New_York',
  };
  it('adds the spoken-length contract only when the turn is voice', () => {
    const spoken = buildSystemPrompt({ ...ctx, voice: true });
    expect(spoken).toContain('SPOKEN ALOUD');
    expect(spoken).toMatch(/at most 4 short sentences/i);
    const typed = buildSystemPrompt(ctx);
    expect(typed).not.toContain('SPOKEN ALOUD');
  });
  it('keeps depth reachable on request rather than capping it away', () => {
    const spoken = buildSystemPrompt({ ...ctx, voice: true });
    expect(spoken).toMatch(/tell me more/i);
    expect(spoken).toMatch(/two short paragraphs/i);
  });
});

describe('academy courses briefing', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T09:00:00-04:00', timezone: 'America/New_York',
  };
  it('tells her she CAN see the catalog and must answer, not deflect to the page', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('list_courses');
    expect(p).toContain('get_course_info');
    expect(p).toContain('get_course_deadlines');
    expect(p).toContain('get_enrollments');
    expect(p).toMatch(/never say you lack a course tool/i);
  });
  it('forbids blaming a missing Academy add-on for empty results', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/NEVER speculate that the Academy add-on/);
  });
  it('routes prerequisites to the description and syllabus', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/PREREQUISITES and materials live in the description/);
  });
  it('sends scores to the Viewer by default', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/opens in the Viewer/);
    expect(buildSystemPrompt(ctx)).toContain('close_viewer');
  });
});

describe('research notes capture', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T11:00:00-04:00', timezone: 'America/New_York',
  };
  it('tells her to compose the note herself from the conversation', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('Saving research to Notes');
    expect(p).toMatch(/compose the note YOURSELF/);
    expect(p).toMatch(/Not a transcript/);
    expect(p).toContain('create_note');
  });
});

describe('hymnal numbers briefing', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T12:00:00-04:00', timezone: 'America/New_York',
  };
  it('names the loaded hymnals and the lookup tool', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('lookup_hymn');
    expect(p).toContain('LMGM II');
    expect(p).toContain('Gather');
    expect(p).toContain('Baptist Hymnal');
  });
  it('bans hymn numbers from memory', () => {
    expect(buildSystemPrompt(ctx)).toMatch(/NEVER state a hymn number from memory/);
  });
});

describe('personal assistant name', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T13:00:00-04:00', timezone: 'America/New_York',
  };
  it('identifies as the user-chosen name when one is set', () => {
    const p = buildSystemPrompt({ ...ctx, assistantName: 'Ruby' });
    expect(p).toContain('You are Ruby');
    expect(p).not.toMatch(/^You are the GleeWorld Assistant/);
  });
  it('defaults to the GleeWorld Assistant identity', () => {
    expect(buildSystemPrompt(ctx)).toContain('You are the GleeWorld Assistant');
  });
  it('routes renames through set_assistant_name in both modes', () => {
    expect(buildSystemPrompt(ctx)).toContain('set_assistant_name');
    expect(buildSystemPrompt({ ...ctx, assistantName: 'Ruby' })).toContain('set_assistant_name');
  });
});

describe('streaming services briefing', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T14:00:00-04:00', timezone: 'America/New_York',
  };
  it('routes Apple Music requests through search-then-play', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('search_apple_music');
    expect(p).toContain('play_apple_music');
  });
  it('keeps YouTube the default and is honest about Spotify', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toMatch(/YouTube .* stays the DEFAULT/);
    expect(p).toMatch(/Spotify and YouTube Music are NOT connected/);
  });
});

describe('apple music playlists briefing', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T15:00:00-04:00', timezone: 'America/New_York',
  };
  it('routes library playlists and one-shot creation', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('play_my_playlist');
    expect(p).toContain('create_apple_playlist');
    expect(p).toMatch(/ONCE with the name and all song ids/);
  });
});

describe('scheduled playlists briefing', () => {
  const ctx = {
    firstName: 'Kevin', role: 'admin' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T17:00:00-04:00', timezone: 'America/New_York',
  };
  it('routes event music through schedule_event_playlist and sets the one-tap expectation', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('schedule_event_playlist');
    expect(p).toMatch(/one tap/);
  });
});

describe('remembering choices', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T19:00:00-04:00', timezone: 'America/New_York',
  };
  it('saves lasting choices unprompted and consults them before deciding', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toMatch(/SAVE it with remember_preference right then/);
    expect(p).toMatch(/BEFORE choosing on their behalf/);
    expect(p).toMatch(/One-off requests are not preferences/);
  });
});

describe('score analysis honesty', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-11T19:00:00-04:00', timezone: 'America/New_York',
  };
  it('teaches score-analysis honesty rules', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('get_score_analysis');
    expect(p).toContain('never from memory');
    expect(p).toContain('double-check anything critical against the printed score');
  });
});

describe('preferred-name rule', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: ['studio', 'planner'], nowIso: '2026-07-12T20:00:00-04:00',
    timezone: 'America/New_York',
  };
  it('teaches the set_preferred_name tool', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).toContain('set_preferred_name');
    expect(p).toContain('call me Doc');
  });
});

describe('platform feature glossary (2026-08-13)', () => {
  const prompt = buildSystemPrompt({
    firstName: 'Kevin', role: 'member' as const, tenantName: 'Harmony Hall Choir',
    activeModules: [], nowIso: '2026-08-13T10:00:00-04:00', timezone: 'America/New_York',
  });
  it('explains what GleeWorld is', () => {
    expect(prompt).toContain('What GleeWorld is');
  });
  it.each([
    ['recording studio', 'Studio'],
    ['the Library', 'Music Library'],
    ['score reader', 'Viewer'],
    ['practice tracks', 'Part Tracks'],
    ['sight singing', 'Sight Reading Studio'],
    ['permission slips', 'Travel Manager'],
  ])('alias "%s" appears with canonical %s', (alias, canonical) => {
    expect(prompt).toContain(alias);
    expect(prompt).toContain(canonical);
  });
});

describe('interrupted-speech + panel context ("Next" support)', () => {
  const ctx = {
    firstName: 'Kevin', role: 'member' as const, tenantName: 'T',
    activeModules: [], nowIso: '2026-08-17T12:00:00-04:00', timezone: 'America/New_York',
  };

  it('renders where the user stopped hearing when a spoken reply was interrupted', () => {
    const p = buildSystemPrompt({ ...ctx, heardUpTo: 'and the Atlanta Symphony announced its new season' });
    expect(p).toContain('Atlanta Symphony announced');
    expect(p.toLowerCase()).toContain('interrupted');
  });

  it('renders the article currently open in the reader panel', () => {
    const p = buildSystemPrompt({
      ...ctx,
      panel: { kind: 'article', url: 'https://example.com/story', title: 'Big Story', readAloud: true },
    });
    expect(p).toContain('Big Story');
    expect(p).toContain('https://example.com/story');
    expect(p.toLowerCase()).toContain('read aloud');
  });

  it('omits both lines when the context is absent', () => {
    const p = buildSystemPrompt(ctx);
    expect(p).not.toContain('Your previous spoken reply was interrupted');
    expect(p).not.toContain('The in-app reader panel is currently showing');
  });

  it('teaches "next / next article / skip" in both news contexts', () => {
    const p = buildSystemPrompt(ctx);
    // Article context: advance to the item after the current panel article.
    expect(p).toMatch(/next article|"next"/i);
    expect(p).toContain('read_news_feeds');
    // Rundown context: continue from the item after the last heard headline.
    expect(p.toLowerCase()).toContain('continue the rundown');
    // The blanket interruption rule must carve out next/skip.
    expect(p).toMatch(/except.*(next|skip)/i);
  });
});

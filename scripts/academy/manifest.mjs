const BASE = 'https://kevinphillipjohnson.com/academy';
const url = (page) => `${BASE}/${page}.html`;

// merch.html is deliberately excluded: a product-and-price list, not reference
// knowledge, and stale prices across ~50 tenants is a liability.
//
// Also excluded: ENRICHMENTS on conductors.html (a map of Wikipedia URLs keyed
// by conductor id, no prose), and the /api/jwpepper-catalog and
// /api/carlfischer-catalog endpoints (live vendor search proxies, not content).
export const SOURCES = [
  { page: 'conductors-guide', pageTitle: 'Conductors Reference Guide', url: url('conductors-guide'), mode: 'data',
    globals: ['CHAPTERS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['period', 'summary', 'history', 'developments', 'techniques', 'notableConductors', 'subcategories'] } },

  { page: 'conducting-history', pageTitle: 'History of Conducting', url: url('conducting-history'), mode: 'data',
    globals: ['CONDUCTING_ERAS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['period', 'summary', 'history', 'developments', 'techniques', 'notableConductors'] } },

  { page: 'conductors', pageTitle: 'Conductors Directory', url: url('conductors'), mode: 'data',
    globals: ['DATA'],
    cfg: { titleField: 'name', idField: 'id', fields: ['role', 'affiliation', 'location', 'bio', 'publishers', 'tags'] } },

  { page: 'spirituals', pageTitle: 'The Negro Spiritual', url: url('spirituals'), mode: 'data',
    globals: ['SPIRITUAL_ERAS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['period', 'summary', 'history', 'developments', 'techniques', 'notableConductors'] } },

  { page: 'history', pageTitle: 'History of Choral Music', url: url('history'), mode: 'data',
    globals: ['CHORAL_ERAS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['period', 'summary', 'history', 'developments', 'techniques', 'notableConductors'] } },

  { page: 'patterns', pageTitle: 'Conducting Patterns', url: url('patterns'), mode: 'data',
    globals: ['PATTERNS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['description', 'summary', 'beats', 'meter', 'technique', 'notes'] } },

  { page: 'terms', pageTitle: 'Choral Terminology', url: url('terms'), mode: 'data',
    globals: ['TERM_CATEGORIES'],
    cfg: { titleField: 'name', idField: 'id', fields: ['description', 'terms'] } },

  { page: 'workbook', pageTitle: 'Conducting Workbook', url: url('workbook'), mode: 'data',
    globals: ['COURSE_OBJECTIVES', 'WEEKLY_SCHEDULE', 'GRADING_BREAKDOWN'],
    cfg: { titleField: 'name', fields: ['description', 'summary', 'objectives', 'topics', 'weight', 'notes'] } },

  { page: 'works', pageTitle: 'Major Choral Works', url: url('works'), mode: 'data',
    globals: ['CHORAL_WORKS'],
    cfg: { titleField: 'title', fields: ['composer', 'year', 'era', 'voicing', 'duration', 'movements', 'description', 'notes'] } },

  { page: 'minor-works', pageTitle: 'Shorter Choral Works', url: url('minor-works'), mode: 'data',
    globals: ['MINOR_CHORAL_WORKS'],
    cfg: { titleField: 'title', fields: ['composer', 'year', 'era', 'voicing', 'duration', 'description', 'notes'] } },

  { page: 'mini-major-works', pageTitle: 'Mini-Major Choral Works', url: url('mini-major-works'), mode: 'data',
    globals: ['MINI_MAJOR_WORKS'],
    cfg: { titleField: 'title', fields: ['composer', 'year', 'era', 'voicing', 'duration', 'movements', 'description', 'notes'] } },

  { page: 'performance-wear', pageTitle: 'Concert Attire', url: url('performance-wear'), mode: 'data',
    globals: ['CHAPTERS'],
    cfg: { titleField: 'name', idField: 'id', fields: ['summary', 'history', 'developments', 'techniques', 'subcategories'] } },

  { page: 'education', pageTitle: 'Choral Education', url: url('education'), mode: 'dom',
    blockSelector: '.info-card, .glos-item', titleSelector: '.info-card-title, .glos-term' },

  { page: 'church', pageTitle: 'Church Music', url: url('church'), mode: 'dom',
    blockSelector: '.card', titleSelector: '.card-title' },

  { page: 'associations', pageTitle: 'Choral Associations', url: url('associations'), mode: 'dom',
    blockSelector: '.assoc-card', titleSelector: '.assoc-name' },

  { page: 'conventions', pageTitle: 'Choral Conventions', url: url('conventions'), mode: 'dom',
    blockSelector: '.conv-card', titleSelector: '.conv-name' },

  { page: 'repertoire', pageTitle: 'Repertoire Database', url: url('repertoire'), mode: 'api',
    apiUrl: 'https://kevinphillipjohnson.com/api/repertoire', collection: 'pieces',
    cfg: { titleField: 'title', idField: 'id', fields: ['composer', 'arranger', 'publisher', 'year', 'voicing', 'key_signature', 'tempo', 'meter', 'difficulty', 'notes'] } },
];

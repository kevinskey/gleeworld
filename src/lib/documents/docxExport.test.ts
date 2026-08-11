import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Document, Packer } from 'docx';
import JSZip from 'jszip';
import {
  buildDocxModel,
  buildFootnoteModels,
  buildWorksCitedModels,
  exportDocx,
  exportFilename,
  makeFootnoteIndexer,
  tiptapToDocxParagraphs,
  tiptapToRuns,
  type ConverterCtx,
  type ExportInput,
} from './docxExport';
import type { CitationStyle, DocFootnote, DocSource } from './types';

function testCtx(overrides: Partial<ConverterCtx> = {}): ConverterCtx {
  return {
    style: 'mla9' as CitationStyle,
    sources: [],
    footnotes: [],
    footnoteIndex: () => -1,
    ...overrides,
  };
}

const southern: DocSource = {
  id: 's1', type: 'book',
  authors: [{ family: 'Southern', given: 'E' }],
  title: 'The Music of Black Americans', year: '1997',
};

describe('exportFilename', () => {
  it('slugifies filenames', () =>
    expect(exportFilename('The Spirituals: of Eileen Southern!', 'docx'))
      .toBe('The-Spirituals-of-Eileen-Southern.docx'));

  it('collapses whitespace and repeated punctuation', () =>
    expect(exportFilename('  Hello,   World -- Test!!  ', 'pdf'))
      .toBe('Hello-World-Test.pdf'));

  it('handles an empty title', () =>
    expect(exportFilename('', 'docx')).toBe('untitled.docx'));
});

describe('tiptapToRuns — text and marks', () => {
  it('converts paragraphs with bold/italic runs', () => {
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'paragraph', content: [
        { type: 'text', text: 'plain ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
      ]},
    ]}, testCtx());

    expect(models).toHaveLength(1);
    const model = models[0];
    if (model.kind !== 'text') throw new Error('expected text para');
    expect(model.style).toBe('body');
    expect(model.runs).toEqual([
      { text: 'plain ' },
      { text: 'bold', bold: true },
    ]);
  });

  it('captures underline/highlight/subscript/superscript/link marks', () => {
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'paragraph', content: [
        { type: 'text', text: 'u', marks: [{ type: 'underline' }] },
        { type: 'text', text: 'h', marks: [{ type: 'highlight' }] },
        { type: 'text', text: 'sub', marks: [{ type: 'subscript' }] },
        { type: 'text', text: 'sup', marks: [{ type: 'superscript' }] },
        { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'https://x.test' } }] },
      ]},
    ]}, testCtx());
    const model = models[0];
    if (model.kind !== 'text') throw new Error('expected text para');
    expect(model.runs).toEqual([
      { text: 'u', underline: true },
      { text: 'h', highlight: true },
      { text: 'sub', subscript: true },
      { text: 'sup', superscript: true },
      { text: 'link', link: 'https://x.test' },
    ]);
  });
});

describe('tiptapToRuns — citation chips', () => {
  it('renders citation chips as formatted in-text citations', () => {
    const ctx = testCtx({ sources: [southern], style: 'mla9' });
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'citationChip', attrs: { sourceId: 's1', locator: '12' } }]},
    ]}, ctx);
    const model = models[0];
    if (model.kind !== 'text') throw new Error('expected text para');
    expect(model.runs).toEqual([{ text: '(Southern 12)' }]);
  });

  it('falls back gracefully for an unknown sourceId, never throwing', () => {
    const ctx = testCtx({ sources: [], style: 'mla9' });
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'citationChip', attrs: { sourceId: 'missing', locator: null } }]},
    ]}, ctx);
    const model = models[0];
    if (model.kind !== 'text') throw new Error('expected text para');
    expect(model.runs).toEqual([{ text: '[citation]' }]);
  });
});

describe('tiptapToRuns — footnote refs', () => {
  it('renders a footnoteRef as a footnote-reference run keyed by ctx.footnoteIndex', () => {
    const ctx = testCtx({ footnoteIndex: (id) => (id === 'n1' ? 1 : -1) });
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'paragraph', content: [
        { type: 'text', text: 'body' },
        { type: 'footnoteRef', attrs: { noteId: 'n1' } },
      ]},
    ]}, ctx);
    const model = models[0];
    if (model.kind !== 'text') throw new Error('expected text para');
    expect(model.runs).toEqual([
      { text: 'body' },
      { text: '', footnoteRefId: 1 },
    ]);
  });

  it('renders an unresolved footnoteRef as a literal [?] run, never throwing', () => {
    const ctx = testCtx({ footnoteIndex: () => -1 });
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'footnoteRef', attrs: { noteId: 'orphan' } }]},
    ]}, ctx);
    const model = models[0];
    if (model.kind !== 'text') throw new Error('expected text para');
    expect(model.runs).toEqual([{ text: '[?]' }]);
  });
});

describe('tiptapToRuns — headings, lists, blockquote, rule, image, unknown nodes', () => {
  it('maps heading levels 1-3 to distinct styles', () => {
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
    ]}, testCtx());
    expect(models.map(m => (m.kind === 'text' ? m.style : m.kind))).toEqual([
      'heading1', 'heading2', 'heading3',
    ]);
  });

  it('flattens a bulletList/listItem/paragraph tree into bullet-styled paragraphs', () => {
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'bulletList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }] },
      ]},
    ]}, testCtx());
    expect(models).toHaveLength(2);
    expect(models.every(m => m.kind === 'text' && m.style === 'bullet')).toBe(true);
    expect(models.map(m => (m.kind === 'text' ? m.runs[0].text : ''))).toEqual(['one', 'two']);
  });

  it('flattens an orderedList to ordered-styled paragraphs', () => {
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'orderedList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] },
      ]},
    ]}, testCtx());
    expect(models[0]).toMatchObject({ kind: 'text', style: 'ordered' });
  });

  it('maps blockquote content to blockquote-styled paragraphs', () => {
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quoted' }] }] },
    ]}, testCtx());
    expect(models[0]).toMatchObject({ kind: 'text', style: 'blockquote' });
  });

  it('maps horizontalRule to a rule model', () => {
    const models = tiptapToRuns({ type: 'doc', content: [{ type: 'horizontalRule' }] }, testCtx());
    expect(models).toEqual([{ kind: 'rule' }]);
  });

  it('maps image attrs to an image model', () => {
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'image', attrs: { src: 'https://cdn.test/a.png', path: 'docs/a.png' } },
    ]}, testCtx());
    expect(models).toEqual([{ kind: 'image', src: 'https://cdn.test/a.png' }]);
  });

  it('skips an unknown node type without throwing', () => {
    expect(() => tiptapToRuns({ type: 'doc', content: [
      { type: 'someFutureNode', content: [{ type: 'text', text: 'x' }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'kept' }] },
    ]}, testCtx())).not.toThrow();
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'someFutureNode' },
      { type: 'paragraph', content: [{ type: 'text', text: 'kept' }] },
    ]}, testCtx());
    expect(models).toHaveLength(1);
  });

  it('maps a table into row/cell paragraph models', () => {
    const models = tiptapToRuns({ type: 'doc', content: [
      { type: 'table', content: [
        { type: 'tableRow', content: [
          { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Name' }] }] },
        ]},
        { type: 'tableRow', content: [
          { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Southern' }] }] },
        ]},
      ]},
    ]}, testCtx());
    expect(models).toHaveLength(1);
    const table = models[0];
    if (table.kind !== 'table') throw new Error('expected table');
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].cells[0].header).toBe(true);
    expect(table.rows[1].cells[0].header).toBe(false);
    const cellPara = table.rows[1].cells[0].paras[0];
    expect(cellPara.kind === 'text' && cellPara.runs[0].text).toBe('Southern');
  });
});

describe('makeFootnoteIndexer + buildFootnoteModels', () => {
  const doc = { type: 'doc', content: [
    { type: 'paragraph', content: [
      { type: 'text', text: 'a' }, { type: 'footnoteRef', attrs: { noteId: 'n2' } },
      { type: 'text', text: 'b' }, { type: 'footnoteRef', attrs: { noteId: 'n1' } },
    ]},
  ]};
  const notes: DocFootnote[] = [
    { id: 'n1', text: 'First note text' },
    { id: 'n2', text: 'Second note text' },
  ];

  it('numbers footnotes by document position, not by id', () => {
    const indexer = makeFootnoteIndexer(doc);
    expect(indexer('n2')).toBe(1);
    expect(indexer('n1')).toBe(2);
    expect(indexer('missing')).toBe(-1);
  });

  it('builds footnote models keyed 1..n in document order with the matching text', () => {
    const models = buildFootnoteModels(doc, notes);
    expect(models).toEqual([
      { n: 1, runs: [{ text: 'Second note text' }] },
      { n: 2, runs: [{ text: 'First note text' }] },
    ]);
  });

  it('renders an empty run for a dangling noteId with no matching DocFootnote', () => {
    const models = buildFootnoteModels(doc, []);
    expect(models).toEqual([
      { n: 1, runs: [{ text: '' }] },
      { n: 2, runs: [{ text: '' }] },
    ]);
  });

  it('returns an empty array when there are no footnote refs', () => {
    expect(buildFootnoteModels({ type: 'doc', content: [] }, notes)).toEqual([]);
  });
});

describe('buildWorksCitedModels', () => {
  it('is empty when there are no sources', () => {
    expect(buildWorksCitedModels([], 'mla9')).toEqual({ heading: 'Works Cited', entries: [] });
  });

  it('uses "Works Cited" heading for MLA and "References" for APA', () => {
    expect(buildWorksCitedModels([southern], 'mla9').heading).toBe('Works Cited');
    expect(buildWorksCitedModels([southern], 'apa7').heading).toBe('References');
  });

  it('carries italic flags through from RefSegment to RunModel', () => {
    const { entries } = buildWorksCitedModels([southern], 'mla9');
    expect(entries).toHaveLength(1);
    const italicRun = entries[0].find(r => r.italic);
    expect(italicRun?.text).toBe('The Music of Black Americans');
  });
});

describe('buildDocxModel', () => {
  const base = {
    title: 'Spirituals', style: 'mla9' as CitationStyle,
    sources: [] as DocSource[], footnotes: [] as DocFootnote[],
    meta: { studentName: 'A Student' },
  };

  it('returns a real docx Document instance', async () => {
    const { doc } = await buildDocxModel({ ...base, content: { type: 'doc', content: [] } });
    expect(doc).toBeInstanceOf(Document);
  });

  it('produces a Works Cited section only when sources exist', async () => {
    const empty = await buildDocxModel({ ...base, content: { type: 'doc', content: [] } });
    expect(empty.worksCited).toBeNull();

    const withSources = await buildDocxModel({
      ...base,
      sources: [southern],
      content: { type: 'doc', content: [
        { type: 'paragraph', content: [{ type: 'citationChip', attrs: { sourceId: 's1', locator: '12' } }] },
      ]},
    });
    expect(withSources.worksCited?.heading).toBe('Works Cited');
    expect(withSources.worksCited?.entries).toHaveLength(1);
  });

  it('produces footnote models keyed in document order when refs exist', async () => {
    const withNotes = await buildDocxModel({
      ...base,
      footnotes: [{ id: 'n1', text: 'Note text' }],
      content: { type: 'doc', content: [
        { type: 'paragraph', content: [
          { type: 'text', text: 'body' },
          { type: 'footnoteRef', attrs: { noteId: 'n1' } },
        ]},
      ]},
    });
    expect(withNotes.footnotes).toEqual([{ n: 1, runs: [{ text: 'Note text' }] }]);
  });
});

describe('tiptapToDocxParagraphs (thin docx mapping)', () => {
  it('compiles a paragraph model down to a real docx Paragraph', async () => {
    const paras = await tiptapToDocxParagraphs({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
    ]}, testCtx());
    expect(paras).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Real-OOXML formatting checks (fix for review finding 5: "zero tests cover
// the formatting layer"). `Packer.toString` returns the raw *zipped* archive
// bytes (JSZip's `generateAsync({type:'string'})` output), not readable XML
// — verified empirically; asserting substrings against it directly would
// silently pass/fail on binary noise. So these unzip with `jszip` (already a
// transitive dependency of `docx`, resolvable without adding anything to
// package.json) to read the real `word/document.xml` / `styles.xml` /
// `header1.xml` / `numbering.xml` parts docx actually produces — the same
// thing the task review itself did by hand to find these defects.
// ---------------------------------------------------------------------------

async function packedXmlParts(input: ExportInput) {
  const { doc } = await buildDocxModel(input);
  const buf = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buf);
  const read = async (path: string) => {
    const file = zip.file(path);
    return file ? file.async('string') : '';
  };
  return {
    document: await read('word/document.xml'),
    styles: await read('word/styles.xml'),
    header: await read('word/header1.xml'),
    numbering: await read('word/numbering.xml'),
  };
}

/** Slices out the single `<w:p>...</w:p>` block containing `needle`, so
 * assertions about one paragraph's properties (e.g. "this paragraph has no
 * first-line indent") can't accidentally match a sibling paragraph's XML. */
function paragraphContaining(xml: string, needle: string): string {
  const needleIdx = xml.indexOf(needle);
  if (needleIdx < 0) throw new Error(`paragraphContaining: "${needle}" not found in XML`);
  const openShort = xml.lastIndexOf('<w:p>', needleIdx);
  const openLong = xml.lastIndexOf('<w:p ', needleIdx);
  const start = Math.max(openShort, openLong);
  const end = xml.indexOf('</w:p>', needleIdx) + '</w:p>'.length;
  return xml.slice(start, end);
}

describe('generated OOXML — paper formatting (real docx output, unzipped)', () => {
  const mlaInput: ExportInput = {
    title: 'Spirituals',
    style: 'mla9',
    sources: [southern],
    footnotes: [{ id: 'n1', text: 'Note text' }],
    meta: { studentName: 'Jane Doe', instructor: 'Dr. Smith', course: 'MUS 101', date: '11 August 2026' },
    content: { type: 'doc', content: [
      { type: 'heading', attrs: { level: 1 }, content: [
        { type: 'text', text: 'Intro ' },
        { type: 'footnoteRef', attrs: { noteId: 'n1' } },
      ]},
      { type: 'paragraph', content: [
        { type: 'text', text: 'body ' },
        { type: 'citationChip', attrs: { sourceId: 's1', locator: '12' } },
      ]},
      { type: 'orderedList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }] },
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }] },
      ]},
      { type: 'orderedList', content: [
        { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'three' }] }] },
      ]},
    ]},
  };

  it('uses US Letter page size, not the docx default of A4 (finding 1)', async () => {
    const { document } = await packedXmlParts(mlaInput);
    expect(document).toContain('<w:pgSz w:w="12240"');
  });

  it('sets docDefaults so untouched/typed-in text inherits the paper font instead of Calibri 11 (finding 2)', async () => {
    const { styles } = await packedXmlParts(mlaInput);
    const docDefaults = /<w:docDefaults>[\s\S]*?<\/w:docDefaults>/.exec(styles)?.[0] ?? '';
    expect(docDefaults).toContain('Times New Roman');
    expect(docDefaults).toContain('w:sz w:val="24"');
  });

  it('double-spaces the paper (line spacing 480)', async () => {
    const { styles } = await packedXmlParts(mlaInput);
    expect(styles).toContain('w:line="480"');
  });

  it('MLA running header carries the last name and a PAGE field', async () => {
    const { header } = await packedXmlParts(mlaInput);
    expect(header).toContain('Doe');
    expect(header).toContain('PAGE');
  });

  it('Works Cited entries use a hanging indent', async () => {
    const { document } = await packedXmlParts(mlaInput);
    expect(document).toContain('<w:ind w:left="720" w:hanging="720"');
  });

  it('Works Cited starts on a new page', async () => {
    const { document } = await packedXmlParts(mlaInput);
    expect(document).toContain('<w:pageBreakBefore/>');
  });

  it('a footnoteRef inside a heading survives as a real footnote reference, not silently dropped (finding 3)', async () => {
    const { document } = await packedXmlParts(mlaInput);
    expect(document).toContain('<w:footnoteReference');
  });

  it('two ordered lists get two distinct numbering instances sharing one abstract definition, so the second restarts at 1 (finding 4)', async () => {
    const { document, numbering } = await packedXmlParts(mlaInput);
    const numIdsUsed = [...document.matchAll(/<w:numId w:val="(\d+)"\/>/g)].map(m => m[1]);
    const uniqueNumIds = [...new Set(numIdsUsed)];
    expect(uniqueNumIds).toHaveLength(2); // one instance per orderedList node

    const abstractIdFor = (numId: string) =>
      new RegExp(`<w:num w:numId="${numId}"><w:abstractNumId w:val="(\\d+)"`).exec(numbering)?.[1];
    const abstractIds = uniqueNumIds.map(abstractIdFor);
    expect(abstractIds.every(id => id !== undefined)).toBe(true);
    // same list style (one abstract definition)...
    expect(new Set(abstractIds).size).toBe(1);
    // ...but concretely distinct instances, i.e. actually two separate lists.
    expect(uniqueNumIds[0]).not.toBe(uniqueNumIds[1]);
  });

  it('table-cell body paragraphs do not get the body 720 first-line indent (minor finding 7)', async () => {
    const tableInput: ExportInput = {
      ...mlaInput,
      content: { type: 'doc', content: [
        { type: 'table', content: [
          { type: 'tableRow', content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'cell text' }] }] },
          ]},
        ]},
      ]},
    };
    const { document } = await packedXmlParts(tableInput);
    expect(paragraphContaining(document, 'cell text')).not.toContain('w:firstLine');
  });

  it('carries paragraph/heading text alignment into <w:jc>, matching the print view', async () => {
    const alignedInput: ExportInput = {
      ...mlaInput,
      content: { type: 'doc', content: [
        { type: 'paragraph', attrs: { textAlign: 'center' }, content: [{ type: 'text', text: 'centered para' }] },
        { type: 'heading', attrs: { level: 2, textAlign: 'right' }, content: [{ type: 'text', text: 'right heading' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'plain para' }] },
      ]},
    };
    const { document } = await packedXmlParts(alignedInput);
    expect(paragraphContaining(document, 'centered para')).toContain('<w:jc w:val="center"/>');
    expect(paragraphContaining(document, 'right heading')).toContain('<w:jc w:val="right"/>');
    // A paragraph with no textAlign attr must not gain an alignment.
    expect(paragraphContaining(document, 'plain para')).not.toContain('<w:jc');
  });

  const apaInput: ExportInput = {
    title: 'APA Paper',
    style: 'apa7',
    sources: [southern],
    footnotes: [],
    meta: { studentName: 'Jane Doe', instructor: 'Dr. Smith', course: 'MUS 101', date: '2026' },
    content: { type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'first body paragraph' }] },
    ]},
  };

  it('APA emits "References" and a page-number-only header (no student name)', async () => {
    const { document, header } = await packedXmlParts(apaInput);
    expect(document).toContain('References');
    expect(header).toContain('PAGE');
    expect(header).not.toContain('Doe');
  });

  it('APA opens the body with pageBreakBefore on the first body paragraph, not a stray empty filler paragraph (minor finding 8)', async () => {
    const { document } = await packedXmlParts(apaInput);
    expect(paragraphContaining(document, 'first body paragraph')).toContain('<w:pageBreakBefore/>');
  });
});

describe('exportDocx', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves to a Blob and never aborts when an image fetch fails', async () => {
    const blob = await exportDocx({
      title: 'With Image', style: 'mla9', sources: [], footnotes: [],
      meta: { studentName: 'A Student' },
      content: { type: 'doc', content: [
        { type: 'image', attrs: { src: 'https://cdn.test/broken.png' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'still here' }] },
      ]},
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(global.fetch).toHaveBeenCalled();
  });
});

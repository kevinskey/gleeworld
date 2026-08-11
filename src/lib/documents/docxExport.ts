// .docx export for the Documents word processor, with MLA9/APA7 paper
// formatting (running header, heading block/title page, Works Cited /
// References, real footnotes).
//
// Design: a pure, fully-testable intermediate representation
// (`tiptapToRuns` → `ParaModel[]`, no `docx` imports involved in producing
// it) plus a thin mapping layer (`paraModelsToDocx`) that turns that IR into
// real `docx` classes. Keeping the IR pure means every content-conversion
// rule (marks, citation chips, footnote refs, lists, tables...) is testable
// via plain object equality, without ever unzipping a generated .docx.
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  FootnoteReferenceRun,
  Header,
  HighlightColor,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from 'docx';
import { orderedFootnoteIds } from '@/components/documents/extensions/FootnoteRef';
import { buildWorksCited, formatInText, type RefSegment } from './citationFormat';
import type { CitationStyle, DocFootnote, DocSource, PaperMeta } from './types';

export interface ExportInput {
  content: unknown;
  title: string;
  style: CitationStyle;
  sources: DocSource[];
  footnotes: DocFootnote[];
  meta: PaperMeta;
}

/** Everything a converter needs to turn TipTap JSON nodes into runs, without
 * knowing anything about `docx`. `footnoteIndex` returns the 1-based docx
 * footnote number for a `noteId` (matching document order, first occurrence
 * wins for a repeated id — the same convention the editor's own
 * `FootnoteRef.getIndex` uses), or a value <= 0 when unresolved. */
export interface ConverterCtx {
  style: CitationStyle;
  sources: DocSource[];
  footnotes: DocFootnote[];
  footnoteIndex: (noteId: string) => number;
}

// ---------------------------------------------------------------------------
// Intermediate representation
// ---------------------------------------------------------------------------

export interface RunModel {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  highlight?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  link?: string;
  /** Set instead of a literal `text` run when this run is a real footnote
   * marker; the 1-based docx footnote number to reference. */
  footnoteRefId?: number;
}

export type TextParaStyle =
  | 'body' | 'heading1' | 'heading2' | 'heading3'
  | 'bullet' | 'ordered' | 'blockquote';

export interface TextParaModel { kind: 'text'; style: TextParaStyle; runs: RunModel[] }
export interface ImageParaModel { kind: 'image'; src: string }
export interface RuleParaModel { kind: 'rule' }
export interface TableCellModel { paras: ParaModel[]; header: boolean }
export interface TableRowModel { cells: TableCellModel[] }
export interface TableParaModel { kind: 'table'; rows: TableRowModel[] }

export type ParaModel = TextParaModel | ImageParaModel | RuleParaModel | TableParaModel;

export interface FootnoteModel { n: number; runs: RunModel[] }
export interface WorksCitedModel { heading: string; entries: RunModel[][] }

// ---------------------------------------------------------------------------
// TipTap JSON walking (pure — no docx imports)
// ---------------------------------------------------------------------------

interface JMark { type?: string; attrs?: Record<string, unknown> }
interface JNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JNode[];
  text?: string;
  marks?: JMark[];
}

function isNode(value: unknown): value is JNode {
  return !!value && typeof value === 'object';
}

function textRunsFromInline(nodes: JNode[] | undefined, ctx: ConverterCtx): RunModel[] {
  const runs: RunModel[] = [];
  for (const node of nodes ?? []) {
    if (!isNode(node)) continue;

    if (node.type === 'text' && typeof node.text === 'string') {
      const run: RunModel = { text: node.text };
      for (const mark of node.marks ?? []) {
        switch (mark?.type) {
          case 'bold': run.bold = true; break;
          case 'italic': run.italic = true; break;
          case 'underline': run.underline = true; break;
          case 'highlight': run.highlight = true; break;
          case 'subscript': run.subscript = true; break;
          case 'superscript': run.superscript = true; break;
          case 'link': {
            const href = mark.attrs?.href;
            if (typeof href === 'string') run.link = href;
            break;
          }
          default: break; // unknown marks: ignore, never throw
        }
      }
      runs.push(run);
      continue;
    }

    if (node.type === 'citationChip') {
      const sourceId = node.attrs?.sourceId;
      const locatorRaw = node.attrs?.locator;
      const locator = typeof locatorRaw === 'string' ? locatorRaw : undefined;
      const source = typeof sourceId === 'string'
        ? ctx.sources.find(s => s.id === sourceId)
        : undefined;
      runs.push({ text: source ? formatInText(source, ctx.style, locator) : '[citation]' });
      continue;
    }

    if (node.type === 'footnoteRef') {
      const noteId = node.attrs?.noteId;
      const n = typeof noteId === 'string' ? ctx.footnoteIndex(noteId) : -1;
      runs.push(n > 0 ? { text: '', footnoteRefId: n } : { text: '[?]' });
      continue;
    }

    // Any other inline node (unknown extensions, etc.): skip gracefully.
  }
  return runs;
}

/** Converts the block content of a listItem or blockquote — normally one or
 * more `paragraph` nodes, occasionally a nested list — into flat text
 * paragraph models carrying `style`. */
function paragraphsFromBlockContent(
  nodes: JNode[] | undefined,
  style: TextParaStyle,
  ctx: ConverterCtx,
): TextParaModel[] {
  const out: TextParaModel[] = [];
  for (const node of nodes ?? []) {
    if (!isNode(node)) continue;
    if (node.type === 'paragraph') {
      out.push({ kind: 'text', style, runs: textRunsFromInline(node.content, ctx) });
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      out.push(...flattenList(node, ctx));
    }
    // other nested block types inside a list item/blockquote: skip gracefully
  }
  return out;
}

function flattenList(listNode: JNode, ctx: ConverterCtx): TextParaModel[] {
  const style: TextParaStyle = listNode.type === 'orderedList' ? 'ordered' : 'bullet';
  const out: TextParaModel[] = [];
  for (const item of listNode.content ?? []) {
    if (isNode(item) && item.type === 'listItem') {
      out.push(...paragraphsFromBlockContent(item.content, style, ctx));
    }
  }
  return out;
}

function tableCellModel(cellNode: JNode, ctx: ConverterCtx, header: boolean): TableCellModel {
  return { paras: tiptapToRuns({ type: 'doc', content: cellNode.content ?? [] }, ctx), header };
}

/** Pure conversion: TipTap document JSON → an array of paragraph/image/rule/
 * table models. Never throws — unrecognized node types are skipped. */
export function tiptapToRuns(content: unknown, ctx: ConverterCtx): ParaModel[] {
  const doc = isNode(content) ? content : undefined;
  const models: ParaModel[] = [];

  for (const node of doc?.content ?? []) {
    if (!isNode(node)) continue;

    switch (node.type) {
      case 'paragraph':
        models.push({ kind: 'text', style: 'body', runs: textRunsFromInline(node.content, ctx) });
        break;

      case 'heading': {
        const level = node.attrs?.level;
        const style: TextParaStyle = level === 2 ? 'heading2' : level === 3 ? 'heading3' : 'heading1';
        models.push({ kind: 'text', style, runs: textRunsFromInline(node.content, ctx) });
        break;
      }

      case 'bulletList':
      case 'orderedList':
        models.push(...flattenList(node, ctx));
        break;

      case 'blockquote':
        models.push(...paragraphsFromBlockContent(node.content, 'blockquote', ctx));
        break;

      case 'table': {
        const rows: TableRowModel[] = [];
        for (const rowNode of node.content ?? []) {
          if (!isNode(rowNode) || rowNode.type !== 'tableRow') continue;
          const cells: TableCellModel[] = [];
          for (const cellNode of rowNode.content ?? []) {
            if (!isNode(cellNode)) continue;
            if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
              cells.push(tableCellModel(cellNode, ctx, cellNode.type === 'tableHeader'));
            }
          }
          rows.push({ cells });
        }
        models.push({ kind: 'table', rows });
        break;
      }

      case 'image': {
        const src = node.attrs?.src;
        if (typeof src === 'string' && src) models.push({ kind: 'image', src });
        break;
      }

      case 'horizontalRule':
        models.push({ kind: 'rule' });
        break;

      default:
        // Unknown node: skip gracefully, never throw.
        break;
    }
  }

  return models;
}

/** Numbers footnote refs by document order (first occurrence of a repeated
 * `noteId` wins), matching the editor's own `FootnoteRef.getIndex`
 * semantics (`orderedFootnoteIds(json).indexOf(noteId)`). Returns -1 for an
 * id that never appears. */
export function makeFootnoteIndexer(content: unknown): (noteId: string) => number {
  const ids = orderedFootnoteIds(content);
  return (noteId: string) => {
    const i = ids.indexOf(noteId);
    return i < 0 ? -1 : i + 1;
  };
}

/** Real docx footnotes, keyed 1..n in document order. A `noteId` with no
 * matching `DocFootnote` entry renders as an empty note body rather than
 * throwing — orphan hygiene is Task 9's job, not the exporter's. */
export function buildFootnoteModels(content: unknown, footnotes: DocFootnote[]): FootnoteModel[] {
  const ids = orderedFootnoteIds(content);
  const seen = new Set<string>();
  const models: FootnoteModel[] = [];
  ids.forEach((id, idx) => {
    if (seen.has(id)) return;
    seen.add(id);
    const note = footnotes.find(f => f.id === id);
    models.push({ n: idx + 1, runs: [{ text: note?.text ?? '' }] });
  });
  return models;
}

function refSegmentsToRuns(segments: RefSegment[]): RunModel[] {
  return segments.map(s => ({ text: s.text, italic: s.italic }));
}

/** Works Cited (MLA) / References (APA) entries, sorted the same way
 * `buildWorksCited` sorts them. Empty when there are no sources — callers
 * use that to decide whether to emit the section at all. */
export function buildWorksCitedModels(sources: DocSource[], style: CitationStyle): WorksCitedModel {
  const heading = style === 'mla9' ? 'Works Cited' : 'References';
  const entries = buildWorksCited(sources, style).map(e => refSegmentsToRuns(e.segments));
  return { heading, entries };
}

// ---------------------------------------------------------------------------
// Thin mapping: intermediate representation → real `docx` classes
// ---------------------------------------------------------------------------

const BODY_FONT = 'Times New Roman';
const BODY_SIZE = 24; // half-points = 12pt
const DOUBLE_SPACING = { line: 480 };
const FIRST_LINE_INDENT = { firstLine: 720 };
const HANGING_INDENT = { left: 720, hanging: 720 };

const HEADING_SIZES: Record<'heading1' | 'heading2' | 'heading3', number> = {
  heading1: 32, heading2: 28, heading3: 26,
};

/** Fetches an image and guesses its docx-compatible raster type from the URL
 * extension (falling back to the response's content-type, then 'png').
 * Returns `null` on any failure — callers skip the image and keep going,
 * per the "never abort the whole export" requirement. */
async function fetchImageRun(src: string): Promise<ImageRun | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();

    const extMatch = /\.(jpe?g|png|gif|bmp)(?:$|\?)/i.exec(src);
    let type: 'jpg' | 'png' | 'gif' | 'bmp' = 'png';
    if (extMatch) {
      type = extMatch[1].toLowerCase().startsWith('jp') ? 'jpg' : (extMatch[1].toLowerCase() as 'png' | 'gif' | 'bmp');
    } else {
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('jpeg')) type = 'jpg';
      else if (contentType.includes('gif')) type = 'gif';
      else if (contentType.includes('bmp')) type = 'bmp';
    }

    return new ImageRun({
      type,
      data: buf,
      transformation: { width: 400, height: 300 },
    });
  } catch {
    return null;
  }
}

function runOptionsFor(run: RunModel) {
  return {
    text: run.text,
    bold: run.bold,
    italics: run.italic,
    underline: run.underline ? { type: UnderlineType.SINGLE } : undefined,
    highlight: run.highlight ? HighlightColor.YELLOW : undefined,
    subScript: run.subscript,
    superScript: run.superscript,
    font: BODY_FONT,
    size: BODY_SIZE,
  };
}

function docxRunFor(run: RunModel): TextRun | FootnoteReferenceRun | ExternalHyperlink {
  if (run.footnoteRefId !== undefined) return new FootnoteReferenceRun(run.footnoteRefId);
  if (run.link) {
    return new ExternalHyperlink({
      link: run.link,
      children: [new TextRun({ ...runOptionsFor(run), underline: { type: UnderlineType.SINGLE }, color: '0563C1' })],
    });
  }
  return new TextRun(runOptionsFor(run));
}

function paragraphPropsFor(style: TextParaStyle) {
  switch (style) {
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return { spacing: DOUBLE_SPACING };
    case 'bullet':
      return { spacing: DOUBLE_SPACING, bullet: { level: 0 } };
    case 'ordered':
      return { spacing: DOUBLE_SPACING, numbering: { reference: 'gw-ordered-list', level: 0 } };
    case 'blockquote':
      return { spacing: DOUBLE_SPACING, indent: { left: 720 } };
    case 'body':
    default:
      return { spacing: DOUBLE_SPACING, indent: FIRST_LINE_INDENT };
  }
}

function textParaToDocx(model: TextParaModel): Paragraph {
  const isHeading = model.style === 'heading1' || model.style === 'heading2' || model.style === 'heading3';
  const runs = model.runs.map(docxRunFor);
  if (isHeading) {
    const size = HEADING_SIZES[model.style as 'heading1' | 'heading2' | 'heading3'];
    return new Paragraph({
      ...paragraphPropsFor(model.style),
      children: model.runs.map(r => new TextRun({ ...runOptionsFor(r), bold: true, size })),
    });
  }
  return new Paragraph({ ...paragraphPropsFor(model.style), children: runs });
}

async function tableParaToDocx(model: TableParaModel): Promise<Table> {
  const rows: TableRow[] = [];
  for (const row of model.rows) {
    const cells: TableCell[] = [];
    for (const cell of row.cells) {
      const children: (Paragraph | Table)[] = [];
      for (const p of cell.paras) {
        children.push(...(await paraModelToDocx(p)));
      }
      cells.push(new TableCell({ children: children.length ? children : [new Paragraph({})] }));
    }
    rows.push(new TableRow({ children: cells }));
  }
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

async function paraModelToDocx(model: ParaModel): Promise<(Paragraph | Table)[]> {
  switch (model.kind) {
    case 'text':
      return [textParaToDocx(model)];
    case 'rule':
      return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999' } } })];
    case 'table':
      return [await tableParaToDocx(model)];
    case 'image': {
      const image = await fetchImageRun(model.src);
      return image ? [new Paragraph({ children: [image] })] : [];
    }
    default:
      return [];
  }
}

/** Thin mapping: paragraph/image/rule/table models → real `docx` blocks.
 * Async only because image models need to fetch bytes; everything else is
 * a straight structural translation of the (already-tested) IR. */
export async function paraModelsToDocx(models: ParaModel[]): Promise<(Paragraph | Table)[]> {
  const out: (Paragraph | Table)[] = [];
  for (const model of models) {
    out.push(...(await paraModelToDocx(model)));
  }
  return out;
}

/** `content` → real docx blocks, in one step. Exported (per the task
 * interface) mainly for tests exercising the mapping layer's compile-time
 * shape; `buildDocxModel` is the real assembly path. */
export async function tiptapToDocxParagraphs(
  content: unknown,
  ctx: ConverterCtx,
): Promise<(Paragraph | Table)[]> {
  return paraModelsToDocx(tiptapToRuns(content, ctx));
}

// ---------------------------------------------------------------------------
// Paper assembly (MLA9 / APA7)
// ---------------------------------------------------------------------------

const MARGINS = { top: 1440, bottom: 1440, left: 1440, right: 1440 };

function lastWord(name: string | undefined): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1];
}

function buildHeader(style: CitationStyle, meta: PaperMeta): Header {
  if (style === 'mla9') {
    const last = lastWord(meta.studentName);
    return new Header({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({
            children: [last ? `${last} ` : '', PageNumber.CURRENT],
            font: BODY_FONT, size: BODY_SIZE,
          })],
        }),
      ],
    });
  }
  // apa7: page number only
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: BODY_SIZE })],
      }),
    ],
  });
}

function metaLine(text: string): Paragraph {
  return new Paragraph({
    spacing: DOUBLE_SPACING,
    children: [new TextRun({ text, font: BODY_FONT, size: BODY_SIZE })],
  });
}

function mlaHeadingBlock(meta: PaperMeta, title: string): Paragraph[] {
  const lines = [meta.studentName, meta.instructor, meta.course, meta.date].filter(
    (v): v is string => !!v && v.trim().length > 0,
  );
  return [
    ...lines.map(metaLine),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: DOUBLE_SPACING,
      children: [new TextRun({ text: title, font: BODY_FONT, size: BODY_SIZE })],
    }),
  ];
}

function apaTitlePageParagraphs(meta: PaperMeta, title: string): Paragraph[] {
  const lines = [meta.studentName, meta.course, meta.instructor, meta.date].filter(
    (v): v is string => !!v && v.trim().length > 0,
  );
  return [
    new Paragraph({ spacing: DOUBLE_SPACING, children: [] }),
    new Paragraph({ spacing: DOUBLE_SPACING, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: DOUBLE_SPACING,
      children: [new TextRun({ text: title, bold: true, font: BODY_FONT, size: BODY_SIZE })],
    }),
    ...lines.map(line => new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: DOUBLE_SPACING,
      children: [new TextRun({ text: line, font: BODY_FONT, size: BODY_SIZE })],
    })),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  ];
}

function worksCitedParagraphs(model: WorksCitedModel): Paragraph[] {
  return [
    new Paragraph({
      pageBreakBefore: true,
      alignment: AlignmentType.CENTER,
      spacing: DOUBLE_SPACING,
      children: [new TextRun({ text: model.heading, font: BODY_FONT, size: BODY_SIZE })],
    }),
    ...model.entries.map(runs => new Paragraph({
      spacing: DOUBLE_SPACING,
      indent: HANGING_INDENT,
      children: runs.map(docxRunFor),
    })),
  ];
}

function footnotesRecord(models: FootnoteModel[]): Record<string, { children: Paragraph[] }> {
  const record: Record<string, { children: Paragraph[] }> = {};
  for (const model of models) {
    record[String(model.n)] = {
      children: [new Paragraph({ children: model.runs.map(docxRunFor) })],
    };
  }
  return record;
}

export interface BuildDocxModelResult {
  doc: Document;
  worksCited: WorksCitedModel | null;
  footnotes: FootnoteModel[];
}

/** Assembles the full paper: MLA/APA header + heading block/title page,
 * body content, Works Cited/References (only when sources exist), and real
 * docx footnotes. Async because embedding images requires fetching their
 * bytes first. */
export async function buildDocxModel(input: ExportInput): Promise<BuildDocxModelResult> {
  const { content, title, style, sources, footnotes, meta } = input;
  const ctx: ConverterCtx = { style, sources, footnotes, footnoteIndex: makeFootnoteIndexer(content) };

  const bodyModels = tiptapToRuns(content, ctx);
  const bodyBlocks = await paraModelsToDocx(bodyModels);

  const footnoteModels = buildFootnoteModels(content, footnotes);
  const worksCited = sources.length > 0 ? buildWorksCitedModels(sources, style) : null;

  const header = buildHeader(style, meta);
  const openingBlocks = style === 'mla9'
    ? mlaHeadingBlock(meta, title)
    : apaTitlePageParagraphs(meta, title);

  const tailBlocks = worksCited ? worksCitedParagraphs(worksCited) : [];

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'gw-ordered-list',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START }],
      }],
    },
    footnotes: footnoteModels.length > 0 ? footnotesRecord(footnoteModels) : undefined,
    sections: [{
      properties: { page: { margin: MARGINS } },
      headers: { default: header },
      children: [...openingBlocks, ...bodyBlocks, ...tailBlocks],
    }],
  });

  return { doc, worksCited, footnotes: footnoteModels };
}

/** Packs a full `.docx` Blob for the given input. Never throws on a broken
 * image fetch — those are simply omitted (see `fetchImageRun`). */
export async function exportDocx(input: ExportInput): Promise<Blob> {
  const { doc } = await buildDocxModel(input);
  return Packer.toBlob(doc);
}

/** Slugifies a title into a filesystem-safe `<title>.<ext>` filename:
 * strips punctuation, collapses whitespace/dashes, hyphen-joins words. */
export function exportFilename(title: string, ext: 'docx' | 'pdf'): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean)
    .join('-');
  return `${slug || 'untitled'}.${ext}`;
}

/**
 * The printed worship aid: a bifold program built from a Mass plan.
 *
 * The physical object drives everything here. One landscape sheet, folded
 * once, gives four panels — and the fold decides which panel prints where:
 *
 *     SHEET 1 (front of the paper)   SHEET 2 (back of the paper)
 *     ┌──────────┬──────────┐        ┌──────────┬──────────┐
 *     │  BACK    │  FRONT   │        │  INSIDE  │  INSIDE  │
 *     │  cover   │  cover   │        │  left    │  right   │
 *     └──────────┴──────────┘        └──────────┴──────────┘
 *
 * The back cover sits to the LEFT of the front cover on the printed sheet:
 * fold it and the front lands on the outside, the back wraps around. Getting
 * that pairing wrong produces a program that reads back-to-front after
 * folding, which is not obvious on screen and very obvious on 200 copies.
 *
 * This module is pure — it turns a Mass row plus presentation settings into
 * the four panels' content. Nothing here touches the DOM, so the imposition
 * and the section ordering can be tested without rendering.
 */

/** Panels in READING order, which is not printing order. */
export type PanelId = 'front' | 'insideLeft' | 'insideRight' | 'back';

export interface AidEntry {
  /** Bold small-caps heading: SIGN OF PEACE, OPENING HYMN. */
  label: string;
  /** Italic title beneath it: "O Come, O Come Emmanuel". */
  title?: string | null;
  /** Right-aligned attribution: "LMGM 3", "Choir", "All". */
  credit?: string | null;
  /** Reading citation, printed right-aligned against the label. */
  citation?: string | null;
  /** Italic paragraph under a reading. */
  summary?: string | null;
  /** A rule + centred heading rather than an entry — LITURGY OF THE WORD. */
  divider?: boolean;
  /** Boxed italic notice. */
  notice?: string | null;
  /** An image printed at this point (music example, artwork). */
  imageUrl?: string | null;
}

export interface WorshipAidSettings {
  /** Church name on the cover. */
  coverTitle: string;
  coverImageUrl: string | null;
  /** Runs vertically up the back cover's outer edge. */
  spineText: string;
  /** Boxed notice at the top of the first inside panel. */
  welcomeNotice: string;
  /** Boxed notice before Communion. */
  communionNotice: string;
  /** Boxed notice at the end. */
  sendingNotice: string;
  /**
   * The composed responsorial psalm, engraved.
   *
   * Resolved from the music library by the editor and STORED here rather than
   * looked up again at read time. The phone edition is public and reads
   * through a curated projection — it cannot query the tenant's library at
   * all — so if the URL did not travel with the aid, the phone would fall
   * back to printing the psalm as prose while the paper showed the music.
   */
  psalmImageUrl?: string | null;
  /**
   * Cover sizing. The two things a cover is made of — the title and the
   * artwork — need to move against each other: a long parish name wants
   * smaller type, a tall woodcut wants more of the panel, and a mark with
   * the season already lettered into it wants the title small and the image
   * large. Points for the title, a fraction of the panel width for the art.
   */
  coverTitleSize?: number;
  coverImageScale?: number;
  /** Extra images the user drops into a panel. */
  images: Partial<Record<PanelId, string | null>>;
  /**
   * Vertical spacing multiplier per panel.
   *
   * Only the cover art is used every time; the other image slots often sit
   * empty, and how much air is left over changes with how many hymns and
   * readings a given Sunday has. Rather than guess at a balance, the spacing
   * is the user's: open a sparse panel out to fill the page, tighten a full
   * one so it does not run past the fold.
   */
  spacing: Partial<Record<PanelId, number>>;
}

/**
 * Cover sizing bounds.
 *
 * Clamped for the same reason panel spacing is: a stored value can come from
 * an older record or a hand-edited one. Below the floor the title is
 * unreadable at arm's length in a pew; above the ceiling it crowds the
 * artwork off the panel.
 */
export const COVER_TITLE_MIN = 11;
export const COVER_TITLE_MAX = 30;
export const COVER_TITLE_DEFAULT = 19;
export const COVER_IMAGE_MIN = 0.35;
export const COVER_IMAGE_MAX = 1;
export const COVER_IMAGE_DEFAULT = 1;

function clamp(raw: unknown, min: number, max: number, fallback: number): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, raw));
}

export function coverTitleSize(settings: WorshipAidSettings): number {
  return clamp(settings.coverTitleSize, COVER_TITLE_MIN, COVER_TITLE_MAX, COVER_TITLE_DEFAULT);
}

export function coverImageScale(settings: WorshipAidSettings): number {
  return clamp(settings.coverImageScale, COVER_IMAGE_MIN, COVER_IMAGE_MAX, COVER_IMAGE_DEFAULT);
}

export const DEFAULT_SETTINGS: WorshipAidSettings = {
  coverTitle: '',
  coverImageUrl: null,
  spineText: '',
  welcomeNotice:
    'Welcome to our worship service. Respecting the atmosphere of prayer and praise, '
    + 'kindly turn off any cell phones, pagers, etc. while you are present in the church.',
  communionNotice:
    'The reception of Holy Communion, in Catholic teaching, indicates an agreement of faith, '
    + "on the recipient's part, with the Catholic doctrine of Jesus' real presence in this sacrament.",
  sendingNotice:
    'Having shared in the Eucharist, you are compelled to go and work for peace and justice, '
    + "thereby building God's kingdom now.",
  coverTitleSize: COVER_TITLE_DEFAULT,
  coverImageScale: COVER_IMAGE_DEFAULT,
  psalmImageUrl: null,
  images: {},
  spacing: {},
};

/** The fields this module reads off a Mass plan. */
export interface AidSource {
  mass_date: string;
  observation: string | null;
  liturgical_season: string | null;
  setting_title: string | null;
  prelude_title: string | null;
  opening_title: string | null;
  psalm_title: string | null;
  responsorial_psalm: string | null;
  preparation_title: string | null;
  communion_1_title: string | null;
  communion_2_title: string | null;
  praise_title: string | null;
  closing_title: string | null;
  first_reading: string | null;
  second_reading: string | null;
  gospel_acclamation: string | null;
  gospel: string | null;
}

/** Split "O Come Emmanuel — LMGM II #291" into its title and credit. */
export function splitCredit(value: string | null | undefined): { title: string | null; credit: string | null } {
  const v = (value ?? '').trim();
  if (!v) return { title: null, credit: null };
  // Em dash is what the hymnal autocomplete writes; also accept an en dash or
  // a spaced hyphen so a hand-typed entry behaves the same.
  const m = v.match(/^(.*?)\s+[—–]\s+(.+)$/) ?? v.match(/^(.*?)\s+-\s+(.+)$/);
  if (!m) return { title: v, credit: null };
  return { title: m[1].trim(), credit: m[2].trim() };
}

function song(label: string, raw: string | null | undefined): AidEntry | null {
  const { title, credit } = splitCredit(raw);
  if (!title) return null;
  return { label, title, credit };
}

function reading(label: string, citation: string | null | undefined): AidEntry | null {
  const c = (citation ?? '').trim();
  if (!c) return null;
  return { label, citation: c };
}

/** Entries with nothing in them are dropped, so a plan with no second reading
 *  prints no empty heading. */
function compact(entries: Array<AidEntry | null>): AidEntry[] {
  return entries.filter((e): e is AidEntry => e !== null);
}

export interface WorshipAid {
  /** The cover carries the parish name and the artwork, and nothing else
   *  (Kevin). A season word printed under a mark that already has the season
   *  lettered into it says it twice. */
  front: { title: string; imageUrl: string | null };
  insideLeft: AidEntry[];
  insideRight: AidEntry[];
  back: AidEntry[];
  /** Runs vertically up the outer edge of the inside-right panel. */
  sideBand: { day: string; date: string };
  spineText: string;
}

/**
 * Build the four panels.
 *
 * The order of the Mass is fixed, so the sections are laid out in that order
 * and split across panels at the two natural seams: the Liturgy of the
 * Eucharist begins the second inside panel, and the Communion rite carries
 * over to the back cover, exactly as the reference program does.
 */
export function buildWorshipAid(
  row: AidSource,
  settings: WorshipAidSettings,
  psalmImageUrl?: string | null,
): WorshipAid {
  // A freshly-resolved URL wins; otherwise whatever was saved with the aid.
  const psalmImage = psalmImageUrl ?? settings.psalmImageUrl ?? null;
  const insideLeft = compact([
    { label: '', notice: settings.welcomeNotice || null },
    { label: 'INTRODUCTORY RITES', divider: true },
    song('THE ORDER OF MASS', row.setting_title),
    song('PRELUDE', row.prelude_title),
    song('OPENING HYMN', row.opening_title),
    { label: 'LITURGY OF THE WORD', divider: true },
    reading('FIRST READING', row.first_reading),
    // The psalm carries its engraved setting when one has been composed —
    // the composer's JPEG drops straight in here.
    row.responsorial_psalm || psalmImage
      ? {
          label: 'RESPONSORIAL PSALM',
          citation: row.responsorial_psalm,
          title: splitCredit(row.psalm_title).title,
          credit: splitCredit(row.psalm_title).credit,
          imageUrl: psalmImage,
        }
      : null,
    settings.images.insideLeft ? { label: '', imageUrl: settings.images.insideLeft } : null,
  ]);

  const insideRight = compact([
    reading('SECOND READING', row.second_reading),
    reading('GOSPEL ACCLAMATION', row.gospel_acclamation),
    reading('GOSPEL', row.gospel),
    { label: 'HOMILY' },
    { label: 'PROFESSION OF FAITH', credit: 'on pew card' },
    { label: 'LITURGY OF THE EUCHARIST', divider: true },
    song('PREPARATION OF THE ALTAR AND THE GIFTS', row.preparation_title),
    { label: 'EUCHARISTIC PRAYER' },
    { label: 'MEMORIAL ACCLAMATION' },
    { label: 'DOXOLOGY and AMEN' },
    { label: 'OUR FATHER' },
    settings.images.insideRight ? { label: '', imageUrl: settings.images.insideRight } : null,
  ]);

  const back = compact([
    { label: 'SIGN OF PEACE' },
    { label: 'LAMB OF GOD' },
    { label: '', notice: settings.communionNotice || null },
    song('COMMUNION', row.communion_1_title),
    song('COMMUNION', row.communion_2_title),
    song('SONG OF PRAISE', row.praise_title),
    song('SENDING FORTH', row.closing_title),
    settings.images.back ? { label: '', imageUrl: settings.images.back } : null,
    { label: '', notice: settings.sendingNotice || null },
  ]);

  return {
    front: {
      title: settings.coverTitle,
      imageUrl: settings.coverImageUrl ?? settings.images.front ?? null,
    },
    insideLeft,
    insideRight,
    back,
    sideBand: { day: row.observation ?? '', date: formatLongDate(row.mass_date) },
    spineText: settings.spineText,
  };
}

/** "December 22, 2013" — the form the printed band uses. */
export function formatLongDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return iso ?? '';
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/**
 * Which panels print on which sheet, in left-to-right order.
 *
 * This is the imposition, and it is the one thing that cannot be fixed after
 * the copies come off the printer.
 */
export const SHEETS: ReadonlyArray<readonly [PanelId, PanelId]> = [
  ['back', 'front'],          // outside of the folded sheet
  ['insideLeft', 'insideRight'], // inside
];

/**
 * The spacing multiplier for a panel, clamped.
 *
 * Bounded rather than free: below about half, consecutive entries collide
 * into an unreadable block; above two, a panel with any content at all runs
 * past the fold. A stored value from an older or hand-edited record can be
 * anything, so it is clamped on the way out rather than trusted.
 */
export const SPACING_MIN = 0.5;
export const SPACING_MAX = 2;
export function panelSpacing(settings: WorshipAidSettings, panel: PanelId): number {
  const raw = settings.spacing?.[panel];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 1;
  return Math.max(SPACING_MIN, Math.min(SPACING_MAX, raw));
}


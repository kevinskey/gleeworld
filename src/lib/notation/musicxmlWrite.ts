import { DIVISIONS, musicXmlType } from './duration';
import { EditorScore, EditorElement, elementTicks } from './model';
import { layoutMeasures } from './measures';

const CLEF_SIGN: Record<EditorScore['clef'], { sign: string; line: number }> = {
  treble: { sign: 'G', line: 2 }, bass: { sign: 'F', line: 4 }, alto: { sign: 'C', line: 3 },
};

/**
 * Page defaults, so the file carries the type size the editor engraves at.
 *
 * Without a <defaults> block every other renderer picks its own lyric size,
 * and most of them pick one visibly smaller than the noteheads — the same
 * complaint the worship aid had. Scaling is the standard 7mm per 40 tenths
 * (staff space = 1.75mm), and 8pt is the 1.6-staff-space relation the staff
 * renderer uses, expressed in the units MusicXML wants.
 */
const DEFAULTS_XML =
  '<defaults><scaling><millimeters>7</millimeters><tenths>40</tenths></scaling>'
  + '<word-font font-family="Times New Roman" font-size="8"/>'
  + '<lyric-font font-family="Times New Roman" font-size="8"/></defaults>';

function noteXml(el: EditorElement): string {
  const dur = elementTicks(el);
  const dots = '<dot/>'.repeat(el.dots);
  const type = `<type>${musicXmlType(el.base)}</type>`;
  if (el.kind === 'rest') {
    return `<note><rest/><duration>${dur}</duration>${type}${dots}</note>`;
  }
  const { step, octave, alter } = el.pitch;
  const alterXml = alter !== 0 ? `<alter>${alter}</alter>` : '';
  const tieXml = el.tie === 'start' ? '<tie type="start"/>' : el.tie === 'stop' ? '<tie type="stop"/>' : '';
  const notations = el.tie === 'start' ? '<notations><tied type="start"/></notations>'
    : el.tie === 'stop' ? '<notations><tied type="stop"/></notations>' : '';
  const lyric = el.lyric ? `<lyric number="1"><syllabic>single</syllabic><text>${escapeXml(el.lyric)}</text></lyric>` : '';
  return `<note><pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`
    + `<duration>${dur}</duration>${tieXml}${type}${dots}${notations}${lyric}</note>`;
}

/**
 * The name our lyric nudge travels under inside the score.
 *
 * MusicXML has no place for "how far below the notes this engraver likes its
 * words", and gw_sheet_music has no metadata column to park it in beside the
 * document. <miscellaneous-field> is the format's own answer to exactly that:
 * a named string an application may write and every other application ignores.
 * Storing it here rather than in a sibling column also means the setting
 * travels with the music — export the MusicXML, mail it, reopen it, and the
 * spacing is still the one that was engraved.
 *
 * Vendor-prefixed because the name is a bare string in a shared namespace.
 */
export const LYRIC_OFFSET_FIELD = 'gleeworld-lyric-offset';

/**
 * And the bars-per-system choice, under the same mechanism and for the same
 * reason.
 *
 * MusicXML CAN express a fixed system layout, but only by writing explicit
 * <print new-system="yes"> breaks — which pins the breaks rather than the
 * preference, and the engraver here is allowed to refuse a bar count that
 * genuinely will not fit. What has to survive a save is the AUTHOR'S REQUEST,
 * so that is what is stored.
 */
export const BARS_PER_LINE_FIELD = 'gleeworld-bars-per-line';

/** The <identification> block, or '' when there is nothing to say. Each field
 *  is written only for a real recorded preference: a score that made none
 *  must serialise byte-for-byte as it always did, so nothing downstream sees
 *  a spurious change and no reader has to special-case a value that means
 *  "unset". */
function identificationXml(score: EditorScore): string {
  const fields: string[] = [];
  const off = score.lyricOffset;
  if (typeof off === 'number' && Number.isFinite(off) && off !== 0) {
    fields.push(`<miscellaneous-field name="${LYRIC_OFFSET_FIELD}">${off}</miscellaneous-field>`);
  }
  const bars = score.barsPerLine;
  if (typeof bars === 'number' && Number.isFinite(bars) && bars >= 1) {
    fields.push(
      `<miscellaneous-field name="${BARS_PER_LINE_FIELD}">${Math.round(bars)}</miscellaneous-field>`,
    );
  }
  if (fields.length === 0) return '';
  return `<identification><miscellaneous>${fields.join('')}</miscellaneous></identification>`;
}

export function editorScoreToMusicXML(score: EditorScore): string {
  const measures = layoutMeasures(score);
  const clef = CLEF_SIGN[score.clef];
  const body = measures.map((m, i) => {
    const attrs = i === 0
      ? `<attributes><divisions>${DIVISIONS}</divisions>`
        + `<key><fifths>${score.keyFifths}</fifths><mode>${score.mode}</mode></key>`
        + `<time><beats>${score.timeSig.beats}</beats><beat-type>${score.timeSig.beatType}</beat-type></time>`
        + `<clef><sign>${clef.sign}</sign><line>${clef.line}</line></clef></attributes>`
      : '';
    const notes = m.elements.map(noteXml).join('');
    const body = i === 0 ? `${attrs}<sound tempo="${score.tempo}"/>${notes}` : notes;
    return `<measure number="${i + 1}">${body}</measure>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>`
    + `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">`
    + `<score-partwise version="3.1">`
    + `<work><work-title>${escapeXml(score.title)}</work-title></work>`
    // Element order matters to the DTD: work, then identification, then
    // defaults, then part-list.
    + identificationXml(score)
    + DEFAULTS_XML
    + `<part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>`
    + `<part id="P1">${body}</part></score-partwise>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}

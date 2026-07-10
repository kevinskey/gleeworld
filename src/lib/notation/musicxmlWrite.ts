import { DIVISIONS, musicXmlType } from './duration';
import { EditorScore, EditorElement, elementTicks } from './model';
import { layoutMeasures } from './measures';

const CLEF_SIGN: Record<EditorScore['clef'], { sign: string; line: number }> = {
  treble: { sign: 'G', line: 2 }, bass: { sign: 'F', line: 4 }, alto: { sign: 'C', line: 3 },
};

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
  return `<note><pitch><step>${step}</step>${alterXml}<octave>${octave}</octave></pitch>`
    + `<duration>${dur}</duration>${tieXml}${type}${dots}${notations}</note>`;
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
    return `<measure number="${i + 1}">${attrs}${m.elements.map(noteXml).join('')}</measure>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>`
    + `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">`
    + `<score-partwise version="3.1">`
    + `<work><work-title>${escapeXml(score.title)}</work-title></work>`
    + `<part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list>`
    + `<part id="P1">${body}</part></score-partwise>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!));
}

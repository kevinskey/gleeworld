// @vitest-environment jsdom
//
// The printed size of the engraved psalm, pinned at the stage that actually
// decides it.
//
// The score is laid out at a fixed four inches — that width is what chooses
// how many bars share a system and how much room each syllable gets — and is
// then handed to the panel as a JPEG. The panel used to size it like any
// photograph: `max-width: 100%` against a `max-height` cap, whichever bound
// first. So the printed staff size depended on the score's aspect ratio: two
// systems hit the height cap and printed at 4.09in, one system hit the width
// and printed at 4.7in, three systems came out at 2.94in. Three different
// staff sizes for one engraving, none of them the one it was drawn at.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WorshipAidSheets } from './WorshipAidSheets';
import { buildWorshipAid, DEFAULT_SETTINGS, type AidSource } from '@/lib/liturgy/worshipAid';
import { PSALM_WIDTH_IN } from '@/lib/liturgy/psalmComposer';
import { AID_BODY_PT } from '@/lib/liturgy/aidPage';

afterEach(cleanup);

const source: AidSource = {
  mass_date: '2026-08-09',
  observation: 'Nineteenth Sunday in Ordinary Time',
  liturgical_season: 'Ordinary Time',
  responsorial_psalm: 'Ps 23:1-6',
  psalm_title: 'The Lord Is My Shepherd',
} as AidSource;

const PSALM_JPEG = 'https://example.org/psalm.jpg';
const ARTWORK = 'https://example.org/artwork.jpg';

function renderAid() {
  const settings = {
    ...DEFAULT_SETTINGS,
    psalmImageUrl: PSALM_JPEG,
    images: { ...DEFAULT_SETTINGS.images, insideRight: ARTWORK },
  };
  render(
    <WorshipAidSheets aid={buildWorshipAid(source, settings)} settings={settings} />,
  );
}

describe('the engraved psalm on the printed page', () => {
  it('prints at the width it was engraved at', () => {
    renderAid();
    const img = screen.getAllByRole('presentation', { hidden: true })
      .find((el) => el.getAttribute('src') === PSALM_JPEG) as HTMLImageElement | undefined;
    expect(img).toBeTruthy();
    expect(img!.style.width).toBe(`${PSALM_WIDTH_IN}in`);
  });

  it('keeps the caps that stop it running over the fold or off the panel', () => {
    // The design width is authoritative, not absolute: a score wider or taller
    // than the panel must still reduce to fit rather than overflow it.
    renderAid();
    const img = screen.getAllByRole('presentation', { hidden: true })
      .find((el) => el.getAttribute('src') === PSALM_JPEG) as HTMLImageElement;
    expect(img.style.maxWidth).toBe('100%');
    expect(img.style.maxHeight).toBe('2.6in');
  });

  it('sets its own paragraphs at the size the psalm\'s lyrics are engraved to', () => {
    // The other end of the same constant. psalmComposer divides by AID_BODY_PT
    // to get the engraving scale, so if this page stopped using it the psalm
    // would go on printing at a size the page no longer sets — and, being a
    // rasterised image by then, nothing on the page would reveal it.
    const settings = { ...DEFAULT_SETTINGS, psalmImageUrl: PSALM_JPEG };
    render(
      <WorshipAidSheets
        aid={buildWorshipAid(source, settings)}
        settings={settings}
        edits={{ insideLeft: { inserts: [{ id: 'note-1', kind: 'text', text: 'Please silence your phone.' }] } }}
      />,
    );
    const summary = screen.getByText('Please silence your phone.').closest('p');
    expect(summary).toBeTruthy();
    expect(summary!.style.fontSize).toBe(`${AID_BODY_PT}pt`);
  });

  it('leaves a user\'s artwork sized by the panel, not by the psalm', () => {
    renderAid();
    const art = screen.getAllByRole('presentation', { hidden: true })
      .find((el) => el.getAttribute('src') === ARTWORK) as HTMLImageElement | undefined;
    expect(art).toBeTruthy();
    expect(art!.style.width).toBe('auto');
  });
});

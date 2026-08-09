// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { WorshipAidSheets } from '../WorshipAidSheets';
import { DEFAULT_SETTINGS } from '@/lib/liturgy/worshipAid';
import type { WorshipAid } from '@/lib/liturgy/worshipAid';

afterEach(cleanup);

/** Minimal aid: the panels must exist even when they hold nothing. */
const aid: WorshipAid = {
  title: 'Test Mass',
  subtitle: '',
  sideBand: { day: 'Sunday', date: '9 August 2026' },
  front: [], insideLeft: [], insideRight: [], back: [],
} as unknown as WorshipAid;

describe('WorshipAidSheets panel addressing', () => {
  it('marks every panel with its PanelId', () => {
    const { container } = render(
      <WorshipAidSheets aid={aid} settings={DEFAULT_SETTINGS} />,
    );
    for (const p of ['front', 'insideLeft', 'insideRight', 'back']) {
      expect(container.querySelector(`[data-panel="${p}"]`), p).not.toBeNull();
    }
  });

  it('puts each panel inside a sheet, so focus CSS can hide the sibling', () => {
    const { container } = render(
      <WorshipAidSheets aid={aid} settings={DEFAULT_SETTINGS} />,
    );
    for (const p of ['front', 'insideLeft', 'insideRight', 'back']) {
      const el = container.querySelector(`[data-panel="${p}"]`);
      expect(el?.closest('.worship-aid-sheet'), p).not.toBeNull();
    }
  });
});

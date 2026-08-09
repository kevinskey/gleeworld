// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { createRef } from 'react';
import { AidStage } from '../AidStage';
import { AID_VIEW_ATTR } from '../aidView';

afterEach(cleanup);

describe('AidStage', () => {
  it('carries the view attribute and the focused panel, so CSS can isolate it', () => {
    const { container } = render(
      <AidStage focusPanel="insideLeft" view="focus" overflowLines={0} dropped={0}
        sheetsRef={createRef<HTMLDivElement>()}>
        <div className="worship-aid-sheets" />
      </AidStage>,
    );
    const wrap = container.querySelector(`[${AID_VIEW_ATTR}]`);
    expect(wrap?.getAttribute(AID_VIEW_ATTR)).toBe('focus');
    expect(wrap?.getAttribute('data-aid-focus')).toBe('insideLeft');
  });

  it('reports overflow next to the sheet, where it can be acted on', () => {
    const { getByText } = render(
      <AidStage focusPanel="back" view="focus" overflowLines={3} dropped={1}
        sheetsRef={createRef<HTMLDivElement>()}>
        <div />
      </AidStage>,
    );
    expect(getByText(/3 lines over/i)).toBeTruthy();
    expect(getByText(/1 dropped/i)).toBeTruthy();
  });

  it('says nothing when everything fits', () => {
    const { queryByText } = render(
      <AidStage focusPanel="back" view="focus" overflowLines={0} dropped={0}
        sheetsRef={createRef<HTMLDivElement>()}>
        <div />
      </AidStage>,
    );
    expect(queryByText(/lines over/i)).toBeNull();
  });

  it('exposes one ref: the view wrapper IS the capture root', () => {
    const sheetsRef = createRef<HTMLDivElement>();
    const { container } = render(
      <AidStage focusPanel="insideRight" view="focus" overflowLines={0} dropped={0}
        sheetsRef={sheetsRef}>
        <div />
      </AidStage>,
    );
    const wrap = container.querySelector(`[${AID_VIEW_ATTR}]`);
    // If this fails, withFullView/worshipAidToPdf would be toggling
    // AID_VIEW_ATTR on a node other than the one the focus CSS matches on —
    // the exact bug that produces a one-panel archived PDF.
    expect(sheetsRef.current).toBe(wrap);
  });

  it('keeps "1 lines" singular', () => {
    const { getByText, queryByText } = render(
      <AidStage focusPanel="back" view="focus" overflowLines={1} dropped={0}
        sheetsRef={createRef<HTMLDivElement>()}>
        <div />
      </AidStage>,
    );
    expect(getByText(/^1 line over$/i)).toBeTruthy();
    expect(queryByText(/1 lines over/i)).toBeNull();
  });

  it('separates lines-over and dropped with a middot when both are present', () => {
    const { getByText } = render(
      <AidStage focusPanel="back" view="focus" overflowLines={3} dropped={1}
        sheetsRef={createRef<HTMLDivElement>()}>
        <div />
      </AidStage>,
    );
    expect(getByText('3 lines over · 1 dropped')).toBeTruthy();
  });
});

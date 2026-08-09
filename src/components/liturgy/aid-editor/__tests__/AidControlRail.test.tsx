// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AidControlRail } from '../AidControlRail';
import { DEFAULT_SETTINGS } from '@/lib/liturgy/worshipAid';

afterEach(cleanup);

const base = {
  settings: DEFAULT_SETTINGS,
  onSettingsPatch: () => {},
  blockList: <div data-testid="blocks" />,
  phoneEdition: <div data-testid="phone" />,
};

describe('AidControlRail', () => {
  it('offers all four panels, cover included', () => {
    const { getByRole } = render(
      <AidControlRail {...base} panel="insideLeft" onPanelChange={() => {}} />,
    );
    for (const label of ['Cover', 'Inside left', 'Inside right', 'Back']) {
      expect(getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('reports the panel the user picked', () => {
    const onPanelChange = vi.fn();
    const { getByRole } = render(
      <AidControlRail {...base} panel="insideLeft" onPanelChange={onPanelChange} />,
    );
    fireEvent.click(getByRole('button', { name: 'Back' }));
    expect(onPanelChange).toHaveBeenCalledWith('back');
  });

  it('shows the block list for an interior panel', () => {
    const { getByTestId } = render(
      <AidControlRail {...base} panel="insideRight" onPanelChange={() => {}} />,
    );
    expect(getByTestId('blocks')).toBeTruthy();
  });

  it('replaces the block list with cover fields on the Cover panel', () => {
    // The cover is generated from settings and has no editable block list;
    // showing an empty list there reads as a bug.
    const { queryByTestId, getByLabelText } = render(
      <AidControlRail {...base} panel="front" onPanelChange={() => {}} />,
    );
    expect(queryByTestId('blocks')).toBeNull();
    expect(getByLabelText(/cover title/i)).toBeTruthy();
  });
});

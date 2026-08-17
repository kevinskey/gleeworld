// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PieceLine } from './PieceLine';

afterEach(cleanup);

const piece = (over: Record<string, unknown> = {}) => ({
  id: 'p1', program_id: 'x', sort_order: 0, section_heading: null,
  title: 'I Thank You God', composer: 'Gwyneth Walker', arranger: null, voicing: null,
  soloists: null, duration_seconds: 250, program_notes: null, rights_status: null,
  copyright_info: null, sheet_music_id: null, ...over,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

describe('PieceLine', () => {
  it('renders title, leader, composer', () => {
    const { container } = render(<PieceLine piece={piece()} />);
    expect(screen.getByText('I Thank You God')).toBeInTheDocument();
    expect(screen.getByText('Gwyneth Walker')).toBeInTheDocument();
    expect(container.querySelector('.cp-leader')).not.toBeNull();
  });
  it('appends ", arr. X" after the composer', () => {
    render(<PieceLine piece={piece({ arranger: 'Moses Hogan' })} />);
    expect(screen.getByText('Gwyneth Walker, arr. Moses Hogan')).toBeInTheDocument();
  });
  it('arranger alone renders as "arr. X"', () => {
    render(<PieceLine piece={piece({ composer: null, arranger: 'Moses Hogan' })} />);
    expect(screen.getByText('arr. Moses Hogan')).toBeInTheDocument();
  });
  it('voicing and soloists render as secondary lines; duration never prints', () => {
    const { container } = render(<PieceLine piece={piece({ voicing: 'SATB div.', soloists: 'Jordan Lee, soprano' })} />);
    expect(container.querySelector('.cp-piece-voicing')!.textContent).toBe('SATB div.');
    expect(container.querySelector('.cp-piece-soloists')!.textContent).toBe('Jordan Lee, soprano');
    expect(container.textContent).not.toMatch(/250|4:10/);
  });
});

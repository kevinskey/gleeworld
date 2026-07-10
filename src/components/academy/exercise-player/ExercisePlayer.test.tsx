// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExercisePlayer } from './ExercisePlayer';
import type { ExerciseIR } from '@/lib/sightReading/ir';

vi.mock('@/pages/notation/NotationView', () => ({
  NotationView: () => <div data-testid="notation" />,
}));

const ir: ExerciseIR = {
  key: 'C', mode: 'major', tonicMidi: 60, meter: { beats: 4, beatType: 4 }, tempo: 90,
  notes: [{ midi: 60, beatPos: 0, durationBeats: 1, solfege: 'do', phraseIdx: 0 }],
  phrases: 1, difficulty: 1,
};

describe('ExercisePlayer', () => {
  it('renders a badge fallback for unknown types', () => {
    render(<MemoryRouter><ExercisePlayer exercise={{ id: '1', type: 'mystery_thing', data: {} }} /></MemoryRouter>);
    expect(screen.getByText('mystery thing')).toBeTruthy();
  });
  it('renders a melody card with notation and deep link', () => {
    render(<MemoryRouter><ExercisePlayer exercise={{ id: 'abc', type: 'melody', data: { ir } }} /></MemoryRouter>);
    expect(screen.getByTestId('notation')).toBeTruthy();
    expect(screen.getByText(/Practice with pitch tracker/i)).toBeTruthy();
  });
  it('renders an assignment card with rubric', () => {
    render(<MemoryRouter><ExercisePlayer exercise={{ id: '2', type: 'assignment', data: {
      instructions: ['Sing the scale'], deliverables: ['One video'],
      rubric: [{ criterion: 'Pitch Accuracy', percent: 30 }],
    } }} /></MemoryRouter>);
    expect(screen.getByText('Sing the scale')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy();
  });
});

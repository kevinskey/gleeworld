// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ClassProgressTab } from './ClassProgressTab';
import type { StudentProgress } from '@/lib/sightReading/takesApi';

afterEach(() => cleanup());

const student = (over: Partial<StudentProgress> = {}): StudentProgress => ({
  userId: 'a', name: 'Ann Smith', takes: 3, best: 92, avg: 81, lastTs: 1_700_000_000_000, ...over,
});

describe('ClassProgressTab', () => {
  it('shows the empty state when no student has practiced', async () => {
    render(<ClassProgressTab load={() => Promise.resolve([])} />);
    expect(await screen.findByText(/No student takes yet/i)).toBeInTheDocument();
  });

  it('shows an error state when the load fails', async () => {
    render(<ClassProgressTab load={() => Promise.resolve(null)} />);
    expect(await screen.findByText(/Couldn’t load class progress/i)).toBeInTheDocument();
  });

  it('lists each student with name, best and average', async () => {
    render(
      <ClassProgressTab
        load={() => Promise.resolve([student(), student({ userId: 'b', name: 'Ben Lee', best: 74, avg: 68, takes: 1 })])}
      />,
    );
    expect(await screen.findByText('Ann Smith')).toBeInTheDocument();
    expect(screen.getByText('Ben Lee')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();       // Ann best
    expect(screen.getByText(/1 take\b/)).toBeInTheDocument();  // Ben singular
    expect(screen.getByText(/3 takes/)).toBeInTheDocument();   // Ann plural
  });
});

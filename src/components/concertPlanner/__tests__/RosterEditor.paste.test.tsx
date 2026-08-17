// @vitest-environment jsdom
//
// Task 10: bulk paste in RosterEditor. The member input and the section
// input both split a multi-line paste into individual mutations (one per
// non-empty trimmed line), preserving order; a single-line paste is left
// alone so the input's normal typing/paste path (and Enter-to-add) is
// unaffected. `concert` is a hand-rolled stand-in for
// ReturnType<typeof useConcertProgram> — RosterEditor only touches the
// fields destructured below.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { RosterEditor } from '../RosterEditor';
import type { useConcertProgram } from '@/hooks/useConcertPrograms';

type Concert = ReturnType<typeof useConcertProgram>;

function makeConcert(): Concert {
  return {
    roster: [
      { id: 's1', section_name: 'Soprano', members: [] },
    ],
    addRosterSection: { mutate: vi.fn() },
    updateRosterSection: { mutate: vi.fn() },
    deleteRosterSection: { mutate: vi.fn() },
    addRosterMember: { mutate: vi.fn() },
    deleteRosterMember: { mutate: vi.fn() },
  } as unknown as Concert;
}

afterEach(cleanup);

describe('RosterEditor bulk paste — member input', () => {
  it('splits a multi-line paste into individual addRosterMember calls, in order', () => {
    const concert = makeConcert();
    render(<RosterEditor concert={concert} />);
    const memberInput = screen.getByPlaceholderText('Add member…');

    fireEvent.paste(memberInput, { clipboardData: { getData: () => 'Amara\nBrianna\n\nCorinne' } });

    const mutate = concert.addRosterMember.mutate as ReturnType<typeof vi.fn>;
    expect(mutate).toHaveBeenCalledTimes(3);
    expect(mutate).toHaveBeenNthCalledWith(1, { sectionId: 's1', member_name: 'Amara' });
    expect(mutate).toHaveBeenNthCalledWith(2, { sectionId: 's1', member_name: 'Brianna' });
    expect(mutate).toHaveBeenNthCalledWith(3, { sectionId: 's1', member_name: 'Corinne' });
  });

  it('falls through to default paste behavior for a single-line paste (no mutations fired)', () => {
    const concert = makeConcert();
    render(<RosterEditor concert={concert} />);
    const memberInput = screen.getByPlaceholderText('Add member…');

    fireEvent.paste(memberInput, { clipboardData: { getData: () => 'Amara' } });

    expect(concert.addRosterMember.mutate).not.toHaveBeenCalled();
  });
});

describe('RosterEditor bulk paste — section input', () => {
  it('splits a multi-line paste into individual addRosterSection calls, in order', () => {
    const concert = makeConcert();
    render(<RosterEditor concert={concert} />);
    const sectionInput = screen.getByPlaceholderText('Soprano, Alto, Tenor…');

    fireEvent.paste(sectionInput, { clipboardData: { getData: () => 'Soprano\nAlto\n\nTenor' } });

    const mutate = concert.addRosterSection.mutate as ReturnType<typeof vi.fn>;
    expect(mutate).toHaveBeenCalledTimes(3);
    expect(mutate).toHaveBeenNthCalledWith(1, 'Soprano');
    expect(mutate).toHaveBeenNthCalledWith(2, 'Alto');
    expect(mutate).toHaveBeenNthCalledWith(3, 'Tenor');
  });

  it('falls through to default paste behavior for a single-line paste (no mutations fired)', () => {
    const concert = makeConcert();
    render(<RosterEditor concert={concert} />);
    const sectionInput = screen.getByPlaceholderText('Soprano, Alto, Tenor…');

    fireEvent.paste(sectionInput, { clipboardData: { getData: () => 'Soprano' } });

    expect(concert.addRosterSection.mutate).not.toHaveBeenCalled();
  });
});

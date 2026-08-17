// @vitest-environment jsdom
//
// Task 12: Publish panel — validation blockers with click-to-jump fixes,
// the approval checkbox, real QR generation, and the footer-QR toggle.
// PublishPanel is a pure controlled component; validation is built with
// the REAL validateProgram over small fixtures so the blocker rows/Fix
// buttons are exercised against real ids, not a hand-rolled stub.
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
  render, screen, cleanup, fireEvent, waitFor,
} from '@testing-library/react';
import { validateProgram } from '@/lib/concertPlanner/validate';
import type { ConcertProgram as ValidateConcertProgram, ConcertPiece, RosterSection } from '@/lib/concertPlanner/types';
import type { ConcertProgram } from '@/hooks/useConcertPrograms';
import { PublishPanel } from '../PublishPanel';

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,x') },
}));

afterEach(cleanup);

const basePieces: ConcertPiece[] = [
  {
    id: 'p1', program_id: 'prog1', sort_order: 0, section_heading: null,
    title: 'Ave Maria', composer: 'Schubert', arranger: null, voicing: null,
    soloists: null, duration_seconds: 180, program_notes: null,
    rights_status: 'public_domain', copyright_info: null,
  },
  {
    id: 'p2', program_id: 'prog1', sort_order: 1, section_heading: null,
    title: 'Total Praise', composer: 'Hairston', arranger: null, voicing: null,
    soloists: null, duration_seconds: 240, program_notes: null,
    rights_status: null, copyright_info: null,
  },
];

const roster: RosterSection[] = [
  {
    id: 'r1', program_id: 'prog1', section_name: 'Soprano', sort_order: 0,
    members: [{ id: 'm1', section_id: 'r1', member_name: 'Jane', sort_order: 0 }],
  },
];

function makeValidateProgram(): ValidateConcertProgram {
  return {
    id: 'prog1', tenant_id: 't1', title: 'Spring Concert', subtitle: null,
    event_date: '2026-05-01', call_time: null, venue: 'Recital Hall',
    conductor: 'Dr. Reed', accompanist: 'Ms. Park', performer_group: null,
    cover_image_url: null, notes: null, target_length_minutes: null,
    theme: 'classic-concert', print_format: 'letter-portrait', card_layout: {},
    published_at: null, published_by: null, published_slug: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };
}

function makeProgram(overrides: Partial<ConcertProgram> = {}): ConcertProgram {
  return {
    ...makeValidateProgram(),
    template_kind: 'choral',
    print_design: 'classic-1943',
    blocks: [],
    design_state: {},
    canva_design_id: null,
    setlist_id: null,
    ...overrides,
  } as unknown as ConcertProgram;
}

// One piece (p2) has rights_status: null → validateProgram flags it
// `rights-p2`/required. Everything else on this fixture is clean.
const dirtyValidation = validateProgram(makeValidateProgram(), basePieces, roster);

const cleanPieces = basePieces.map((p) => (p.id === 'p2' ? { ...p, rights_status: 'public_domain' as const } : p));
const cleanValidation = validateProgram(makeValidateProgram(), cleanPieces, roster);

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    open: true,
    onOpenChange: vi.fn(),
    validation: cleanValidation,
    program: makeProgram(),
    onJumpToPiece: vi.fn(),
    onPublish: vi.fn().mockResolvedValue(undefined),
    onUnpublish: vi.fn().mockResolvedValue(undefined),
    publishing: false,
    footerShowQr: false,
    onToggleFooterQr: vi.fn(),
    ...overrides,
  };
}

describe('PublishPanel', () => {
  it('renders required blockers with a Fix button that jumps to the offending piece', () => {
    const onJumpToPiece = vi.fn();
    render(<PublishPanel {...baseProps({ validation: dirtyValidation, onJumpToPiece })} />);

    expect(screen.getByText(/1 piece missing rights status/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fix' }));
    expect(onJumpToPiece).toHaveBeenCalledWith('p2');
  });

  it('keeps Publish disabled while required items remain, even once approved', () => {
    render(<PublishPanel {...baseProps({ validation: dirtyValidation })} />);
    const publishBtn = screen.getByRole('button', { name: 'Publish' });
    expect(publishBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(publishBtn).toBeDisabled();
  });

  it('enables Publish once approved and validation has no required items', () => {
    render(<PublishPanel {...baseProps({ validation: cleanValidation })} />);
    const publishBtn = screen.getByRole('button', { name: 'Publish' });
    expect(publishBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(publishBtn).not.toBeDisabled();
  });

  it('renders the QR image with a data src once the program is published', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <PublishPanel {...baseProps({ validation: cleanValidation, onPublish })} />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());

    rerender(
      <PublishPanel
        {...baseProps({
          validation: cleanValidation,
          onPublish,
          program: makeProgram({ published_at: '2026-08-17T00:00:00Z', published_slug: 'spring-concert-prog1' }),
        })}
      />,
    );

    const img = await screen.findByAltText(/qr code/i);
    expect(img).toHaveAttribute('src', 'data:image/png;base64,x');
  });

  it('disables the footer-QR switch while the program is unpublished', () => {
    render(<PublishPanel {...baseProps({ validation: cleanValidation })} />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('enables the footer-QR switch once published', () => {
    render(
      <PublishPanel
        {...baseProps({
          validation: cleanValidation,
          program: makeProgram({ published_at: '2026-08-17T00:00:00Z', published_slug: 'spring-concert-prog1' }),
        })}
      />,
    );
    expect(screen.getByRole('switch')).not.toBeDisabled();
  });
});

// @vitest-environment jsdom
//
// The regression: this card fetched its own totals in a useEffect keyed on
// [template.id]. Assigning fees does not change the template id, so it never
// re-ran and the card stayed at "$0 / $0 collected · 0 / 0 paid" while the
// list directly beneath it showed the new fees. It now derives from the fees
// the page already holds, so it cannot go stale.
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { FeeTemplateRollup } from './FeeTemplateRollup';
import type { StudentFee } from '@/hooks/useFeesManagement';
import type { FeeTemplate } from '@/hooks/useFeeTemplates';

const template = { id: 't-1', name: 'Choir Fee', category: 'dues' } as FeeTemplate;

const fee = (over: Partial<StudentFee>): StudentFee =>
  ({
    id: Math.random().toString(36).slice(2),
    user_id: 'u',
    amount: 25,
    paid_amount: 0,
    due_date: '2026-08-07',
    semester: 'Fall 2026',
    academic_year: '2026-2027',
    status: 'pending',
    category: 'dues',
    name: 'Choir Fee',
    template_id: 't-1',
    ...over,
  }) as StudentFee;

describe('FeeTemplateRollup', () => {
  it('shows zeroes when nothing is assigned yet', () => {
    render(<FeeTemplateRollup template={template} fees={[]} />);
    expect(screen.getByText('$0 / $0 collected')).toBeInTheDocument();
    expect(screen.getByText('0 / 0 paid')).toBeInTheDocument();
  });

  it('counts an assigned but unpaid fee — the reported bug', () => {
    // Previously rendered "$0 / $0 collected · 0 / 0 paid" here.
    render(<FeeTemplateRollup template={template} fees={[fee({})]} />);
    expect(screen.getByText('$0 / $25 collected')).toBeInTheDocument();
    expect(screen.getByText('0 / 1 paid')).toBeInTheDocument();
  });

  it('sums collected across partial and paid fees', () => {
    render(
      <FeeTemplateRollup
        template={template}
        fees={[
          fee({ paid_amount: 25, status: 'paid' }),
          fee({ paid_amount: 10, status: 'partial' }),
          fee({}),
        ]}
      />,
    );
    expect(screen.getByText('$35 / $75 collected')).toBeInTheDocument();
    expect(screen.getByText('1 / 3 paid')).toBeInTheDocument();
  });

  it('ignores fees belonging to a different template', () => {
    render(
      <FeeTemplateRollup
        template={template}
        fees={[fee({}), fee({ template_id: 'other', amount: 999 })]}
      />,
    );
    expect(screen.getByText('$0 / $25 collected')).toBeInTheDocument();
    expect(screen.getByText('0 / 1 paid')).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
//
// Regression guard for the security-critical exclusion in AuditionPage's
// anonymous submit path: the client must never send `user_id` or
// `session_id` to submitPublicIntake. The edge function supplies both
// server-side; a client-supplied `user_id` would let anyone file an
// application against another person's account (see the comment at the
// `submissionData` construction site in AuditionPage.tsx).
//
// The six wizard pages are stubbed to presentational no-ops that push valid
// values straight onto the real AuditionFormProvider form via context, then
// advance with the real `nextPage()`. That is deliberate: the thing under
// test is the real onSubmit/submitPublicIntake wiring in AuditionPage.tsx,
// not the page-specific input widgets (date pickers, camera capture, radio
// groups) already covered by auditionPages.test.ts. Everything from
// AuditionFormProvider down to the Submit button's onClick is real.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/publicIntakeClient', () => ({
  submitPublicIntake: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    isPasswordRecovery: false,
    signOut: vi.fn(),
    resetAuth: vi.fn(),
  }),
}));

vi.mock('@/components/layout/PublicLayout', () => ({
  PublicLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/audition/CongratulationsDialog', () => ({
  CongratulationsDialog: () => null,
}));

// Each stub sets the values that page is responsible for collecting, then
// advances with the real `nextPage()` from context — no gating logic is
// bypassed that matters to this test, since `nextPage()` itself performs no
// validation in the real component (the Next *button*'s disabled state is
// what gates real users, and that is deliberately not exercised here).
vi.mock('@/components/audition/pages/BasicInfoPage', async () => {
  const { useAuditionForm } = await import('@/components/audition/AuditionFormProvider');
  const { useEffect } = await import('react');
  return {
    BasicInfoPage: () => {
      const { form, nextPage } = useAuditionForm();
      useEffect(() => {
        form.setValue('firstName', 'Ada');
        form.setValue('lastName', 'Lovelace');
        form.setValue('email', 'ada@example.com');
        form.setValue('phone', '5551234567');
        nextPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="stub-basic" />;
    },
  };
});

vi.mock('@/components/audition/pages/MusicalBackgroundPage', async () => {
  const { useAuditionForm } = await import('@/components/audition/AuditionFormProvider');
  const { useEffect } = await import('react');
  return {
    MusicalBackgroundPage: () => {
      const { form, nextPage } = useAuditionForm();
      useEffect(() => {
        form.setValue('sectionType', 'vocal');
        form.setValue('isSoloist', false);
        nextPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="stub-background" />;
    },
  };
});

vi.mock('@/components/audition/pages/MusicSkillsPage', async () => {
  const { useAuditionForm } = await import('@/components/audition/AuditionFormProvider');
  const { useEffect } = await import('react');
  return {
    MusicSkillsPage: () => {
      const { form, nextPage } = useAuditionForm();
      useEffect(() => {
        form.setValue('readsMusic', true);
        nextPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="stub-skills" />;
    },
  };
});

vi.mock('@/components/audition/pages/PersonalInfoPage', async () => {
  const { useAuditionForm } = await import('@/components/audition/AuditionFormProvider');
  const { useEffect } = await import('react');
  return {
    PersonalInfoPage: () => {
      const { form, nextPage } = useAuditionForm();
      useEffect(() => {
        form.setValue(
          'personalityDescription',
          Array.from({ length: 50 }, (_, i) => `word${i}`).join(' '),
        );
        nextPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="stub-personal" />;
    },
  };
});

vi.mock('@/components/audition/pages/SchedulingAndSelfiePage', async () => {
  const { useAuditionForm } = await import('@/components/audition/AuditionFormProvider');
  const { useEffect } = await import('react');
  return {
    SchedulingAndSelfiePage: () => {
      const { form, nextPage, setCapturedImage } = useAuditionForm();
      useEffect(() => {
        form.setValue('auditionDate', new Date('2026-09-01'));
        form.setValue('auditionTime', '3:30 PM');
        form.setValue('tshirtSize', 'M');
        setCapturedImage('data:image/png;base64,fake-selfie');
        nextPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="stub-scheduling" />;
    },
  };
});

vi.mock('@/components/audition/pages/RegistrationPage', async () => {
  const { useAuditionForm } = await import('@/components/audition/AuditionFormProvider');
  const { useEffect } = await import('react');
  return {
    RegistrationPage: () => {
      const { form } = useAuditionForm();
      useEffect(() => {
        form.setValue('email', 'ada@example.com');
        form.setValue('password', 'hunter22');
        form.setValue('confirmPassword', 'hunter22');
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="stub-account" />;
    },
  };
});

import AuditionPage from '@/pages/AuditionPage';
import { submitPublicIntake } from '@/lib/publicIntakeClient';

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(submitPublicIntake).mockReset();
  vi.mocked(submitPublicIntake).mockResolvedValue({
    ok: true,
    recordId: 'app-1',
    accountStatus: 'created',
  });
});

afterEach(() => {
  cleanup();
});

describe('AuditionPage anonymous submit', () => {
  it('never sends user_id or session_id to submitPublicIntake', async () => {
    const { rerender } = render(<AuditionPage />);

    // The chained stub effects (basic -> background -> skills -> personal ->
    // scheduling) advance synchronously to the account page.
    await waitFor(() => expect(screen.getByTestId('stub-account')).toBeInTheDocument());

    // The account stub sets email/password/confirmPassword via form.setValue,
    // which react-hook-form does not treat as a reason to re-render the
    // Submit button's owner on its own (canProceed() reads getValues(), a
    // non-reactive snapshot). Force one more render pass — same as any
    // ordinary re-render this component would get in the running app — so
    // the Submit button's `disabled` prop is recomputed against the values
    // the stub just set.
    rerender(<AuditionPage />);

    const submitButtons = screen.getAllByRole('button', { name: /submit application/i });
    // Both the mobile and desktop copies must be enabled by this point.
    const enabled = submitButtons.find((btn) => !(btn as HTMLButtonElement).disabled);
    expect(enabled).toBeTruthy();

    fireEvent.click(enabled!);

    await waitFor(() => expect(submitPublicIntake).toHaveBeenCalledTimes(1));

    const callArg = vi.mocked(submitPublicIntake).mock.calls[0][0];
    expect(callArg.kind).toBe('audition');
    expect(callArg.account.email).toBe('ada@example.com');

    const application = callArg.payload.application as Record<string, unknown>;
    // The regression this guards against: a client-supplied user_id/session_id
    // would let an anonymous visitor file an application against someone
    // else's account. The edge function must be the one to attach both.
    expect(application).not.toHaveProperty('user_id');
    expect(application).not.toHaveProperty('session_id');
  });
});

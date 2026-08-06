// Ordered page model for the audition interview.
//
// This replaces a switch that carried two parallel page numberings (one for
// signed-in users, one for anonymous) and validated by page NUMBER. Adding
// the account step at the end under that scheme meant editing eight case
// labels in lockstep. Pages are identified by name here, and the order is
// data.
//
// The account step is LAST for anonymous visitors. It used to be first,
// which meant a visitor created an account before seeing a single question —
// and if email confirmation was on, signUp returned no session and the whole
// interview dead-ended at submit.

import type { AuditionFormData } from './AuditionFormProvider';

export type AuditionPageId =
  | 'basic' | 'background' | 'skills' | 'personal' | 'scheduling' | 'account';

const INTERVIEW_PAGES: AuditionPageId[] = [
  'basic', 'background', 'skills', 'personal', 'scheduling',
];

export function buildAuditionPages(isSignedIn: boolean): AuditionPageId[] {
  return isSignedIn ? [...INTERVIEW_PAGES] : [...INTERVIEW_PAGES, 'account'];
}

const MIN_PERSONALITY_WORDS = 50;
const MIN_PASSWORD_LENGTH = 8;

function wordCount(text: string | undefined | null): number {
  return (text ?? '').trim().split(/\s+/).filter(Boolean).length;
}

export function canLeavePage(
  pageId: AuditionPageId,
  values: AuditionFormData,
  ctx: { capturedImage: string | null },
): boolean {
  switch (pageId) {
    case 'basic':
      return !!(values.firstName && values.lastName && values.email && values.phone);
    case 'background':
      return !!values.sectionType;
    case 'skills':
      return true;
    case 'personal':
      return wordCount(values.personalityDescription) >= MIN_PERSONALITY_WORDS;
    case 'scheduling':
      return !!(values.auditionDate && values.auditionTime && ctx.capturedImage && values.tshirtSize);
    case 'account':
      return (
        !!values.email &&
        (values.password ?? '').length >= MIN_PASSWORD_LENGTH &&
        values.password === values.confirmPassword
      );
    default:
      return false;
  }
}

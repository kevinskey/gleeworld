// Pure helpers for the personal music library (My Music). Storage layout and
// caps per docs/superpowers/specs/2026-07-12-personal-music-library-design.md.

export const PERSONAL_SCORES_BUCKET = 'personal-scores';
export const MAX_SCORE_BYTES = 25 * 1024 * 1024;

// Path layout the bucket RLS depends on: (storage.foldername(name))[1] must
// be the user's id. Never put user-supplied filename text in the object key.
export function personalScoreUploadPath(userId: string, _fileName: string): string {
  return `${userId}/uploads/${crypto.randomUUID()}.pdf`;
}

export function validateScoreFile(file: File): string | null {
  if (file.type !== 'application/pdf') return 'Only PDF files can be added to My Music.';
  if (file.size > MAX_SCORE_BYTES) return 'PDFs must be 25 MB or smaller.';
  return null;
}

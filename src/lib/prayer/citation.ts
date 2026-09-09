// Thin re-export. The canonical implementation moved to
// supabase/functions/_shared/prayer/citation.ts as part of Phase 1 Task 4,
// so the same citation parser can be imported by both the Vite frontend and
// the Deno usccb-readings edge function without copy-pasting it (and
// drifting) between the two. See books.ts's header comment for why the
// canonical copy lives on the edge-function side rather than here.
//
// This file's own path, and citation.test.ts beside it, are unchanged so
// nothing that already imports '@/lib/prayer/citation' needs to move.
export * from '../../../supabase/functions/_shared/prayer/citation.ts';

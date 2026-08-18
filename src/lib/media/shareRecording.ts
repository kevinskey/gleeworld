// Share a Studio recording (a gw_media_library row the user owns) to a
// class, an assignment, or people by email. "Share = class copy": class
// visibility comes from a NEW row with course_id set and folder NULL,
// pointing at the SAME storage object; the private Studio-folder original
// is never mutated. Spec:
// docs/superpowers/specs/2026-08-17-studio-recording-sharing-design.md
import type { SupabaseClient } from '@supabase/supabase-js';

// Loosely typed on purpose: generated DB types don't know the new
// columns until the next types regen.
type Sb = Pick<SupabaseClient, 'from' | 'rpc' | 'functions'> | any;

export interface ShareableMedia {
  id: string;
  title: string;
  file_url: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  /**
   * Set when this row is ITSELF a class copy of another recording. Sharing a
   * copy must resolve back to the original, or you get copies of copies —
   * observed in prod 2026-08-18, where re-sharing an already-shared take
   * produced a second class row whose source was the first copy.
   */
  source_media_id?: string | null;
}

export const listenPath = (id: string) => `/listen/${id}`;

/** Find or create the class copy of a recording. Idempotent on
 *  (source_media_id, course_id) among non-deleted rows. */
export async function ensureClassCopy(
  sb: Sb, media: ShareableMedia, courseId: string,
): Promise<{ id: string }> {
  // Always hang copies off the ORIGINAL recording, never off another copy.
  const originId = media.source_media_id ?? media.id;

  const { data: existing, error: exErr } = await sb
    .from('gw_media_library')
    .select('id')
    .eq('source_media_id', originId)
    .eq('course_id', courseId)
    .eq('is_deleted', false)
    .limit(1);
  if (exErr) throw new Error(exErr.message);
  if (existing && existing.length > 0) return existing[0];

  // Column list MUST match the live schema (see plan Global Constraints).
  const { data, error } = await sb.from('gw_media_library').insert({
    title: media.title,
    file_url: media.file_url,
    file_path: media.file_path,
    file_type: media.file_type,
    file_size: media.file_size,
    folder: null,
    category: 'studio',
    is_public: false,
    is_featured: false,
    is_deleted: false,
    course_id: courseId,
    uploaded_by: media.uploaded_by,
    download_count: 0,
    view_count: 0,
    source_media_id: originId,
  }).select('id');
  if (error) throw new Error(error.message);
  // Demo-tenant writes match 0 rows silently — empty result = failure.
  if (!data || data.length === 0) throw new Error('Share could not be saved (read-only workspace?).');
  return data[0];
}

/** Grant view access on one media row to a list of emails. Re-sharing a
 *  previously revoked email reactivates it (revoked_at cleared). */
export async function createItemShares(
  sb: Sb, mediaId: string, ownerUserId: string, emails: string[],
): Promise<void> {
  const rows = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
    .map((invited_email) => ({
      media_id: mediaId, owner_user_id: ownerUserId, invited_email,
      permission: 'view', revoked_at: null,
    }));
  if (rows.length === 0) return;
  const { data, error } = await sb
    .from('gw_media_item_shares')
    .upsert(rows, { onConflict: 'media_id,invited_email' })
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('Share could not be saved (read-only workspace?).');
}

export async function fetchCourseRecipients(
  sb: Sb, courseId: string,
): Promise<Array<{ user_id: string; full_name: string | null; email: string }>> {
  const { data: enr, error } = await sb
    .from('gw_course_enrollments').select('user_id').eq('course_id', courseId);
  if (error) throw new Error(error.message);
  const ids = [...new Set((enr ?? []).map((e: any) => e.user_id).filter(Boolean))];
  if (ids.length === 0) return [];
  const { data: profs, error: pErr } = await sb
    .from('gw_profiles_directory')
    .select('user_id, full_name, email')
    .in('user_id', ids)
    .not('email', 'is', null);
  if (pErr) throw new Error(pErr.message);
  return (profs ?? []).filter((p: any) => !!p.email);
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildShareEmailHtml(o: {
  title: string; sharerName: string; message: string; url: string;
}): string {
  const msg = o.message.trim()
    ? `<p style="margin:16px 0;color:#334155;font-size:15px;line-height:1.6">${esc(o.message)}</p>`
    : '';
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <p style="color:#64748b;font-size:13px;margin:0 0 8px">${esc(o.sharerName)} shared a recording with you</p>
    <h2 style="color:#0f172a;font-size:20px;margin:0 0 4px">${esc(o.title)}</h2>
    ${msg}
    <p style="margin:24px 0">
      <a href="${esc(o.url)}" style="background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">Listen in GleeWorld</a>
    </p>
    <p style="color:#94a3b8;font-size:12px;line-height:1.5">You'll be asked to sign in. This link is for members of your organization.</p>
  </div>`;
}

/** Send via the existing gw-send-email edge fn. Multi-recipient sends are
 *  BCC-chunked server-side (recipients never see each other). Throws on
 *  invoke error so the dialog can report it. */
export async function sendShareEmail(
  sb: Sb, o: { to: string[]; subject: string; html: string },
): Promise<void> {
  const { data, error } = await sb.functions.invoke('gw-send-email', {
    body: { to: o.to, subject: o.subject, html: o.html },
  });
  if (error) throw new Error(error.message ?? 'Email send failed');
  if (data && data.error) throw new Error(String(data.error));
}

/** Best-effort in-app notifications; RPC errors are logged, never thrown
 *  (email is the primary channel — a bell failure must not fail the share). */
export async function notifyRecipients(
  sb: Sb, userIds: string[], o: { title: string; message: string; actionUrl: string },
): Promise<void> {
  for (const uid of [...new Set(userIds)].filter(Boolean)) {
    try {
      const { error } = await sb.rpc('create_notification_with_delivery', {
        p_user_id: uid,
        p_title: o.title,
        p_message: o.message,
        p_type: 'info',
        p_category: 'general',
        p_action_url: o.actionUrl,
        p_action_label: 'Listen',
        p_metadata: {},
        p_priority: 0,
        p_expires_at: null,
        p_send_email: false,
        p_send_sms: false,
      });
      if (error) console.error('[shareRecording] notification failed', uid, error);
    } catch (e) {
      console.error('[shareRecording] notification failed', uid, e);
    }
  }
}

/** Courses the user can share into: admins → all active real courses,
 *  others → courses they instruct. Mirrors user_can_manage_course (DB). */
export async function fetchManagedCourses(
  sb: Sb, userId: string, privileged: boolean,
): Promise<Array<{ id: string; course_code: string; title: string }>> {
  let q = sb.from('gw_courses')
    .select('id, course_code, title')
    .eq('is_active', true)
    .eq('is_template', false)
    .order('course_code');
  if (!privileged) q = q.eq('instructor_id', userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

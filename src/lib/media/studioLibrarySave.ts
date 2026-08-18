// One canonical "save a Studio bounce to the Media Library" path,
// replacing the two hand-copied versions in StudioEditor (sendToLibrary
// WAV + saveClipMp3ToLibrary MP3). Bucket media-library, path
// media/<uid>/studio/<ts>-<name>, row folder='Studio' (private to the
// owner under the foldered-privacy RLS). Column list MUST match the live
// gw_media_library schema — see the plan's Global Constraints.
import type { ShareableMedia } from './shareRecording';

export async function saveStudioBlobToLibrary(
  sb: any,
  userId: string,
  o: { filename: string; blob: Blob; contentType: 'audio/wav' | 'audio/mpeg' },
): Promise<ShareableMedia> {
  const path = `media/${userId}/studio/${Date.now()}-${o.filename}`;
  const { error: upErr } = await sb.storage
    .from('media-library')
    .upload(path, o.blob, { contentType: o.contentType, upsert: true });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
  const fileUrl = sb.storage.from('media-library').getPublicUrl(path).data.publicUrl;
  const title = o.filename.replace(/\.(wav|mp3)$/i, '');
  const { data, error } = await sb.from('gw_media_library').insert({
    title,
    file_url: fileUrl,
    file_path: path,
    file_type: o.contentType,
    file_size: o.blob.size,
    folder: 'Studio',
    category: 'studio',
    is_public: false,
    is_featured: false,
    is_deleted: false,
    course_id: null,
    uploaded_by: userId,
    download_count: 0,
    view_count: 0,
  } as never).select('id');
  if (error) throw new Error(`Library save failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Library save failed — row not saved (read-only workspace?).');
  return {
    id: data[0].id, title, file_url: fileUrl, file_path: path,
    file_type: o.contentType, file_size: o.blob.size, uploaded_by: userId,
  };
}

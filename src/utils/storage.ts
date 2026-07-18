import { supabase } from "@/integrations/supabase/client";

// Self-hosted Supabase Storage 1.48 writes uploads to stub/<bucket>/<name>/<uuid>
// on DO Spaces, but the public proxy reads the flat <bucket>/<name>. A daemon
// flattens the stub leaf up to the flat path every ~2s, so there's a short
// window after every upload where the URL still 404s. These helpers poll until
// the freshly-uploaded object is actually reachable.
const RETRY_DELAYS_MS = [400, 600, 800, 1200, 1800, 2500, 3500, 5000];
const READY_TIMEOUT_MS = 30000;

async function waitForUrlReachable(url: string, timeoutMs = READY_TIMEOUT_MS): Promise<boolean> {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (res.ok) return true;
    } catch { /* network error — retry */ }
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]));
    attempt += 1;
  }
  return false;
}

/**
 * Get a signed URL for accessing files in private buckets like 'sheet-music'.
 * For public buckets, use getPublicUrl() directly.
 *
 * Pass waitForReady=true right after an upload to ride out the stub→flat
 * flatten window (createSignedUrl returns NoSuchKey until the file is flat).
 */
export const getSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn: number = 3600,
  waitForReady: boolean = false,
): Promise<string | null> => {
  const attemptSign = async () => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    return { data, error };
  };

  if (!waitForReady) {
    try {
      const { data, error } = await attemptSign();
      if (error) {
        console.error(`Error creating signed URL for ${bucket}/${path}:`, error);
        return null;
      }
      return data.signedUrl;
    } catch (error) {
      console.error(`Failed to create signed URL for ${bucket}/${path}:`, error);
      return null;
    }
  }

  const start = Date.now();
  let attempt = 0;
  let lastError: unknown = null;
  while (Date.now() - start < READY_TIMEOUT_MS) {
    try {
      const { data, error } = await attemptSign();
      if (!error && data?.signedUrl) return data.signedUrl;
      lastError = error;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]));
    attempt += 1;
  }
  console.error(`Signed URL never became ready for ${bucket}/${path}:`, lastError);
  return null;
};

// Private buckets that require signed URLs. NOTE: sheet-music is publicly
// readable in storage.buckets — listing it here would force an extra
// createSignedUrl round-trip before pdfjs can start fetching, which was
// noticeably delaying the in-library PDF viewer.
// This list MUST stay in sync with storage.buckets.public = false. A private
// bucket missing here gets a getPublicUrl(), which 400s — the nginx proxy only
// serves /object/public/ for genuinely public buckets. That mismatch is what
// made personal scores unopenable: "secure download" handed back a public URL.
const PRIVATE_BUCKETS = new Set([
  'alumni-headshots',
  'budget-documents',
  'class-journals',
  'class-notes',
  'contract-documents',
  'contract-signatures',
  'excuse-documents',
  'executive-board-files',
  'hair-nail-photos',
  'id-documents',
  'karaoke-recordings',
  'marked-scores',
  'media-audio',
  'media-docs',
  'music-fundamentals',
  'performer-documents',
  'personal-scores',
  'read-music-progress',
  'receipts',
  'recordings',
  'sight-singing-recordings',
  'signed-contracts',
  'songwriting',
  'studio',
  'studio-video',
  'tour-contracts',
  'w9-forms',
  // Public in storage.buckets, but kept here deliberately: existing callers
  // rely on signed URLs for it and signing a public bucket still works.
  'user-files',
]);

/**
 * Get the appropriate URL for a file based on bucket privacy
 * Uses signed URLs for private buckets and public URLs for public buckets
 */
export const getFileUrl = async (bucket: string, path: string): Promise<string | null> => {
  if (PRIVATE_BUCKETS.has(bucket)) {
    return await getSignedUrl(bucket, path);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Upload a file to storage and return the appropriate URL
 */
export const uploadFileAndGetUrl = async (
  file: File, 
  bucket: string, 
  folder: string = '', 
  fileName?: string
): Promise<{ url: string; path: string } | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = folder ? `${folder}/${finalFileName}` : finalFileName;

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    // Wait for the freshly-uploaded object to clear the storage stub→flat gap
    // before handing the URL back. Private buckets probe via createSignedUrl
    // (NoSuchKey while stubbed); public buckets HEAD the public URL.
    let url: string | null;
    if (PRIVATE_BUCKETS.has(bucket)) {
      url = await getSignedUrl(bucket, filePath, 3600, true);
    } else {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      url = (await waitForUrlReachable(data.publicUrl)) ? data.publicUrl : null;
    }

    if (!url) {
      // Retry budget exhausted — the file is in the bucket but unreachable
      // (typically a flatten-daemon stall). Remove it so we don't leave an
      // orphan with no DB row pointing at it.
      console.error(`Upload completed but URL never became reachable for ${bucket}/${filePath} — deleting orphan`);
      await supabase.storage.from(bucket).remove([filePath]).catch(() => { /* best effort */ });
      return null;
    }

    return { url, path: filePath };
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};
import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Loader2, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

async function uploadToSiteBranding(file: File, prefix: string): Promise<string | null> {
  if (file.size > 10 * 1024 * 1024) {
    toast.error('Image must be 10 MB or smaller.');
    return null;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${prefix}-${Date.now()}.${ext}`;
  // Hard 60s ceiling on the storage upload itself — the underlying
  // fetch has no built-in timeout, so a stalled connection would
  // pin the UI at "Uploading…" forever. Race an AbortController
  // against the upload; whoever finishes first wins.
  const abortAfter = new Promise<{ error: Error }>((resolve) => {
    setTimeout(() => resolve({ error: new Error('Upload timed out after 60s — check your connection and try again.') }), 60_000);
  });
  const uploadPromise = supabase
    .storage
    .from('site-branding')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    .then((r: { error: Error | null }) => ({ error: r.error }));
  const { error } = await Promise.race([uploadPromise, abortAfter]);
  if (error) {
    const detail = (error as { statusCode?: string | number; error?: string; message: string });
    const status = detail.statusCode ?? detail.error ?? '';
    console.error('[hero-upload] failed', { status, detail });
    if (String(status) === '403' || /permission|denied|policy/i.test(detail.message)) {
      toast.error('Upload denied by permissions — sign out, sign back in, and try again. If it still fails, tell Kevin the tenant slug you\'re on.');
    } else {
      toast.error(`Upload failed (${status || 'unknown'}): ${detail.message}`);
    }
    return null;
  }
  return supabase.storage.from('site-branding').getPublicUrl(path).data.publicUrl;
}

// Self-hosted Supabase Storage 1.48 writes objects to a stub/ path that takes
// 5-10s to be flattened to the public path by a background cron. During that
// window the public URL returns 404 — so we poll the URL until it actually
// serves before handing it back. The caller keeps the local blob preview up
// the whole time, so the user never sees a broken image.
async function waitForUrlReachable(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  const delays = [400, 600, 800, 1200, 1800, 2500, 3500, 5000];
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (res.ok) return true;
    } catch { /* network error — retry */ }
    await new Promise((r) => setTimeout(r, delays[Math.min(attempt, delays.length - 1)]));
    attempt += 1;
  }
  return false;
}

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** Filename prefix (e.g. 'hero', 'logo'). */
  prefix?: string;
  /** Tailwind sizing for the preview thumbnail. Defaults to w-20 h-20. */
  thumbClass?: string;
  /** Button background color. Defaults to a neutral slate so it doesn't clash. */
  buttonColor?: string;
}

export function ImageUploadField({
  value, onChange, label = 'Image', prefix = 'image', thumbClass = 'w-20 h-20', buttonColor,
}: Props) {
  const [uploading, setUploading] = useState(false);
  // Local blob preview avoids the DO Spaces CDN propagation race that can
  // briefly 404 a just-uploaded URL and cache it as a broken image.
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  // Blob URL cleanup: track the current URL in a ref and revoke only on
  // unmount. A useEffect cleanup keyed on [localPreview] would fire under
  // React.StrictMode's double-invoke of mount effects and revoke the
  // just-created URL before the <img> tag can load it — which shows up
  // as a spurious "Couldn't load the saved image" error during upload.
  // The setLocalPreview updater below handles rotating out the previous
  // URL when a new one is picked.
  const currentBlobRef = useRef<string | null>(null);
  useEffect(() => { currentBlobRef.current = localPreview; }, [localPreview]);
  useEffect(() => () => {
    if (currentBlobRef.current) URL.revokeObjectURL(currentBlobRef.current);
  }, []);
  // When a stored URL fails to load (CDN race, deleted file, browser cached a
  // 404), fall back to the empty placeholder instead of leaving a broken-image
  // icon in the form. Reset whenever the previewSrc changes.
  const [imgError, setImgError] = useState(false);

  const previewSrc = localPreview ?? value;
  useEffect(() => { setImgError(false); }, [previewSrc]);
  // Don't surface imgError while an upload is in flight — the blob may
  // still be loading and a spurious "Couldn't load" during upload is
  // just noise. Also don't complain about blob: URLs: those come from
  // the browser itself and can't legitimately 404.
  const isBlob = previewSrc?.startsWith('blob:');
  const showImage = !!previewSrc && (uploading || isBlob || !imgError);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-3">
        {showImage ? (
          <div className="relative bg-white border border-slate-200 rounded-lg p-2 shadow-sm shrink-0">
            <img
              src={previewSrc}
              alt=""
              className={`${thumbClass} object-contain rounded`}
              onError={() => setImgError(true)}
            />
            <button
              type="button"
              onClick={() => { setLocalPreview(null); onChange(''); }}
              className="absolute -top-2 -right-2 bg-slate-900 rounded-full p-1 text-white hover:bg-slate-700"
              title="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className={`${thumbClass} bg-white border border-slate-300 border-dashed rounded-lg flex items-center justify-center text-slate-400 shrink-0`}>
            <ImageIcon className="w-7 h-7" />
          </div>
        )}
        {imgError && previewSrc && !uploading && !isBlob && (
          <p className="text-sm text-amber-700 max-w-[180px]">
            Couldn&apos;t load the saved image. Try uploading it again.
          </p>
        )}
        <label
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-opacity hover:opacity-90 whitespace-nowrap"
          // Inline `color: white` so a global button/label color override
          // (or a tenant-theme override targeting text-white) can't win
          // and leave the label unreadable on its dark background.
          style={{ backgroundColor: buttonColor || '#0f172a', color: '#ffffff' }}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading…' : previewSrc ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const blobUrl = URL.createObjectURL(file);
              setLocalPreview((old) => { if (old) URL.revokeObjectURL(old); return blobUrl; });
              // Push the blob URL through onChange immediately so the LIVE
              // preview pane (not just this form's thumbnail) shows the image
              // right away. The editor's updateConfig skips DB writes for
              // blob: URLs so this never leaks into saved state.
              onChange(blobUrl);
              setUploading(true);
              const url = await uploadToSiteBranding(file, prefix);
              if (url) {
                // Wait until the public URL actually serves (typically 5-10s
                // on self-hosted Supabase Storage 1.48 due to the stub/ → flat
                // path flatten cron), then swap blob for real URL.
                await waitForUrlReachable(url);
                onChange(url);
                // Clear the blob preview now that we have a real URL.
                // Otherwise the <img> keeps showing the blob and if the
                // blob was revoked (page nav, tab suspend, HMR replay
                // etc.) the thumbnail renders as a broken icon.
                setLocalPreview((old) => { if (old) URL.revokeObjectURL(old); return null; });
              }
              setUploading(false);
            }}
          />
        </label>
      </div>
    </div>
  );
}

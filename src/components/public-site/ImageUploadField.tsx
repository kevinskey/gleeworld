import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Upload, Loader2, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Downscale large images client-side before upload — a 4000×3000 hero
// photo can be 8 MB, taking 30 s+ over a home upload and getting cut off
// by nginx/proxy body limits. Max dimension 1920px, JPEG Q0.85; PNGs
// stay PNG if they're small enough already.
// Downscale large images client-side before upload. Max dim 1920px,
// JPEG Q0.85. Loud on console so we can see what's happening in the
// wild when uploads fail — silent shrinks make diagnostics impossible.
async function shrinkForUpload(file: File): Promise<File> {
  const startKB = Math.round(file.size / 1024);
  console.log(`[upload/shrink] input: ${file.name} · ${startKB} KB · ${file.type}`);
  if (!file.type.startsWith('image/')) {
    console.log('[upload/shrink] skipped: not an image');
    return file;
  }
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    console.log('[upload/shrink] skipped: GIF/SVG passes through');
    return file;
  }
  if (file.size < 500 * 1024) {
    console.log('[upload/shrink] skipped: under 500 KB');
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1920;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    console.log(`[upload/shrink] decoded: ${bitmap.width}×${bitmap.height} → target ${w}×${h}`);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[upload/shrink] canvas.getContext(2d) returned null; sending original');
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
    if (!blob) {
      console.warn('[upload/shrink] canvas.toBlob returned null; sending original');
      return file;
    }
    if (blob.size >= file.size) {
      console.log(`[upload/shrink] shrunk (${Math.round(blob.size / 1024)} KB) not smaller than source (${startKB} KB); sending original`);
      return file;
    }
    console.log(`[upload/shrink] output: ${Math.round(blob.size / 1024)} KB (${Math.round((1 - blob.size / file.size) * 100)}% smaller)`);
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch (err) {
    // Big camera PNGs sometimes trip createImageBitmap on Chromium; the
    // resulting fallback is the original file which is exactly the case
    // that fails to upload. Try a second decode via HTMLImageElement.
    console.warn('[upload/shrink] createImageBitmap failed, trying <img> fallback:', err);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error || new Error('FileReader failed'));
        r.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('image decode failed'));
        el.src = dataUrl;
      });
      const maxDim = 1920;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      });
      if (!blob) return file;
      console.log(`[upload/shrink] fallback output: ${Math.round(blob.size / 1024)} KB`);
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
    } catch (err2) {
      console.error('[upload/shrink] both decode paths failed; sending original:', err2);
      return file;
    }
  }
}

async function uploadToSiteBranding(file: File, prefix: string): Promise<string | null> {
  file = await shrinkForUpload(file);
  if (file.size > 10 * 1024 * 1024) {
    toast.error('Image must be 10 MB or smaller.');
    return null;
  }
  // Route through an edge fn instead of a direct browser -> storage POST.
  // The direct path was reliably failing net::ERR_TIMED_OUT for some
  // clients (ISP middleboxes / MTU issues) even for tiny (<10 KB) files.
  console.log(`[upload] reading file bytes (${file.size} bytes)…`);
  let fileBase64: string;
  try {
    // Three decode paths, tried in order. Different iCloud-Drive /
    // sandbox states break different APIs; whichever works, wins.
    //
    // 1. <img src=blob:> → canvas → toBlob. The <img> load path
    //    triggers the browser's image-loading pipeline which usually
    //    forces iCloud to materialize the file even when
    //    arrayBuffer() throws NotReadableError. Bonus: we get a clean
    //    re-encoded blob that's independent of the source file's
    //    filesystem state.
    // 2. file.arrayBuffer() — direct byte read.
    // 3. FileReader.readAsArrayBuffer() — legacy last resort.
    let bytes: Uint8Array | null = null;
    try {
      const blobUrl = URL.createObjectURL(file);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('img decode failed'));
          el.src = blobUrl;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas ctx null');
        ctx.drawImage(img, 0, 0);
        // Use JPEG for photos, PNG for anything with transparency-y
        // extensions. Doesn't matter much — edge fn accepts any image/*.
        const isPng = file.type === 'image/png' || file.name.endsWith('.png');
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob null')), isPng ? 'image/png' : 'image/jpeg', 0.9);
        });
        const buf = await blob.arrayBuffer();
        bytes = new Uint8Array(buf);
        console.log(`[upload] path 1 (img+canvas) ok: ${bytes.length} bytes`);
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    } catch (path1Err) {
      console.warn('[upload] path 1 (img+canvas) failed, trying arrayBuffer:', path1Err);
      try {
        const buf = await file.arrayBuffer();
        bytes = new Uint8Array(buf);
        console.log(`[upload] path 2 (arrayBuffer) ok: ${bytes.length} bytes`);
      } catch (path2Err) {
        console.warn('[upload] path 2 (arrayBuffer) failed, trying FileReader:', path2Err);
        bytes = await new Promise<Uint8Array>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
          r.onerror = () => reject(r.error || new Error('FileReader failed'));
          r.readAsArrayBuffer(file);
        });
        console.log(`[upload] path 3 (FileReader) ok: ${bytes.length} bytes`);
      }
    }
    // btoa can't handle large binary strings directly — chunk it.
    let bin = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    fileBase64 = btoa(bin);
  } catch (err) {
    console.error('[upload] all read paths failed:', err);
    toast.error(
      err instanceof Error && err.name === 'NotReadableError'
        ? 'macOS blocked the file read — try dragging it to Desktop first, or paste the image URL instead using the field below.'
        : `Couldn't read the file: ${err instanceof Error ? err.message : 'unknown'} — try the URL paste below.`,
    );
    return null;
  }
  console.log(`[upload] base64 ready (${fileBase64.length} chars); invoking edge fn…`);
  let invokeRes: { data: { url?: string; error?: string } | null; error: Error | null };
  try {
    invokeRes = await supabase.functions.invoke('upload-site-branding', {
      body: {
        file_base64: fileBase64,
        filename: file.name,
        prefix,
        content_type: file.type || 'image/png',
      },
    });
  } catch (err) {
    console.error('[upload] edge fn threw:', err);
    toast.error(`Upload failed (edge fn): ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
  const { data, error } = invokeRes;
  console.log('[upload] edge fn returned', { hasUrl: !!data?.url, error, data });
  if (error || !data?.url) {
    const msg = data?.error || error?.message || 'Unknown error';
    toast.error(`Upload failed: ${msg}`);
    return null;
  }
  console.log(`[upload] success: ${data.url}`);
  return data.url;
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
  // Value as it stood before the optimistic blob swap, so a failed or
  // cancelled upload can restore it instead of stranding a dead blob: URL.
  const prevValueRef = useRef<string>('');
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
              const input = e.target;
              const file = input.files?.[0];
              // Don't clear the input until AFTER we're done reading the
              // file. Chrome+macOS sometimes drops the underlying File
              // reference the instant the input clears, which trips
              // NotReadableError inside FileReader / arrayBuffer.
              if (!file) return;
              // Remember what was here before the optimistic blob swap. If
              // the upload fails we put this back — otherwise the field is
              // left pointing at a blob: URL that dies with the failure,
              // which renders as "Couldn't load the saved image" over a
              // perfectly good stored image the user can no longer see.
              const prevValue = value;
              prevValueRef.current = prevValue;
              const blobUrl = URL.createObjectURL(file);
              setLocalPreview((old) => { if (old) URL.revokeObjectURL(old); return blobUrl; });
              // Push the blob URL through onChange immediately so the LIVE
              // preview pane (not just this form's thumbnail) shows the image
              // right away. The editor's updateConfig skips DB writes for
              // blob: URLs so this never leaks into saved state.
              onChange(blobUrl);
              setUploading(true);
              try {
                const url = await uploadToSiteBranding(file, prefix);
                if (url) {
                  // Wait until the public URL actually serves (typically 5-10s
                  // on self-hosted Supabase Storage 1.48 due to the stub/ → flat
                  // path flatten cron), then swap blob for real URL.
                  await waitForUrlReachable(url);
                  onChange(url);
                  // Clear the blob preview now that we have a real URL —
                  // otherwise the <img> keeps showing the blob and if it
                  // gets revoked (page nav, tab suspend, HMR replay etc.)
                  // the thumbnail renders as a broken icon.
                  setLocalPreview((old) => { if (old) URL.revokeObjectURL(old); return null; });
                } else {
                  // uploadToSiteBranding already toasted why. Roll the field
                  // back to what it held before the optimistic blob swap.
                  setLocalPreview((old) => { if (old) URL.revokeObjectURL(old); return null; });
                  onChange(prevValue);
                }
              } catch (err) {
                // Fetch-level failure (dropped connection, nginx reject,
                // etc.). Without this catch the promise rejects, and
                // setUploading(false) never runs — user gets a stuck
                // spinner forever.
                console.error('[upload] fatal', err);
                toast.error(`Upload failed: ${err instanceof Error ? err.message : 'network error'}`);
                setLocalPreview((old) => { if (old) URL.revokeObjectURL(old); return null; });
                onChange(prevValue);
              } finally {
                setUploading(false);
                // Clear the input NOW that we're done reading the file, so
                // the user can pick the same filename again to retry after
                // a failure.
                try { input.value = ''; } catch { /* noop */ }
              }
            }}
          />
        </label>
      </div>
      {uploading && (
        <button
          type="button"
          onClick={() => {
            // Force-reset uploading state if the file path is stuck. The
            // underlying fetch/read may still resolve later but the UI
            // stops blocking the user from trying the URL path instead.
            setUploading(false);
            setLocalPreview((old) => { if (old) URL.revokeObjectURL(old); return null; });
            // Same rollback as the failure path — cancelling must not leave
            // the field holding the blob: URL of the abandoned upload.
            if (value.startsWith('blob:')) onChange(prevValueRef.current);
          }}
          className="text-xs text-slate-500 hover:text-red-600 underline"
        >
          Cancel upload
        </button>
      )}
      {/* URL path is independent of the file-upload state on purpose —
          the file upload can be stuck reading an iCloud-locked file
          while the URL path still works perfectly fine. */}
      <UrlPasteRow value={value} onChange={onChange} prefix={prefix} disabled={false} />
    </div>
  );
}

// "Or paste an image URL" — bypasses the local file picker entirely
// so a broken/iCloud-locked file, network trouble, or macOS permission
// weirdness can't block a user from setting an image. The edge fn
// FETCHES the URL server-side and stores its own copy in site-branding,
// so the storefront isn't tied to the external URL living forever.
function UrlPasteRow({ value, onChange, prefix, disabled }: {
  value: string;
  onChange: (v: string) => void;
  /** Same filename prefix the file-upload path uses — keep the two in sync. */
  prefix: string;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState('');
  const [downloading, setDownloading] = useState(false);
  const apply = async () => {
    const url = draft.trim();
    if (!url) return;
    if (!/^https:\/\//i.test(url)) {
      toast.error('Only https:// URLs are allowed.');
      return;
    }
    setDownloading(true);
    try {
      // Route through the same edge fn that handles file uploads,
      // just with source_url instead of file_base64. Edge fn downloads,
      // validates it's an image, and stores in site-branding — returns
      // our own permanent URL.
      const { data, error } = await supabase.functions.invoke('upload-site-branding', {
        body: { source_url: url, prefix },
      });
      if (error || !data?.url) {
        const msg = (data && (data as { error?: string }).error) || error?.message || 'Download failed';
        toast.error(`Download failed: ${msg}`);
        return;
      }
      onChange(data.url as string);
      setDraft('');
      toast.success('Image downloaded and set.');
    } catch (err) {
      toast.error(`Download failed: ${err instanceof Error ? err.message : 'network error'}`);
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="flex items-stretch gap-2">
      <input
        type="url"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={value ? 'Or paste a different image URL…' : 'Or paste an image URL (https://…)'}
        disabled={disabled}
        className="flex-1 min-w-0 border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white"
      />
      <button
        type="button"
        onClick={apply}
        disabled={disabled || downloading || !draft.trim()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap disabled:opacity-50"
        style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
      >
        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        {downloading ? 'Downloading…' : 'Download & use'}
      </button>
    </div>
  );
}

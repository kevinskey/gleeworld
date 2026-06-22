// Quick Cam — combined camera window + picture gallery for the current
// category. Top half is a live camera feed with a capture button; bottom
// half is the gallery grid for that category. Capture immediately uploads
// to the quick_capture_media table and the gallery refreshes.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Camera, Play, Image as ImageIcon, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  thumbnail_url?: string | null;
  created_at: string;
  title?: string | null;
  source: 'quick_capture' | 'media_library';
}
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const SLUG_TO_QUICK_CAPTURE_CATEGORY: Record<string, string> = {
  'christmas-carol-selfies': 'christmas_selfie',
  'glee-cam-pics': 'glee_cam_pic',
  'glee-cam-videos': 'glee_cam_video',
  'voice-part-recording': 'voice_part_recording',
  'execboard-video': 'exec_board_video',
};

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function GleeCamGallery() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!categorySlug) return;
    setLoading(true);

    // Category row is optional — we fall back to a friendly name derived
    // from the slug so the page still works on a fresh tenant that hasn't
    // seeded glee_cam_categories yet.
    const { data: catData } = await supabase
      .from('glee_cam_categories')
      .select('*')
      .eq('slug', categorySlug)
      .maybeSingle();
    setCategory(catData || {
      id: '',
      slug: categorySlug,
      name: slugToName(categorySlug),
      description: null,
    });

    const allItems: MediaItem[] = [];

    const quickCaptureCategory = SLUG_TO_QUICK_CAPTURE_CATEGORY[categorySlug];
    if (quickCaptureCategory) {
      const { data: quickCaptureData } = await supabase
        .from('quick_capture_media')
        .select('*')
        .eq('category', quickCaptureCategory)
        .order('created_at', { ascending: false });
      (quickCaptureData || []).forEach((item: any) => {
        allItems.push({
          id: item.id,
          file_url: item.file_url,
          file_type: item.file_type || 'image/jpeg',
          thumbnail_url: item.thumbnail_url,
          created_at: item.created_at,
          title: item.title,
          source: 'quick_capture',
        });
      });
    }

    if (catData?.id) {
      const { data: mediaLibraryData } = await supabase
        .from('gw_media_library')
        .select('*')
        .eq('glee_cam_category_id', catData.id)
        .order('created_at', { ascending: false });
      (mediaLibraryData || []).forEach((item: any) => {
        allItems.push({
          id: item.id,
          file_url: item.file_url,
          file_type: item.file_type || 'image/jpeg',
          thumbnail_url: null,
          created_at: item.created_at,
          title: item.title,
          source: 'media_library',
        });
      });
    }

    const uniqueItems = allItems.reduce((acc, item) => {
      if (!acc.find((i) => i.file_url === item.file_url)) acc.push(item);
      return acc;
    }, [] as MediaItem[]);
    uniqueItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setItems(uniqueItems);
    setLoading(false);
  }, [categorySlug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      if (deleteItem.source === 'quick_capture') {
        const { error } = await supabase.from('quick_capture_media').delete().eq('id', deleteItem.id);
        if (error) throw error;
        await supabase.from('gw_media_library').delete().eq('file_url', deleteItem.file_url);
      } else {
        const { error } = await supabase.from('gw_media_library').delete().eq('id', deleteItem.id);
        if (error) throw error;
      }
      try {
        const url = new URL(deleteItem.file_url);
        const pathParts = url.pathname.split('/quick-capture-media/');
        if (pathParts[1]) {
          await supabase.storage.from('quick-capture-media').remove([pathParts[1]]);
        }
        if (deleteItem.thumbnail_url) {
          const thumbUrl = new URL(deleteItem.thumbnail_url);
          const thumbParts = thumbUrl.pathname.split('/quick-capture-media/');
          if (thumbParts[1]) {
            await supabase.storage.from('quick-capture-media').remove([thumbParts[1]]);
          }
        }
      } catch (err) {
        console.warn('Storage cleanup warning:', err);
      }
      setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
      setDeleteItem(null);
      setSelectedItem(null);
      toast.success('Deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const captureCategory = SLUG_TO_QUICK_CAPTURE_CATEGORY[categorySlug || ''];
  if (!category) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-sans normal-case font-bold tracking-tight text-2xl leading-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{category.description}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Camera + Gallery layout */}
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Camera */}
        <div className="lg:col-span-2">
          <CameraPanel
            categoryKey={captureCategory}
            onSaved={fetchData}
          />
        </div>

        {/* Gallery */}
        <Card className={SOFT_CARD + ' lg:col-span-3'} style={SOFT_CARD_STYLE}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm">Gallery</h2>
              <span className="text-xs text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'}</span>
            </div>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <ImageIcon className="w-10 h-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Snap a photo with the camera to start the gallery.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {items.map((item) => {
                  const isVideo = item.file_type?.startsWith('video');
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="relative aspect-square overflow-hidden rounded-xl border bg-muted group hover:ring-2 hover:ring-primary transition"
                    >
                      {isVideo ? (
                        <div className="relative w-full h-full">
                          {item.thumbnail_url ? (
                            <img src={item.thumbnail_url} alt={item.title || 'Video'} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-7 h-7 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-8 h-8 text-white drop-shadow" />
                          </div>
                        </div>
                      ) : (
                        <img src={item.file_url} alt={item.title || 'Image'} className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedItem && (
            <div className="relative bg-black">
              {selectedItem.file_type?.startsWith('video') ? (
                <video src={selectedItem.file_url} controls autoPlay className="w-full max-h-[80vh]" />
              ) : (
                <img src={selectedItem.file_url} alt={selectedItem.title || 'Image'} className="w-full max-h-[80vh] object-contain" />
              )}
              <button
                onClick={() => setDeleteItem(selectedItem)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this {deleteItem?.file_type?.startsWith('video') ? 'video' : 'image'}?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Camera panel ────────────────────────────────────────────────────────

function CameraPanel({
  categoryKey, onSaved,
}: {
  categoryKey?: string;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      }).catch(() => navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      }));
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsStreaming(true);
    } catch (e: any) {
      setError(e?.message || 'Camera unavailable.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const capture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !user) return;
    setIsCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('blob_failed')), 'image/jpeg', 0.85);
      });

      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `${user.id}/${stamp}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('quick-capture-media')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('quick-capture-media').getPublicUrl(fileName);
      const fileUrl = urlData.publicUrl;

      const { error: insErr } = await supabase
        .from('quick_capture_media')
        .insert({
          user_id: user.id,
          category: categoryKey || 'glee_cam_pic',
          file_url: fileUrl,
          file_type: 'image/jpeg',
          file_size: blob.size,
          title: `Quick Capture ${new Date().toLocaleString()}`,
        });
      if (insErr) throw insErr;

      toast.success('Saved to gallery');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Capture failed');
    } finally {
      setIsCapturing(false);
    }
  }, [user, categoryKey, onSaved]);

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 inline-flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold leading-tight">Camera</h2>
            <p className="text-xs text-muted-foreground">Snap a photo — it lands in the gallery instantly.</p>
          </div>
        </div>

        <div className="relative aspect-[4/3] bg-slate-900 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isStreaming && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Starting camera…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-sm p-4 text-center">
              <Camera className="w-7 h-7 mb-1.5 opacity-60" />
              <p>{error}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={startCamera}>
                Try again
              </Button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <Button
          onClick={capture}
          disabled={!isStreaming || isCapturing}
          className="w-full font-semibold"
          size="lg"
        >
          {isCapturing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
          {isCapturing ? 'Saving…' : 'Capture'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Friendly fallback when glee_cam_categories has no row for this slug —
// e.g. "glee-cam-pics" → "Glee Cam Pics".
function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

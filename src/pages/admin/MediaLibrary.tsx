import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Music, Image, Video, Upload, FileText, ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MediaItem {
  id: string;
  file_url: string | null;
  filename?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  file_type?: string | null;
  category?: string | null;
  created_at?: string | null;
}

const MIME_TO_KIND = (mime?: string | null, fallback?: string | null) => {
  if (!mime && fallback) return fallback;
  if (!mime) return 'other';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.includes('pdf')) return 'pdf';
  return 'other';
};

const MediaLibrary = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeKind, setActiveKind] = useState<'all'|'image'|'audio'|'video'|'pdf'|'other'>('all');
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        file_url: r.file_url ?? null,
        filename: r.filename ?? r.original_filename ?? (r.file_path ? String(r.file_path).split('/').pop() : null),
        original_filename: r.original_filename ?? null,
        mime_type: r.mime_type ?? null,
        file_type: r.file_type ?? null,
        category: r.category ?? null,
        created_at: r.created_at ?? null,
      }));
      setItems(mapped);
    } catch (e) {
      console.error('Failed to load media:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter(i => {
      const kind = MIME_TO_KIND(i.mime_type, i.file_type);
      const matchesKind = activeKind === 'all' ? true : kind === activeKind;
      const matchesQuery = !q || [i.filename, i.original_filename, i.category]
        .filter(Boolean)
        .some(v => (v as string).toLowerCase().includes(q));
      return matchesKind && matchesQuery;
    });
  }, [items, activeKind, query]);

  const onUploadClick = () => fileInputRef.current?.click();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const date = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const ymd = `${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}`;
      const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
      const filePath = `${user.id}/${ymd}-${crypto.randomUUID()}-${safeName}`;

      // 1) Upload to storage bucket 'service-images' (already in project)
      const { data: upRes, error: upErr } = await supabase.storage
        .from('service-images')
        .upload(filePath, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;

      // 2) Record in media library via RPC (keeps DB consistent and URL public)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('upload_service_image', {
        p_filename: safeName,
        p_original_filename: file.name,
        p_file_path: filePath,
        p_file_size: file.size,
        p_mime_type: file.type,
        p_description: null,
      });
      if (rpcErr) throw rpcErr;

      await fetchItems();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Media Library</h1>
            <p className="text-muted-foreground">Manage images, audio, videos, and documents</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
            <Button onClick={onUploadClick} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? 'Uploading...' : 'Upload Media'}
            </Button>
          </div>
        </div>

        <Card className="bg-background/50 border-border">
          <CardHeader>
            <CardTitle className="text-lg">Browse</CardTitle>
            <CardDescription>Filter by type or search by filename/category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
              <Tabs value={activeKind} onValueChange={(v) => setActiveKind(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="image">Images</TabsTrigger>
                  <TabsTrigger value="audio">Audio</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                  <TabsTrigger value="pdf">PDF</TabsTrigger>
                  <TabsTrigger value="other">Other</TabsTrigger>
                </TabsList>
              </Tabs>
              <Input placeholder="Search..." value={query} onChange={(e) => setQuery(e.target.value)} className="md:max-w-sm" />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((m) => {
                  const kind = MIME_TO_KIND(m.mime_type, m.file_type);
                  return (
                    <Card key={m.id} className="overflow-hidden border-border bg-background/40">
                      <CardContent className="p-0">
                        <div className="aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
                          {kind === 'image' && m.file_url ? (
                            <img src={m.file_url} alt={m.filename || 'media'} className="w-full h-full object-cover" loading="lazy" />
                          ) : kind === 'audio' ? (
                            <div className="flex items-center gap-2 text-muted-foreground"><Music className="h-5 w-5" /> Audio</div>
                          ) : kind === 'video' ? (
                            <div className="flex items-center gap-2 text-muted-foreground"><Video className="h-5 w-5" /> Video</div>
                          ) : kind === 'pdf' ? (
                            <div className="flex items-center gap-2 text-muted-foreground"><FileText className="h-5 w-5" /> PDF</div>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground"><FileText className="h-5 w-5" /> File</div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate font-medium text-sm" title={m.original_filename || m.filename || ''}>
                              {m.original_filename || m.filename}
                            </div>
                            {m.category && <Badge variant="outline" className="text-xs">{m.category}</Badge>}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{kind.toUpperCase()}</span>
                            {m.file_url && (
                              <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1 text-primary hover:underline">
                                View <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-sm text-muted-foreground">No media found. Try a different filter or upload new media.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MediaLibrary;
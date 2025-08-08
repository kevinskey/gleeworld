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
import { Document as PdfDocument, Page as PdfPage, pdfjs } from 'react-pdf';
(pdfjs as any).GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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
  const [activeKind, setActiveKind] = useState<'all'|'image'|'audio'|'video'|'pdf'|'documents'|'other'>('all');
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
    const isDoc = (i: MediaItem) => {
      const mt = (i.mime_type || '').toLowerCase();
      const cat = (i.category || '').toLowerCase();
      const ft = (i.file_type || '').toLowerCase();
      return mt.includes('pdf') || mt.includes('msword') || mt.includes('officedocument') || ft === 'document' || cat.includes('document');
    };
    return items.filter(i => {
      const kind = MIME_TO_KIND(i.mime_type, i.file_type);
      const matchesKind = activeKind === 'all'
        ? true
        : activeKind === 'documents'
          ? isDoc(i)
          : kind === activeKind;
      const matchesQuery = !q || [i.filename, i.original_filename, i.category]
        .filter(Boolean)
        .some(v => (v as string).toLowerCase().includes(q));
      return matchesKind && matchesQuery;
    });
  }, [items, activeKind, query]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedItem = useMemo(() => filtered.find(i => i.id === selectedId) || null, [filtered, selectedId]);

  useEffect(() => {
    if (!selectedId && filtered.length) {
      setSelectedId(filtered[0].id);
    } else if (selectedId && !filtered.some(i => i.id === selectedId) && filtered.length) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

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
                  <TabsTrigger value="documents">Documents</TabsTrigger>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 border border-border rounded-md bg-background/40 max-h-[70vh] overflow-y-auto divide-y divide-border/60">
                  {filtered.map((m) => {
                    const kind = MIME_TO_KIND(m.mime_type, m.file_type);
                    const active = m.id === selectedId;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2 ${active ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
                      >
                        {kind === 'image' ? (
                          <Image className="h-4 w-4 text-primary" />
                        ) : kind === 'audio' ? (
                          <Music className="h-4 w-4 text-primary" />
                        ) : kind === 'video' ? (
                          <Video className="h-4 w-4 text-primary" />
                        ) : kind === 'pdf' ? (
                          <FileText className="h-4 w-4 text-primary" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium">{m.original_filename || m.filename}</div>
                          <div className="text-xs text-muted-foreground">{(kind || 'file').toUpperCase()}</div>
                        </div>
                        {m.category && <Badge variant="outline" className="text-[10px]">{m.category}</Badge>}
                      </button>
                    );
                  })}
                </div>
                <div className="lg:col-span-2 border border-border rounded-md bg-background/40 min-h-[50vh] p-3">
                  {!selectedItem ? (
                    <div className="text-sm text-muted-foreground">Select an item from the list to preview.</div>
                  ) : (
                    (() => {
                      const kind = MIME_TO_KIND(selectedItem.mime_type, selectedItem.file_type);
                      const isPdf = (selectedItem.mime_type || '').toLowerCase().includes('pdf');
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium truncate" title={selectedItem.original_filename || selectedItem.filename || ''}>
                              {selectedItem.original_filename || selectedItem.filename}
                            </div>
                            {selectedItem.file_url && (
                              <a href={selectedItem.file_url} target="_blank" rel="noopener noreferrer" className="text-sm inline-flex items-center gap-1 text-primary hover:underline">
                                Open <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          <div className="w-full">
                            {kind === 'image' && selectedItem.file_url ? (
                              <img src={selectedItem.file_url} alt={selectedItem.filename || 'media'} className="w-full max-h-[70vh] object-contain" />
                            ) : kind === 'audio' && selectedItem.file_url ? (
                              <audio controls className="w-full">
                                <source src={selectedItem.file_url} />
                                Your browser does not support the audio element.
                              </audio>
                            ) : kind === 'video' && selectedItem.file_url ? (
                              <video controls className="w-full max-h-[70vh]">
                                <source src={selectedItem.file_url} />
                                Your browser does not support the video tag.
                              </video>
                            ) : (kind === 'pdf' || isPdf) && selectedItem.file_url ? (
                              <div className="w-full flex justify-center">
                                <PdfDocument file={selectedItem.file_url} loading={<div className="text-sm text-muted-foreground">Loading PDF...</div>}>
                                  <PdfPage pageNumber={1} width={800} />
                                </PdfDocument>
                              </div>
                            ) : selectedItem.file_url ? (
                              <div className="text-sm text-muted-foreground">Preview not available. Use the Open link above to view or download.</div>
                            ) : (
                              <div className="text-sm text-muted-foreground">No file URL available.</div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MediaLibrary;
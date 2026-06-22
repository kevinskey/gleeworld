// Resources panel that expands under a module card in the Modules tab.
// Teachers can add four kinds of resource to a module:
//   • text  — rich-text content (Tiptap, Word-like toolbar)
//   • image — uploaded to the site-branding bucket, shown inline
//   • link  — external URL with optional title + description
//   • pdf   — uploaded PDF, opens in new tab
//
// All resources persist to gw_course_module_resources. The same row schema
// supports every type via (resource_type, resource_url, description).
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Image as ImageIcon, Link as LinkIcon, FileType,
  Plus, Loader2, Trash2, ExternalLink,
} from 'lucide-react';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { ConfirmDeleteButton } from '@/components/shared/ConfirmDeleteButton';

interface Resource {
  id: string;
  module_id: string;
  course_id: string;
  title: string | null;
  description: string | null;
  resource_type: string;
  resource_url: string | null;
  display_order: number;
}

interface Props {
  moduleId: string;
  courseId: string;
  canEdit: boolean;
}

type AddType = 'text' | 'image' | 'link' | 'pdf' | null;

async function uploadToCourseBucket(file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const { error } = await supabase
    .storage
    .from('site-branding')
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) return null;
  return supabase.storage.from('site-branding').getPublicUrl(path).data.publicUrl;
}

// Poll the URL until it's reachable — same pattern as ImageUploadField for
// the Storage 1.48 stub→flat propagation gap.
async function waitForReachable(url: string, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  const delays = [400, 600, 800, 1200, 1800, 2500, 3500, 5000];
  let i = 0;
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (r.ok) return true;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, delays[Math.min(i++, delays.length - 1)]));
  }
  return false;
}

export function ModuleResources({ moduleId, courseId, canEdit }: Props) {
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [addType, setAddType] = useState<AddType>(null);

  // Add-form state (shared across types — we reset on type switch).
  const [title, setTitle] = useState('');
  const [textHtml, setTextHtml] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let c = false;
    supabase
      .from('gw_course_module_resources')
      .select('id, module_id, course_id, title, description, resource_type, resource_url, display_order')
      .eq('module_id', moduleId)
      .order('display_order', { ascending: true })
      .then(({ data }) => { if (!c) { setResources(data || []); setLoading(false); } });
    return () => { c = true; };
  }, [moduleId]);

  function reset() {
    setAddType(null);
    setTitle('');
    setTextHtml('');
    setUrl('');
    setDescription('');
  }

  async function addText() {
    if (!title.trim() && !textHtml.trim()) {
      toast({ title: 'Add a title or content first', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('gw_course_module_resources')
      .insert({
        module_id: moduleId, course_id: courseId,
        title: title.trim() || 'Text',
        description: textHtml,
        resource_type: 'text',
        display_order: resources.length,
      })
      .select('id, module_id, course_id, title, description, resource_type, resource_url, display_order')
      .single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Couldn't save text", description: error?.message, variant: 'destructive' });
      return;
    }
    setResources((prev) => [...prev, data]);
    reset();
  }

  async function addLink() {
    if (!url.trim()) {
      toast({ title: 'Paste a URL', variant: 'destructive' });
      return;
    }
    const finalUrl = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    setSaving(true);
    const { data, error } = await supabase
      .from('gw_course_module_resources')
      .insert({
        module_id: moduleId, course_id: courseId,
        title: title.trim() || finalUrl,
        description: description.trim() || null,
        resource_type: 'link',
        resource_url: finalUrl,
        display_order: resources.length,
      })
      .select('id, module_id, course_id, title, description, resource_type, resource_url, display_order')
      .single();
    setSaving(false);
    if (error || !data) {
      toast({ title: "Couldn't add link", description: error?.message, variant: 'destructive' });
      return;
    }
    setResources((prev) => [...prev, data]);
    reset();
  }

  async function addFile(file: File, kind: 'image' | 'pdf') {
    const limitMb = kind === 'image' ? 10 : 50;
    if (file.size > limitMb * 1024 * 1024) {
      toast({ title: `File must be ${limitMb} MB or smaller`, variant: 'destructive' });
      return;
    }
    setUploading(true);
    const uploaded = await uploadToCourseBucket(file, `module-${kind}`);
    if (!uploaded) {
      setUploading(false);
      toast({ title: 'Upload failed', variant: 'destructive' });
      return;
    }
    await waitForReachable(uploaded);
    const { data, error } = await supabase
      .from('gw_course_module_resources')
      .insert({
        module_id: moduleId, course_id: courseId,
        title: title.trim() || file.name,
        description: description.trim() || null,
        resource_type: kind,
        resource_url: uploaded,
        display_order: resources.length,
      })
      .select('id, module_id, course_id, title, description, resource_type, resource_url, display_order')
      .single();
    setUploading(false);
    if (error || !data) {
      toast({ title: `Couldn't add ${kind}`, description: error?.message, variant: 'destructive' });
      return;
    }
    setResources((prev) => [...prev, data]);
    reset();
  }

  async function removeResource(id: string) {
    setResources((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from('gw_course_module_resources').delete().eq('id', id);
    if (error) toast({ title: "Couldn't delete", description: error.message, variant: 'destructive' });
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-center text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin inline-block" /></div>
      ) : (
        <ul className="space-y-2">
          {resources.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-card p-3 group relative">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground">
                  {r.resource_type === 'text' && <FileText className="w-4 h-4" />}
                  {r.resource_type === 'image' && <ImageIcon className="w-4 h-4" />}
                  {r.resource_type === 'link' && <LinkIcon className="w-4 h-4" />}
                  {r.resource_type === 'pdf' && <FileType className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{r.title || r.resource_type}</span>
                    <Badge variant="outline" className="text-xs uppercase">{r.resource_type}</Badge>
                  </div>
                  {r.resource_type === 'text' && r.description && (
                    <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: r.description }} />
                  )}
                  {r.resource_type === 'image' && r.resource_url && (
                    <img src={r.resource_url} alt={r.title || ''} className="max-w-md max-h-64 rounded-md mt-1" />
                  )}
                  {r.resource_type === 'link' && r.resource_url && (
                    <a href={r.resource_url} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-primary underline inline-flex items-center gap-1">
                      {r.resource_url} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {r.resource_type === 'pdf' && r.resource_url && (
                    <a href={r.resource_url} target="_blank" rel="noopener noreferrer"
                       className="text-sm text-primary underline inline-flex items-center gap-1">
                      Open PDF <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {(r.resource_type === 'image' || r.resource_type === 'link' || r.resource_type === 'pdf') && r.description && (
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                  )}
                </div>
                {canEdit && (
                  <ConfirmDeleteButton
                    confirmKey="remove-module-resource"
                    title="Remove this resource?"
                    description="The resource will be unlinked from this module."
                    onConfirm={() => removeResource(r.id)}
                    confirmLabel="Remove"
                    ariaLabel="Delete resource"
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </ConfirmDeleteButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canEdit && addType === null && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button size="sm" variant="outline" onClick={() => setAddType('text')}>
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Text
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddType('image')}>
            <ImageIcon className="w-3.5 h-3.5 mr-1.5" /> Image
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddType('link')}>
            <LinkIcon className="w-3.5 h-3.5 mr-1.5" /> Link
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddType('pdf')}>
            <FileType className="w-3.5 h-3.5 mr-1.5" /> PDF
          </Button>
        </div>
      )}

      {canEdit && addType && (
        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              Add {addType}
            </span>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>

          <Input value={title} onChange={(e) => setTitle(e.target.value)}
                 placeholder={addType === 'text' ? 'Section title (optional)'
                            : addType === 'link' ? 'Link title (optional)'
                            : addType === 'image' ? 'Caption (optional)'
                            : 'Title (optional)'} />

          {addType === 'text' && (
            <RichTextEditor value={textHtml} onChange={setTextHtml} placeholder="Start writing…" />
          )}

          {addType === 'link' && (
            <>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com or paste any URL" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description / note" />
            </>
          )}

          {(addType === 'image' || addType === 'pdf') && (
            <>
              <Input
                type="file"
                accept={addType === 'image' ? 'image/*' : 'application/pdf'}
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) addFile(f, addType);
                }}
              />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              <p className="text-sm text-muted-foreground">
                {addType === 'image' ? 'Max 10 MB. PNG / JPG / GIF / WebP.' : 'Max 50 MB. PDF only.'}
              </p>
            </>
          )}

          {(addType === 'text' || addType === 'link') && (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={reset} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={addType === 'text' ? addText : addLink} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
                Add {addType}
              </Button>
            </div>
          )}
          {(addType === 'image' || addType === 'pdf') && uploading && (
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

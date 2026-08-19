import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, UploadCloud } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useMyPartner, useCreatePartnerScore } from '@/lib/partner/api';

const MASTER_BUCKET = 'partner-scores-master';

export default function PartnerScoreUpload() {
  const { data: partner } = useMyPartner();
  const navigate = useNavigate();
  const create = useCreatePartnerScore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', composer: '', arranger: '', voicing: '',
    ensemble_type: '', difficulty_grade: '',
    description: '', tags: '', price: '5.00',
  });

  if (!partner) return null;

  const upload = async (file: File) => {
    if (file.type !== 'application/pdf') { toast.error('PDF only'); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error('Max 50 MB'); return; }
    setUploading(true);
    const id = crypto.randomUUID();
    const path = `${partner.id}/${id}.pdf`;
    const { error } = await supabase.storage.from(MASTER_BUCKET).upload(path, file, { contentType: 'application/pdf' });
    setUploading(false);
    if (error) { toast.error(`Upload failed: ${error.message}`); return; }
    setUploadedPath(path);
    if (!form.title) setForm(f => ({ ...f, title: file.name.replace(/\.pdf$/i, '') }));
  };

  const save = () => {
    if (!uploadedPath) { toast.error('Upload a PDF first'); return; }
    const priceCents = Math.round(parseFloat(form.price || '0') * 100);
    if (!(priceCents >= 100 && priceCents <= 5000)) { toast.error('Price must be $1–$50'); return; }
    create.mutate({
      title: form.title.trim(),
      composer: form.composer.trim() || null,
      arranger: form.arranger.trim() || null,
      voicing: form.voicing.trim() || null,
      ensemble_type: form.ensemble_type || null,
      difficulty_grade: form.difficulty_grade.trim() || null,
      description: form.description.trim() || null,
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      price_cents: priceCents,
      master_storage_path: uploadedPath,
    }, {
      onSuccess: () => { toast.success('Draft saved'); navigate('/partner/scores'); },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
                 onChange={(e) => e.target.files && upload(e.target.files[0])} />
          {!uploadedPath ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <UploadCloud className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm">Upload the clean PDF of your score.</p>
              <p className="text-xs text-muted-foreground mb-3">Max 50 MB · will not be publicly served</p>
              <Button disabled={uploading} onClick={() => inputRef.current?.click()}>
                {uploading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Choose PDF
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Uploaded: {uploadedPath.split('/').pop()}</div>
          )}
        </div>

        {uploadedPath && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label htmlFor="ps-title" className="text-xs">Title *</Label>
                <Input id="ps-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-composer" className="text-xs">Composer</Label>
                <Input id="ps-composer" value={form.composer} onChange={(e) => setForm({ ...form, composer: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-arranger" className="text-xs">Arranger</Label>
                <Input id="ps-arranger" value={form.arranger} onChange={(e) => setForm({ ...form, arranger: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-voicing" className="text-xs">Voicing</Label>
                <Input id="ps-voicing" value={form.voicing} onChange={(e) => setForm({ ...form, voicing: e.target.value })} placeholder="SATB" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ensemble</Label>
                <Select value={form.ensemble_type} onValueChange={(v) => setForm({ ...form, ensemble_type: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="choral">Choral</SelectItem>
                    <SelectItem value="band">Band</SelectItem>
                    <SelectItem value="orchestra">Orchestra</SelectItem>
                    <SelectItem value="chamber">Chamber</SelectItem>
                    <SelectItem value="solo">Solo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-grade" className="text-xs">Difficulty</Label>
                <Input id="ps-grade" value={form.difficulty_grade} onChange={(e) => setForm({ ...form, difficulty_grade: e.target.value })} placeholder="Grade 3" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ps-price" className="text-xs">Price (USD)</Label>
                <Input id="ps-price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="ps-desc" className="text-xs">Description</Label>
                <Textarea id="ps-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="ps-tags" className="text-xs">Tags (comma-separated)</Label>
                <Input id="ps-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="christmas, easter, gospel" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">You'll take home 50% of every sale after platform fee.</p>
            <Button disabled={create.isPending || !form.title.trim()} onClick={save}>
              Save as draft
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

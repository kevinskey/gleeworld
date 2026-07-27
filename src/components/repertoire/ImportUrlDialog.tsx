import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Parsed {
  title: string | null;
  composer: string | null;
  publisher: string | null;
  voicing: string | null;
  ensemble_type: string | null;
  list_price_cents: number | null;
  currency: string | null;
  thumbnail_url: string | null;
  audio_preview_url: string | null;
  source_page_url: string;
  product_url: string | null;
}

interface FetchResponse {
  ok: boolean;
  fetch_ok: boolean;
  source: string;
  source_id: string;
  parsed: Parsed;
  hint: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_PARSED: Parsed = {
  title: null, composer: null, publisher: null, voicing: null, ensemble_type: null,
  list_price_cents: null, currency: null, thumbnail_url: null, audio_preview_url: null,
  source_page_url: '', product_url: null,
};

export function ImportUrlDialog({ open, onOpenChange }: Props) {
  const [step, setStep] = useState<'url' | 'review'>('url');
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<string>('external');
  const [sourceId, setSourceId] = useState<string>('');
  const [hint, setHint] = useState<string>('');
  const [form, setForm] = useState<Parsed>(EMPTY_PARSED);

  const reset = () => {
    setStep('url'); setUrl(''); setFetching(false); setSaving(false);
    setSource('external'); setSourceId(''); setHint(''); setForm(EMPTY_PARSED);
  };

  const handleFetch = async () => {
    if (!url.trim()) return;
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke<FetchResponse>('ext-import-url', {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (!data) throw new Error('Empty response');
      setSource(data.source);
      setSourceId(data.source_id);
      setHint(data.hint || '');
      setForm({ ...data.parsed, source_page_url: data.parsed.source_page_url || url.trim() });
      setStep('review');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couldn't fetch: ${msg}. Enter details manually.`);
      setForm({ ...EMPTY_PARSED, source_page_url: url.trim() });
      setSourceId(`external:${url.trim()}`.slice(0, 200));
      setStep('review');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!form.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('ext_catalog_items').insert({
        source, source_id: sourceId,
        title: form.title.trim(),
        composer: form.composer?.trim() || null,
        publisher: form.publisher?.trim() || null,
        voicing: form.voicing?.trim() || null,
        ensemble_type: form.ensemble_type || null,
        list_price_cents: form.list_price_cents,
        currency: form.currency,
        source_page_url: form.source_page_url,
        product_url: form.product_url || form.source_page_url,
        thumbnail_url: form.thumbnail_url || null,
        audio_preview_url: form.audio_preview_url || null,
      });
      if (error) {
        if (error.code === '23505') {
          toast.info(`This URL is already imported`);
          onOpenChange(false); reset();
          return;
        }
        // RLS: only super-admins can INSERT to ext_catalog_items. Message it.
        if (error.code === '42501' || (error.message ?? '').toLowerCase().includes('policy')) {
          toast.error('Only admins can import to the shared catalog. Ask a platform admin.');
          return;
        }
        throw error;
      }
      toast.success(`Imported "${form.title}"`);
      onOpenChange(false); reset();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Import failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof Parsed>(k: K, v: Parsed[K]) => setForm({ ...form, [k]: v });
  const priceText = form.list_price_cents != null ? (form.list_price_cents / 100).toFixed(2) : '';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from a URL</DialogTitle>
        </DialogHeader>

        {step === 'url' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Paste a link to a piece on JW Pepper, Sheet Music Plus, Musicnotes, or any product page. We'll pull what we can and let you fill in the rest.
            </p>
            <div className="space-y-1">
              <Label htmlFor="ie-url" className="text-xs">URL</Label>
              <Input
                id="ie-url"
                type="url"
                placeholder="https://www.jwpepper.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={fetching || !url.trim()} onClick={handleFetch}>
                {fetching && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Fetch
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-3">
            {hint && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">{hint}</p>}
            <div className="text-xs text-muted-foreground">
              Source: <span className="font-medium">{source}</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ie-title" className="text-xs">Title *</Label>
                <Input id="ie-title" value={form.title ?? ''} onChange={(e) => setField('title', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="ie-composer" className="text-xs">Composer</Label>
                  <Input id="ie-composer" value={form.composer ?? ''} onChange={(e) => setField('composer', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ie-publisher" className="text-xs">Publisher</Label>
                  <Input id="ie-publisher" value={form.publisher ?? ''} onChange={(e) => setField('publisher', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="ie-voicing" className="text-xs">Voicing</Label>
                  <Input id="ie-voicing" value={form.voicing ?? ''} onChange={(e) => setField('voicing', e.target.value)} placeholder="SATB" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ie-ensemble" className="text-xs">Ensemble</Label>
                  <Select value={form.ensemble_type ?? ''} onValueChange={(v) => setField('ensemble_type', v || null)}>
                    <SelectTrigger id="ie-ensemble"><SelectValue placeholder="—" /></SelectTrigger>
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
                  <Label htmlFor="ie-price" className="text-xs">Price (USD)</Label>
                  <Input
                    id="ie-price"
                    type="number"
                    step="0.01"
                    value={priceText}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setForm({
                        ...form,
                        list_price_cents: isNaN(val) ? null : Math.round(val * 100),
                        currency: isNaN(val) ? null : (form.currency || 'USD'),
                      });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ie-thumb" className="text-xs">Thumbnail URL</Label>
                <Input id="ie-thumb" value={form.thumbnail_url ?? ''} onChange={(e) => setField('thumbnail_url', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ie-page" className="text-xs">Source page URL *</Label>
                <Input id="ie-page" value={form.source_page_url} onChange={(e) => setField('source_page_url', e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('url')}>Back</Button>
              <Button disabled={saving || !form.title?.trim()} onClick={handleSave}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Import
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

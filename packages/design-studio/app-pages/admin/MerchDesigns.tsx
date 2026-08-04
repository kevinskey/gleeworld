import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Send, Trash2, Info, Package, RefreshCw } from 'lucide-react';

type DesignStatus = 'draft' | 'approved' | 'published' | 'archived';

interface DesignRow {
  id: string;
  name: string;
  tb_product_id: string;
  status: DesignStatus;
  updated_at: string;
  thumbnail_ref: string | null;
}

interface Blank {
  tb_product_id: string;
  name: string;
  base_cost: number;
}

interface Campaign {
  id: string;
  name: string;
  slug: string;
}

const statusMeta: Record<DesignStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  draft:     { label: 'Draft',     variant: 'secondary' },
  approved:  { label: 'Approved',  variant: 'secondary' },
  published: { label: 'Published', variant: 'default' },
  archived:  { label: 'Archived',  variant: 'destructive' },
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export const MerchDesigns = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState<DesignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [publishing, setPublishing] = useState<DesignRow | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gw_merch_designs')
      .select('id, name, tb_product_id, status, updated_at, thumbnail_ref')
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Could not load designs', description: error.message, variant: 'destructive' });
    }
    setRows((data ?? []) as DesignRow[]);
    setLoading(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this design? Any published storefront items linked to it will keep working, but this design will no longer be editable.')) return;
    const { error } = await supabase.from('gw_merch_designs').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Design deleted' });
      load();
    }
  };

  const syncCatalog = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke('ss-catalog-sync', { body: {} });
    setSyncing(false);
    if (error) {
      toast({ title: 'Sync failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Catalog synced', description: `${data?.upserted ?? 0} blank(s) refreshed` });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" /> Merch designs
          </h1>
          <p className="text-sm text-muted-foreground">
            Design something in the studio, then publish it to your storefront at <code className="text-xs">/merch/&lt;slug&gt;</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncCatalog} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync catalog'}
          </Button>
          <Button onClick={() => navigate('/admin/merch/designs/new')}>
            <Plus className="w-4 h-4 mr-2" /> New design
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="mt-4 font-medium">No designs yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Design something in the studio, then publish it to your storefront.
            </p>
            <Button className="mt-4" onClick={() => navigate('/admin/merch/designs/new')}>
              <Plus className="w-4 h-4 mr-2" /> Create your first design
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-semibold">{rows.length} design{rows.length === 1 ? '' : 's'}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2">Design</th>
                  <th className="text-left px-4 py-2">Blank</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Updated</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = statusMeta[r.status];
                  return (
                    <tr key={r.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.thumbnail_ref ? (
                            <img src={r.thumbnail_ref} alt="" className="w-10 h-10 rounded object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <Package className="w-4 h-4 text-muted-foreground/50" />
                            </div>
                          )}
                          <Link to={`/admin/merch/designs/${r.id}`} className="font-medium hover:underline">
                            {r.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <code className="text-xs">{r.tb_product_id}</code>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(r.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/merch/designs/${r.id}`)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setPublishing(r)}>
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {publishing && (
        <PublishDialog
          design={publishing}
          onClose={() => setPublishing(null)}
          onPublished={() => { setPublishing(null); load(); }}
        />
      )}
    </div>
  );
};

const DEFAULT_VARIANTS = { sizes: ['S', 'M', 'L', 'XL', '2XL'], colors: ['Black', 'White'] };

function PublishDialog({
  design,
  onClose,
  onPublished,
}: {
  design: DesignRow;
  onClose: () => void;
  onPublished: () => void;
}) {
  const { toast } = useToast();
  const [blank, setBlank] = useState<Blank | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [feePct, setFeePct] = useState(0);
  const [feeFlatCents, setFeeFlatCents] = useState(0);

  const [title, setTitle] = useState(design.name);
  const [slug, setSlug] = useState(slugify(design.name));
  const [description, setDescription] = useState('');
  const [retail, setRetail] = useState('');
  const [variantsJson, setVariantsJson] = useState(JSON.stringify(DEFAULT_VARIANTS, null, 2));
  const [campaignId, setCampaignId] = useState<string>('__none');
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: cs }, { data: settings }] = await Promise.all([
        supabase.from('gw_merch_products')
          .select('tb_product_id, name, base_cost')
          .eq('tb_product_id', design.tb_product_id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase.from('gw_merch_campaigns')
          .select('id, name, slug')
          .eq('is_active', true)
          .order('name'),
        supabase.from('gw_store_settings')
          .select('merch_platform_fee_pct, merch_platform_fee_flat_cents')
          .eq('id', 1)
          .maybeSingle(),
      ]);
      setBlank((b as Blank) ?? null);
      setCampaigns((cs as Campaign[]) ?? []);
      setFeePct(Number(settings?.merch_platform_fee_pct ?? 0));
      setFeeFlatCents(Number(settings?.merch_platform_fee_flat_cents ?? 0));
    })();
  }, [design.tb_product_id]);

  const retailNum = parseFloat(retail) || 0;
  const feeSnap = useMemo(
    () => Math.round((retailNum * feePct / 100 + feeFlatCents / 100) * 100) / 100,
    [retailNum, feePct, feeFlatCents]
  );
  const baseCost = blank?.base_cost ?? 0;
  const tenantMargin = Math.max(0, retailNum - baseCost - feeSnap);
  const canPublish = !!blank && retailNum >= baseCost + feeSnap && !!title.trim() && !!slug.trim();

  const publish = async () => {
    if (!canPublish || submitting) return;
    let variants: unknown;
    try { variants = JSON.parse(variantsJson); }
    catch { toast({ title: 'Variants JSON is invalid', variant: 'destructive' }); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('publish_merch_storefront_item', {
        _design_id: design.id,
        _title: title.trim(),
        _slug: slug.trim(),
        _retail_price: retailNum,
        _variants: variants as Record<string, unknown>,
        _description: description.trim() || null,
        _cover_image: coverImage.trim() || null,
        _campaign_id: campaignId === '__none' ? null : campaignId,
        _opens_at: opensAt ? new Date(opensAt).toISOString() : null,
        _closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      });
      if (error) throw error;
      toast({ title: 'Published', description: `Item live at /merch/${slug}` });
      onPublished();
    } catch (err: any) {
      toast({ title: 'Publish failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Publish "{design.name}"</DialogTitle>
          <DialogDescription>
            Snapshots base cost + platform fee at publish time. Buyers see the storefront item at <code>/merch/&lt;slug&gt;</code>.
          </DialogDescription>
        </DialogHeader>

        {!blank ? (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>
              No active blank found for <code>{design.tb_product_id}</code>. Sync the catalog before publishing.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setSlug(slugify(e.target.value)); }}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
                <p className="text-xs text-muted-foreground mt-1">/merch/{slug || '…'}</p>
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div>
              <Label>Cover image URL (optional)</Label>
              <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Retail price ($)</Label>
                <Input type="number" step="0.01" value={retail} onChange={(e) => setRetail(e.target.value)} />
              </div>
              <div>
                <Label>Opens (optional)</Label>
                <Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
              </div>
              <div>
                <Label>Closes (optional)</Label>
                <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Campaign (optional)</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger><SelectValue placeholder="No campaign" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No campaign</SelectItem>
                  {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Variants JSON</Label>
              <Textarea
                value={variantsJson}
                onChange={(e) => setVariantsJson(e.target.value)}
                rows={5}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Shape: <code>{`{ sizes: ["S","M",…], colors: ["Black",…] }`}</code>
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Base cost (frozen at publish)</span><span>${baseCost.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Platform fee (frozen)</span><span>${feeSnap.toFixed(2)}</span></div>
              <div className="flex justify-between font-medium"><span>Your margin per item</span><span className={tenantMargin > 0 ? 'text-emerald-600' : 'text-destructive'}>${tenantMargin.toFixed(2)}</span></div>
              {retailNum > 0 && retailNum < baseCost + feeSnap && (
                <p className="text-xs text-destructive mt-2">Retail must be ≥ base cost + platform fee.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={publish} disabled={!canPublish || submitting}>
            {submitting ? 'Publishing…' : 'Publish to storefront'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MerchDesigns;

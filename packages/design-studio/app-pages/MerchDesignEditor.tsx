// Tenant-facing design authoring — thin wrapper around <MerchDesignStudio>.
// Persists design JSON into gw_merch_designs; loads TB blanks from
// gw_merch_products (populated by the S&S catalog sync edge function).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shirt } from 'lucide-react';
import {
  MerchDesignStudio,
  type MerchDesign,
  type MerchDesignStudioProduct,
  type MerchDesignStudioTheme,
} from '@tshirtbrothers/design-studio';

interface Blank {
  id: string;
  tb_product_id: string;
  name: string;
  category: string;
  base_cost: number;
  variants: Record<string, string[]>;
  print_areas: Record<string, unknown>;
  cover_image?: string | null;
}

function useTenantTheme(): MerchDesignStudioTheme {
  return useMemo(() => {
    const t = typeof window !== 'undefined' ? (window as any).__TENANT_CONFIG__ : undefined;
    const brand = t?.brandColor ?? '#003366';
    return {
      brand,
      brandForeground: '#ffffff',
      surface: '#ffffff',
      border: '#e5e7eb',
    };
  }, []);
}

export const MerchDesignEditor = () => {
  const { designId } = useParams<{ designId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const theme = useTenantTheme();

  const [blanks, setBlanks] = useState<Blank[]>([]);
  const [selectedBlank, setSelectedBlank] = useState<Blank | null>(null);
  const [name, setName] = useState('');
  const [initialDesign, setInitialDesign] = useState<MerchDesign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: blanksData, error: blanksErr } = await supabase
        .from('gw_merch_products')
        .select('id, tb_product_id, name, category, base_cost, variants, print_areas, cover_image')
        .eq('is_active', true)
        .order('name');
      if (blanksErr) {
        toast({ title: 'Could not load blanks', description: blanksErr.message, variant: 'destructive' });
      }
      const blanksList = (blanksData ?? []) as Blank[];
      setBlanks(blanksList);

      if (designId) {
        const { data: design } = await supabase
          .from('gw_merch_designs')
          .select('name, tb_product_id, design_json')
          .eq('id', designId)
          .maybeSingle();
        if (design) {
          setName(design.name);
          setInitialDesign(design.design_json as MerchDesign);
          const b = blanksList.find(x => x.tb_product_id === design.tb_product_id);
          if (b) setSelectedBlank(b);
        }
      } else if (blanksList.length > 0) {
        setSelectedBlank(blanksList[0]);
      }
      setLoading(false);
    })();
  }, [designId, toast]);

  const handleSave = async (design: MerchDesign) => {
    if (!name.trim()) {
      toast({ title: 'Name the design first', variant: 'destructive' });
      throw new Error('missing name');
    }
    const payload = {
      name: name.trim(),
      tb_product_id: design.tb_product_id,
      design_json: design as unknown as Record<string, unknown>,
      status: 'draft',
    };
    const q = designId
      ? supabase.from('gw_merch_designs').update(payload).eq('id', designId).select('id').single()
      : supabase.from('gw_merch_designs').insert(payload).select('id').single();
    const { data, error } = await q;
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      throw error;
    }
    toast({ title: designId ? 'Design updated' : 'Design saved' });
    if (!designId && data?.id) navigate(`/admin/merch/designs/${data.id}`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (blanks.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Shirt className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="mt-4 font-medium">No blanks available</p>
            <p className="text-sm text-muted-foreground mt-2">
              The S&amp;S Activewear catalog cache is empty. Run the sync from
              Store admin → Design Studio → Sync catalog, or ask an operator to
              trigger the <code>ss-catalog-sync</code> edge function.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedBlank) {
    return (
      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-bold">Pick a blank</h1>
        <p className="text-muted-foreground mt-1">Choose the blank you'll design on.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {blanks.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBlank(b)}
              className="p-4 rounded-lg border text-left hover:bg-muted transition-colors"
            >
              <p className="font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground">${b.base_cost.toFixed(2)} · {b.category}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const product: MerchDesignStudioProduct = {
    tb_product_id: selectedBlank.tb_product_id,
    name: selectedBlank.name,
    subtitle: `${selectedBlank.category} · $${selectedBlank.base_cost.toFixed(2)} base`,
    cover_image: selectedBlank.cover_image ?? null,
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-background px-4 py-2 flex items-center gap-3">
        <Label className="text-xs whitespace-nowrap">Design name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Untitled design"
          className="max-w-sm h-8"
        />
      </div>
      <div className="flex-1 min-h-0">
        <MerchDesignStudio
          product={product}
          theme={theme}
          initialDesign={initialDesign}
          onSave={handleSave}
          onExit={() => navigate('/admin/merch/designs')}
          saveLabel={designId ? 'Update design' : 'Save design'}
        />
      </div>
    </div>
  );
};

export default MerchDesignEditor;

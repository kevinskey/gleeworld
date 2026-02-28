import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, Ticket, Copy, Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CouponManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  description: string | null;
  created_at: string;
}

export function CouponManagerDialog({ open, onOpenChange }: CouponManagerDialogProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Generator form
  const [count, setCount] = useState(1);
  const [prefix, setPrefix] = useState('GLEE');
  const [discountType, setDiscountType] = useState('percent');
  const [discountValue, setDiscountValue] = useState(100);
  const [maxUses, setMaxUses] = useState(1);
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (open) fetchCoupons();
  }, [open]);

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gw_coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error) setCoupons((data as Coupon[]) || []);
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (count < 1 || count > 100) {
      toast.error('Count must be between 1 and 100');
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_coupon_batch', {
        p_count: count,
        p_prefix: prefix || 'GLEE',
        p_discount_type: discountType,
        p_discount_value: discountValue,
        p_max_uses: maxUses,
        p_description: description || `Generated from POS`,
        p_expires_at: expiresAt || undefined,
      });
      if (error) throw error;
      const generated = data as { code: string; id: string }[];
      toast.success(`${generated.length} coupon(s) created!`);
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate coupons');
    } finally {
      setGenerating(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    const { error } = await supabase
      .from('gw_coupons')
      .update({ is_active: !coupon.is_active })
      .eq('id', coupon.id);
    if (error) {
      toast.error('Failed to update coupon');
    } else {
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
    }
  };

  const deleteCoupon = async (id: string) => {
    const { error } = await supabase.from('gw_coupons').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete coupon');
    } else {
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success('Coupon deleted');
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Coupon Manager
          </DialogTitle>
          <DialogDescription>
            Generate and manage discount coupons for POS and online checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Generator Form */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Generate New Coupons
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Count</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={e => setCount(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prefix</Label>
                <Input
                  value={prefix}
                  onChange={e => setPrefix(e.target.value.toUpperCase())}
                  placeholder="GLEE"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Type</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent Off</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {discountType === 'percent' ? 'Percent (%)' : 'Amount ($)'}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={discountType === 'percent' ? 100 : 99999}
                  value={discountValue}
                  onChange={e => setDiscountValue(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Uses (per code)</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={e => setMaxUses(Number(e.target.value))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expires</Label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Free cart giveaway, Spring 2026"
                className="h-9"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full gap-2"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ticket className="w-4 h-4" />
              )}
              Generate {count} Coupon{count !== 1 ? 's' : ''}
            </Button>
          </div>

          <Separator />

          {/* Existing Coupons */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Existing Coupons</h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : coupons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No coupons yet. Generate some above!
              </p>
            ) : (
              <div className="space-y-2">
                {coupons.map(coupon => (
                  <div
                    key={coupon.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border border-border p-3 transition-opacity",
                      !coupon.is_active && "opacity-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-sm font-bold tracking-wide">{coupon.code}</code>
                        <Badge variant={coupon.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {coupon.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {coupon.discount_type === 'percent'
                            ? `${coupon.discount_value}% off`
                            : `$${coupon.discount_value} off`}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Used {coupon.times_used}/{coupon.max_uses ?? '∞'}</span>
                        {coupon.expires_at && (
                          <span>Exp: {new Date(coupon.expires_at).toLocaleDateString()}</span>
                        )}
                        {coupon.description && (
                          <span className="truncate max-w-[150px]">{coupon.description}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyCode(coupon.code, coupon.id)}
                      >
                        {copiedId === coupon.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Switch
                        checked={coupon.is_active}
                        onCheckedChange={() => toggleActive(coupon)}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteCoupon(coupon.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

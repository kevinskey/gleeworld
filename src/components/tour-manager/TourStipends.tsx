import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, Calculator, Plus, Trash2, Download, Music } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StipendLineItem {
  id: string;
  description: string;
  amount: number;
  type: 'performance' | 'rehearsal' | 'travel' | 'per_diem' | 'other';
}

const STIPEND_TYPES = [
  { value: 'performance', label: 'Performance' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'travel', label: 'Travel Day' },
  { value: 'per_diem', label: 'Per Diem' },
  { value: 'other', label: 'Other' },
] as const;

export const TourStipends = () => {
  const [lineItems, setLineItems] = useState<StipendLineItem[]>([
    { id: '1', description: 'Performance stipend', amount: 0, type: 'performance' },
  ]);
  const [singerCount, setSingerCount] = useState<number>(0);
  const [tourDays, setTourDays] = useState<number>(0);

  // Fetch roster count for quick-fill
  const { data: rosterCount } = useQuery({
    queryKey: ['tour-roster-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('gw_tour_roster')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');
      return count || 0;
    },
  });

  // Fetch tour cities for day count
  const { data: tourCities } = useQuery({
    queryKey: ['tour-cities-stipend'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_cities')
        .select('arrival_date, departure_date, city_name')
        .order('city_order');
      return data || [];
    },
  });

  const calculatedTourDays = useMemo(() => {
    if (!tourCities || tourCities.length === 0) return 0;
    const dates = tourCities
      .flatMap(c => [c.arrival_date, c.departure_date])
      .filter(Boolean)
      .map(d => new Date(d!).getTime());
    if (dates.length < 2) return 0;
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return Math.ceil((max - min) / (1000 * 60 * 60 * 24)) + 1;
  }, [tourCities]);

  const addLineItem = () => {
    setLineItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), description: '', amount: 0, type: 'other' },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof StipendLineItem, value: string | number) => {
    setLineItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const effectiveSingerCount = singerCount || rosterCount || 0;
  const effectiveTourDays = tourDays || calculatedTourDays || 0;

  const perSingerTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [lineItems]
  );

  const grandTotal = perSingerTotal * effectiveSingerCount;

  const perDayPerSinger = effectiveTourDays > 0 ? perSingerTotal / effectiveTourDays : 0;

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    lineItems.forEach(item => {
      const label = STIPEND_TYPES.find(t => t.value === item.type)?.label || 'Other';
      map[label] = (map[label] || 0) + (Number(item.amount) || 0);
    });
    return Object.entries(map).filter(([, v]) => v > 0);
  }, [lineItems]);

  const exportCSV = () => {
    const rows = [
      ['Category', 'Description', 'Per Singer Amount'],
      ...lineItems.map(item => [
        STIPEND_TYPES.find(t => t.value === item.type)?.label || 'Other',
        item.description,
        item.amount.toString(),
      ]),
      [],
      ['', 'Per Singer Total', perSingerTotal.toString()],
      ['', `Grand Total (${effectiveSingerCount} singers)`, grandTotal.toString()],
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tour-stipend-calculator.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card variant="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Singers</p>
              <p className="text-lg font-bold">{effectiveSingerCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Per Singer</p>
              <p className="text-lg font-bold">{formatCurrency(perSingerTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Grand Total</p>
              <p className="text-lg font-bold">{formatCurrency(grandTotal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/50">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Per Day/Singer</p>
              <p className="text-lg font-bold">{formatCurrency(perDayPerSinger)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tour Parameters</CardTitle>
          <CardDescription>Set base values — auto-filled from roster and itinerary when available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of Singers</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={singerCount || ''}
                  onChange={e => setSingerCount(parseInt(e.target.value) || 0)}
                  placeholder={rosterCount ? `${rosterCount} (from roster)` : 'Enter count'}
                />
                {rosterCount ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setSingerCount(rosterCount)}
                  >
                    Use Roster ({rosterCount})
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tour Days</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  value={tourDays || ''}
                  onChange={e => setTourDays(parseInt(e.target.value) || 0)}
                  placeholder={calculatedTourDays ? `${calculatedTourDays} (from itinerary)` : 'Enter days'}
                />
                {calculatedTourDays ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                    onClick={() => setTourDays(calculatedTourDays)}
                  >
                    Use Itinerary ({calculatedTourDays})
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Stipend Line Items</CardTitle>
              <CardDescription>Add each stipend component per singer</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((item, idx) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row items-start sm:items-end gap-2 p-3 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex-1 w-full sm:w-auto space-y-1">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={item.type}
                  onValueChange={v => updateLineItem(item.id, 'type', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STIPEND_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-[2] w-full sm:w-auto space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Input
                  value={item.description}
                  onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                  placeholder="e.g., Syracuse Jazz Festival"
                  className="h-9"
                />
              </div>
              <div className="w-full sm:w-32 space-y-1">
                <Label className="text-xs text-muted-foreground">Amount ($)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.amount || ''}
                  onChange={e => updateLineItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive/70 hover:text-destructive flex-shrink-0"
                onClick={() => removeLineItem(item.id)}
                disabled={lineItems.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {lineItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No line items. Click "Add Item" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown */}
      {byType.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byType.map(([label, amount]) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <Badge variant="secondary">{label}</Badge>
                  <span className="font-medium">{formatCurrency(amount)} <span className="text-xs text-muted-foreground">per singer</span></span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between py-1.5 font-semibold">
                <span>Per Singer Total</span>
                <span>{formatCurrency(perSingerTotal)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 font-semibold text-primary">
                <span>Grand Total ({effectiveSingerCount} singers)</span>
                <span className="text-lg">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

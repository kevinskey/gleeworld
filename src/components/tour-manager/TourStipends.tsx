import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, Calculator, Plus, Trash2, Download, Music, MapPin, Info, Pencil, Eye, Save, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// --- Per Diem Rate Directory ---
const HIGH_COST_STATES = [
  'California', 'Florida', 'Illinois', 'Massachusetts', 'Michigan',
  'Minnesota', 'Montana', 'New York', 'North Carolina', 'Ohio',
  'Oregon', 'Pennsylvania', 'South Carolina', 'South Dakota',
  'Tennessee', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'Washington, D.C.', 'Wisconsin', 'Wyoming',
];

const STATE_CODE_MAP: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'Washington, D.C.',
};

const STANDARD_RATE = 69;
const HIGH_COST_RATE = 79;

function getPerDiemRate(stateCode: string | null): number {
  if (!stateCode) return STANDARD_RATE;
  const stateName = STATE_CODE_MAP[stateCode.toUpperCase()] || stateCode;
  return HIGH_COST_STATES.includes(stateName) ? HIGH_COST_RATE : STANDARD_RATE;
}

function getStateName(stateCode: string | null): string {
  if (!stateCode) return 'Unknown';
  return STATE_CODE_MAP[stateCode.toUpperCase()] || stateCode;
}

// --- Line Item Types ---
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

interface TourCityStop {
  city_name: string;
  state_code: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  city_order: number;
}

export const TourStipends = () => {
  const [lineItems, setLineItems] = useState<StipendLineItem[]>([
    { id: '1', description: 'Performance stipend', amount: 0, type: 'performance' },
  ]);
  const [singerCount, setSingerCount] = useState<number>(0);
  const [tourDays, setTourDays] = useState<number>(0);
  const [isLetterEditable, setIsLetterEditable] = useState(false);
  const [letterText, setLetterText] = useState<string>('');
  const [savedLetterText, setSavedLetterText] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch roster count
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

  // Fetch tour cities for per diem calculation
  const { data: tourCities } = useQuery({
    queryKey: ['tour-cities-stipend'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_tour_cities')
        .select('city_name, state_code, arrival_date, departure_date, city_order')
        .order('city_order');
      return (data || []) as TourCityStop[];
    },
  });

  // Calculate days per city stop
  const cityBreakdown = useMemo(() => {
    if (!tourCities || tourCities.length === 0) return [];
    return tourCities.map(city => {
      let days = 1;
      if (city.arrival_date && city.departure_date) {
        const arr = new Date(city.arrival_date).getTime();
        const dep = new Date(city.departure_date).getTime();
        days = Math.max(1, Math.ceil((dep - arr) / (1000 * 60 * 60 * 24)) + 1);
      }
      const rate = getPerDiemRate(city.state_code);
      return {
        ...city,
        days,
        rate,
        stateName: getStateName(city.state_code),
        totalPerDiem: rate * days,
      };
    });
  }, [tourCities]);

  const calculatedTourDays = useMemo(() => {
    if (!tourCities || tourCities.length === 0) return 0;
    const dates = tourCities
      .flatMap(c => [c.arrival_date, c.departure_date])
      .filter(Boolean)
      .map(d => new Date(d!).getTime());
    if (dates.length < 2) return 0;
    return Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24)) + 1;
  }, [tourCities]);

  const totalPerDiemPerSinger = useMemo(
    () => cityBreakdown.reduce((sum, c) => sum + c.totalPerDiem, 0),
    [cityBreakdown]
  );

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

  const lineItemTotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [lineItems]
  );

  const perSingerTotal = lineItemTotal + totalPerDiemPerSinger;
  const grandTotal = perSingerTotal * effectiveSingerCount;
  const totalPerDiemAll = totalPerDiemPerSinger * effectiveSingerCount;
  const perDayPerSinger = effectiveTourDays > 0 ? perSingerTotal / effectiveTourDays : 0;

  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    lineItems.forEach(item => {
      const label = STIPEND_TYPES.find(t => t.value === item.type)?.label || 'Other';
      map[label] = (map[label] || 0) + (Number(item.amount) || 0);
    });
    if (totalPerDiemPerSinger > 0) {
      map['Per Diem (auto)'] = totalPerDiemPerSinger;
    }
    return Object.entries(map).filter(([, v]) => v > 0);
  }, [lineItems, totalPerDiemPerSinger]);

  const exportCSV = () => {
    const rows = [
      ['Category', 'Description', 'Per Singer Amount'],
      ...lineItems.map(item => [
        STIPEND_TYPES.find(t => t.value === item.type)?.label || 'Other',
        item.description,
        item.amount.toString(),
      ]),
      [],
      ['Per Diem Breakdown', '', ''],
      ['City', 'State', 'Rate', 'Days', 'Total'],
      ...cityBreakdown.map(c => [c.city_name, c.stateName, `$${c.rate}`, c.days.toString(), `$${c.totalPerDiem}`]),
      [],
      ['', 'Per Diem Total (per singer)', totalPerDiemPerSinger.toString()],
      ['', 'Line Items Total (per singer)', lineItemTotal.toString()],
      ['', 'Per Singer Grand Total', perSingerTotal.toString()],
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

      {/* Per Diem Rate Directory */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Per Diem Rate Directory</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Rates auto-applied based on tour stop states. ${STANDARD_RATE}/day standard, ${HIGH_COST_RATE}/day for high-cost states.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>
            Auto-calculated from your itinerary stops — {formatCurrency(totalPerDiemPerSinger)} per singer, {formatCurrency(totalPerDiemAll)} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cityBreakdown.length > 0 ? (
            <div className="space-y-2">
              {/* Rate legend */}
              <div className="flex flex-wrap gap-3 mb-3">
                <Badge variant="outline" className="gap-1.5 px-3 py-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary/60 inline-block" />
                  Standard: ${STANDARD_RATE}/day
                </Badge>
                <Badge variant="outline" className="gap-1.5 px-3 py-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/60 inline-block" />
                  High-Cost: ${HIGH_COST_RATE}/day
                </Badge>
              </div>

              {/* City rows */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span>City</span>
                  <span className="text-right">State</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Days</span>
                  <span className="text-right">Total</span>
                </div>
                {cityBreakdown.map((city, idx) => {
                  const isHighCost = city.rate === HIGH_COST_RATE;
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-2.5 border-t border-border/50 items-center text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate">{city.city_name}</span>
                      </div>
                      <span className="text-muted-foreground text-right">{city.state_code || '—'}</span>
                      <Badge
                        variant={isHighCost ? 'destructive' : 'secondary'}
                        className="text-xs font-mono justify-self-end"
                      >
                        ${city.rate}
                      </Badge>
                      <span className="text-right tabular-nums">{city.days}</span>
                      <span className="text-right font-semibold tabular-nums">{formatCurrency(city.totalPerDiem)}</span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-2.5 border-t border-border bg-muted/30 font-semibold text-sm">
                  <span>Per Diem Total (per singer)</span>
                  <span />
                  <span />
                  <span className="text-right tabular-nums">{cityBreakdown.reduce((s, c) => s + c.days, 0)}</span>
                  <span className="text-right tabular-nums text-primary">{formatCurrency(totalPerDiemPerSinger)}</span>
                </div>
              </div>

              {/* High-cost state reference */}
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  View full ${HIGH_COST_RATE}/day state list
                </summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {HIGH_COST_STATES.map(state => (
                    <Badge key={state} variant="outline" className="text-xs">
                      {state}
                    </Badge>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No tour stops found. Add cities to your itinerary to auto-calculate per diem rates.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tour Parameters */}
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

      {/* Additional Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Additional Stipend Items</CardTitle>
              <CardDescription>Add performance fees, travel pay, or other per-singer costs beyond per diem</CardDescription>
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
          {lineItems.map((item) => (
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
        </CardContent>
      </Card>

      {/* Grand Breakdown */}
      {byType.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Full Stipend Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {byType.map(([label, amount]) => (
                <div key={label} className="flex items-center justify-between py-1.5">
                  <Badge variant={label.includes('Per Diem') ? 'default' : 'secondary'}>{label}</Badge>
                  <span className="font-medium">
                    {formatCurrency(amount)}{' '}
                    <span className="text-xs text-muted-foreground">per singer</span>
                  </span>
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

      {/* Formal Stipend Request Letter */}
      <StipendLetterCard
        cityBreakdown={cityBreakdown}
        effectiveSingerCount={effectiveSingerCount}
        isLetterEditable={isLetterEditable}
        setIsLetterEditable={setIsLetterEditable}
        letterText={letterText}
        setLetterText={setLetterText}
        savedLetterText={savedLetterText}
        setSavedLetterText={setSavedLetterText}
        hasUnsavedChanges={hasUnsavedChanges}
        setHasUnsavedChanges={setHasUnsavedChanges}
      />
    </div>
  );
};

// --- Stipend Letter Card Component ---
interface CityBreakdownItem {
  city_name: string;
  state_code: string | null;
  days: number;
  rate: number;
  stateName: string;
  totalPerDiem: number;
}

interface StipendLetterCardProps {
  cityBreakdown: CityBreakdownItem[];
  effectiveSingerCount: number;
  isLetterEditable: boolean;
  setIsLetterEditable: (v: boolean) => void;
  letterText: string;
  setLetterText: (v: string) => void;
  savedLetterText: string;
  setSavedLetterText: (v: string) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (v: boolean) => void;
}

function generateLetterText(cityBreakdown: CityBreakdownItem[], effectiveSingerCount: number): string {
  const singerCount = effectiveSingerCount || 44;
  const studentMealTotal = singerCount * 100;

  const citiesLine = cityBreakdown.length > 0
    ? cityBreakdown.map((c, i) => {
        const label = `${c.city_name}, ${c.state_code || ''}`;
        if (i === cityBreakdown.length - 1 && cityBreakdown.length > 1) return `and ${label}`;
        return label;
      }).join('; ')
    : 'Huntsville, AL; New Orleans, LA; Denver, CO; Kansas City, MO; Chicago, IL; Cleveland, OH; and Harlem, NY';

  const standardCities = cityBreakdown.filter(c => c.rate === STANDARD_RATE);
  const highCostCities = cityBreakdown.filter(c => c.rate === HIGH_COST_RATE);
  const standardDays = standardCities.reduce((s, c) => s + c.days, 0);
  const highCostDays = highCostCities.reduce((s, c) => s + c.days, 0);
  const standardTotal = standardDays * STANDARD_RATE;
  const highCostTotal = highCostDays * HIGH_COST_RATE;
  const facultyPerDiemTotal = standardTotal + highCostTotal;
  const miscExpenses = 2500;
  const grandFacultyTotal = facultyPerDiemTotal + miscExpenses;

  const standardLine = standardCities.length > 0
    ? ` - $${STANDARD_RATE}/day @ ${standardDays} days (${standardCities.map(c => `${c.state_code}${c.days > 1 ? `(x${c.days})` : ''}`).join(',')}) = ${formatCurrency(standardTotal)}`
    : '';
  const highCostLine = highCostCities.length > 0
    ? ` - $${HIGH_COST_RATE}/day @ ${highCostDays} days (${highCostCities.map(c => `${c.state_code}${c.days > 1 ? `(x${c.days})` : ''}`).join(',')}) = ${formatCurrency(highCostTotal)}`
    : '';

  return `The tour consists of performances in ${citiesLine}. The checks are needed by Wednesday, March 5th before departing from the college on Saturday, March 8th.

───────────────────────────────────

Cash for Student Meals
${singerCount} Glee Club Members Per Diem $100 = ${formatCurrency(studentMealTotal)}

                  Grand Total for Glee Club Members = ${formatCurrency(studentMealTotal)}

───────────────────────────────────

Glee Club Director – Dr. Kevin Johnson- Misc./ Emergency Expenses = $2,500.00

(i.e. Bus tolls, Bus driver tip, Bus parking, Bus water and snacks)

───────────────────────────────────

Glee Club Director- Dr. Kevin Johnson
${standardLine}
${highCostLine}
 Total = ${formatCurrency(facultyPerDiemTotal)}

───────────────────────────────────

Grand Total Faculty Per Diem and Misc. = ${formatCurrency(grandFacultyTotal)}`.trim();
}

const StipendLetterCard = ({
  cityBreakdown,
  effectiveSingerCount,
  isLetterEditable,
  setIsLetterEditable,
  letterText,
  setLetterText,
  savedLetterText,
  setSavedLetterText,
  hasUnsavedChanges,
  setHasUnsavedChanges,
}: StipendLetterCardProps) => {
  // Generate initial letter text
  const generatedText = useMemo(
    () => generateLetterText(cityBreakdown, effectiveSingerCount),
    [cityBreakdown, effectiveSingerCount]
  );

  // Initialize letter text from saved or generated
  useEffect(() => {
    if (!savedLetterText && !letterText) {
      setLetterText(generatedText);
    }
  }, [generatedText, savedLetterText, letterText, setLetterText]);

  const handleEdit = () => {
    if (!letterText) setLetterText(savedLetterText || generatedText);
    setIsLetterEditable(true);
  };

  const handleSave = () => {
    setSavedLetterText(letterText);
    setHasUnsavedChanges(false);
    setIsLetterEditable(false);
    toast.success('Letter saved');
  };

  const handleRegenerate = () => {
    const newText = generatedText;
    setLetterText(newText);
    setHasUnsavedChanges(true);
  };

  const handleTextChange = (value: string) => {
    setLetterText(value);
    setHasUnsavedChanges(true);
  };

  const displayText = letterText || savedLetterText || generatedText;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const escaped = displayText.replace(/\n/g, '<br/>').replace(/───+/g, '<hr style="border:none;border-top:1px solid #000;margin:12px 0"/>');
    printWindow.document.write(`
      <html><head><title>Stipend Request</title>
      <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:20px;color:#000;line-height:1.8;font-size:14px;white-space:pre-wrap}
      hr{border:none;border-top:1px solid #000;margin:16px 0}
      </style></head><body>${escaped}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Stipend Request Letter</CardTitle>
            <CardDescription>
              Formal tour stipend & per diem request document
              {hasUnsavedChanges && (
                <Badge variant="outline" className="ml-2 text-warning border-warning/50">Unsaved</Badge>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isLetterEditable ? (
              <>
                <Button variant="outline" size="sm" onClick={handleRegenerate}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setLetterText(savedLetterText || generatedText);
                  setHasUnsavedChanges(false);
                  setIsLetterEditable(false);
                }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Download className="h-4 w-4 mr-1" />
                  Print / Save PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLetterEditable ? (
          <Textarea
            value={letterText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="font-serif text-sm leading-relaxed min-h-[400px] resize-y"
            placeholder="Edit the stipend request letter..."
          />
        ) : (
          <div className="bg-background border border-border rounded-lg p-6 sm:p-8 font-serif text-sm leading-relaxed whitespace-pre-wrap">
            {displayText}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeSelect } from '@/components/ui/time-select';
import {
  ChevronDown, ChevronUp, Clock, MapPin, Utensils, Save, Loader2,
  Sparkles, AlertTriangle, CheckCircle, Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TourStopLogistics {
  id: string;
  city_name: string;
  state_code: string | null;
  city_order: number;
  arrival_date: string | null;
  departure_date: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  meals_needed: string[];
  meal_notes: string | null;
  estimated_drive_hours: number | null;
  estimated_drive_miles: number | null;
  lunch_stop_suggestion: any;
}

interface LunchSuggestion {
  name: string;
  city: string;
  distance_from_origin_miles: number;
  drive_time_from_origin: string;
  reason: string;
  cost_per_person: string;
  cuisine: string;
}

interface DOTComplianceResult {
  legLabel: string;
  driveHours: number;
  exceedsLimit: boolean;
  needsMandatoryBreak: boolean;
  warnings: string[];
}

const DOT_MAX_DRIVE_HOURS = 10;
const DOT_MANDATORY_BREAK_HOURS = 8;

export const TourStopLogisticsEditor: React.FC<{
  stops: TourStopLogistics[];
  tourId: string;
  onUpdate: () => void;
}> = ({ stops, tourId, onUpdate }) => {
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Partial<TourStopLogistics>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const getEditData = (stopId: string, stop: TourStopLogistics) => {
    return { ...stop, ...(editData[stopId] || {}) };
  };

  const updateField = (stopId: string, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [stopId]: { ...(prev[stopId] || {}), [field]: value },
    }));
  };

  const toggleMeal = (stopId: string, meal: string, current: string[]) => {
    const updated = current.includes(meal)
      ? current.filter(m => m !== meal)
      : [...current, meal];
    updateField(stopId, 'meals_needed', updated);
  };

  const saveStop = async (stopId: string) => {
    const data = editData[stopId];
    if (!data) return;

    setSaving(stopId);
    try {
      const { error } = await supabase
        .from('gw_tour_cities')
        .update({
          departure_time: data.departure_time,
          arrival_time: data.arrival_time,
          meals_needed: data.meals_needed,
          meal_notes: data.meal_notes,
          estimated_drive_hours: data.estimated_drive_hours,
          estimated_drive_miles: data.estimated_drive_miles,
        })
        .eq('id', stopId);

      if (error) throw error;
      toast({ title: 'Logistics saved' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const fetchLunchSuggestions = async (stopIndex: number) => {
    if (stopIndex === 0) return;
    const prevStop = stops[stopIndex - 1];
    const curStop = stops[stopIndex];
    const origin = `${prevStop.city_name}${prevStop.state_code ? `, ${prevStop.state_code}` : ''}`;
    const dest = `${curStop.city_name}${curStop.state_code ? `, ${curStop.state_code}` : ''}`;

    setLoadingAI(curStop.id);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-lunch-stops', {
        body: { originCity: origin, destinationCity: dest, groupSize: 46 },
      });

      if (error) throw error;
      setAiResults(prev => ({ ...prev, [curStop.id]: data }));

      // Also save distance/hours if returned
      if (data?.total_distance_miles || data?.total_drive_hours) {
        updateField(curStop.id, 'estimated_drive_miles', data.total_distance_miles);
        updateField(curStop.id, 'estimated_drive_hours', data.total_drive_hours);

        await supabase.from('gw_tour_cities').update({
          estimated_drive_miles: data.total_distance_miles,
          estimated_drive_hours: data.total_drive_hours,
          lunch_stop_suggestion: data,
        }).eq('id', curStop.id);
      }

      toast({ title: 'Lunch suggestions loaded' });
    } catch (err: any) {
      toast({ title: 'AI suggestion failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingAI(null);
    }
  };

  // Calculate DOT compliance for each leg
  const dotCompliance: DOTComplianceResult[] = stops.map((stop, index) => {
    if (index === 0) {
      return { legLabel: '', driveHours: 0, exceedsLimit: false, needsMandatoryBreak: false, warnings: [] };
    }
    const data = getEditData(stop.id, stop);
    const driveHours = data.estimated_drive_hours || 0;
    const warnings: string[] = [];
    const exceedsLimit = driveHours > DOT_MAX_DRIVE_HOURS;
    const needsMandatoryBreak = driveHours > DOT_MANDATORY_BREAK_HOURS;

    if (exceedsLimit) {
      warnings.push(`⚠️ Exceeds DOT 10-hour driving limit by ${(driveHours - DOT_MAX_DRIVE_HOURS).toFixed(1)}h. Driver must take a mandatory 10-hour off-duty rest.`);
    }
    if (needsMandatoryBreak && !exceedsLimit) {
      warnings.push(`Driver must take a mandatory 30-minute break before driving beyond 8 hours.`);
    }
    if (driveHours > 5) {
      warnings.push(`Consider a lunch/rest stop — ${driveHours.toFixed(1)}h is a long drive for 46 passengers.`);
    }

    return {
      legLabel: `${stops[index - 1].city_name} → ${stop.city_name}`,
      driveHours,
      exceedsLimit,
      needsMandatoryBreak,
      warnings,
    };
  });

  const totalDriveHours = dotCompliance.reduce((sum, d) => sum + d.driveHours, 0);
  const totalMiles = stops.reduce((sum, s) => {
    const data = getEditData(s.id, s);
    return sum + (data.estimated_drive_miles || 0);
  }, 0);
  const violationCount = dotCompliance.filter(d => d.exceedsLimit).length;

  return (
    <div className="space-y-4">
      {/* DOT Compliance Summary Card */}
      {stops.length > 1 && (
        <Card className={violationCount > 0 ? 'border-destructive/50 bg-destructive/5' : 'border-primary/30 bg-primary/5'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {violationCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className="font-semibold text-sm">DOT Bus Driver Compliance Summary</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  FMCSA Hours of Service: Max 10h driving / 15h on-duty per day. 30-min break required after 8h.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  <div className="text-center">
                    <p className="text-lg font-bold">{totalDriveHours.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Total Drive Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{totalMiles.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Total Miles</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{stops.length - 1}</p>
                    <p className="text-xs text-muted-foreground">Driving Legs</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${violationCount > 0 ? 'text-destructive' : 'text-primary'}`}>
                      {violationCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Violations</p>
                  </div>
                </div>
                {violationCount > 0 && (
                  <div className="mt-3 p-2 rounded bg-destructive/10 text-xs text-destructive">
                    {violationCount} leg(s) exceed the DOT 10-hour driving limit. 
                    Consider splitting into multiple driving days or adding overnight stops.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Stop Cards */}
      {stops.map((stop, index) => {
        const isExpanded = expandedStop === stop.id;
        const data = getEditData(stop.id, stop);
        const compliance = dotCompliance[index];
        const aiData = aiResults[stop.id] || stop.lunch_stop_suggestion;
        const hasChanges = !!editData[stop.id];

        return (
          <Card key={stop.id} className="overflow-hidden">
            {/* Compact header */}
            <button
              className="w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
            >
              <Badge variant="outline" className="text-xs shrink-0">{index + 1}</Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {stop.city_name}{stop.state_code ? `, ${stop.state_code}` : ''}
                  </span>
                  {index === stops.length - 1 && stop.city_name.toLowerCase().includes('atlanta') && (
                    <Badge variant="secondary" className="text-[10px]">Returning</Badge>
                  )}
                </div>
                {stop.arrival_date && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(stop.arrival_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>

              {/* Inline DOT warning */}
              {compliance.exceedsLimit && (
                <Badge variant="destructive" className="text-[10px] gap-1 shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  {compliance.driveHours.toFixed(1)}h
                </Badge>
              )}
              {compliance.needsMandatoryBreak && !compliance.exceedsLimit && compliance.driveHours > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1 shrink-0">
                  <Info className="h-3 w-3" />
                  {compliance.driveHours.toFixed(1)}h
                </Badge>
              )}

              {/* Meal indicators */}
              {(data.meals_needed || []).length > 0 && (
                <div className="flex gap-1 shrink-0">
                  {(data.meals_needed || []).map(m => (
                    <Badge key={m} variant="outline" className="text-[10px] px-1 capitalize">{m[0]}</Badge>
                  ))}
                </div>
              )}

              {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-3 sm:px-4 space-y-4 border-t">
                {/* Drive info from previous stop */}
                {index > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      🚌 From {stops[index - 1].city_name}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Distance (miles)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={data.estimated_drive_miles || ''}
                          onChange={e => updateField(stop.id, 'estimated_drive_miles', parseFloat(e.target.value) || null)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Drive Time (hours)</label>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="0"
                          value={data.estimated_drive_hours || ''}
                          onChange={e => updateField(stop.id, 'estimated_drive_hours', parseFloat(e.target.value) || null)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    {/* DOT warnings inline */}
                    {compliance.warnings.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {compliance.warnings.map((w, i) => (
                          <div
                            key={i}
                            className={`text-xs p-2 rounded ${
                              compliance.exceedsLimit ? 'bg-destructive/10 text-destructive' : 'bg-accent/50 text-accent-foreground'
                            }`}
                          >
                            {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Departure / Arrival Times */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Arrival Time
                    </label>
                    <TimeSelect
                      value={data.arrival_time}
                      onChange={v => updateField(stop.id, 'arrival_time', v)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Departure Time
                    </label>
                    <TimeSelect
                      value={data.departure_time}
                      onChange={v => updateField(stop.id, 'departure_time', v)}
                    />
                  </div>
                </div>

                {/* Meals Needed */}
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1">
                    <Utensils className="h-3 w-3" /> Meals Needed (46 people)
                  </label>
                  <div className="flex gap-4">
                    {['breakfast', 'lunch', 'dinner'].map(meal => (
                      <label key={meal} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={(data.meals_needed || []).includes(meal)}
                          onCheckedChange={() => toggleMeal(stop.id, meal, data.meals_needed || [])}
                        />
                        <span className="capitalize">{meal}</span>
                      </label>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Meal notes (dietary restrictions, pre-orders, venue catering, etc.)"
                    value={data.meal_notes || ''}
                    onChange={e => updateField(stop.id, 'meal_notes', e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                </div>

                {/* AI Lunch Stop Suggestions */}
                {index > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" /> AI Lunch Stop Suggestions
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => fetchLunchSuggestions(index)}
                        disabled={loadingAI === stop.id}
                      >
                        {loadingAI === stop.id ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Finding...</>
                        ) : (
                          <><Sparkles className="h-3 w-3" /> Find Stops</>
                        )}
                      </Button>
                    </div>

                    {loadingAI === stop.id && (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full rounded" />
                        <Skeleton className="h-16 w-full rounded" />
                      </div>
                    )}

                    {aiData?.suggestions && aiData.suggestions.length > 0 && (
                      <div className="space-y-2">
                        {aiData.suggestions.map((s: LunchSuggestion, i: number) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{s.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 inline mr-1" />
                                  {s.city} · {s.distance_from_origin_miles} mi · {s.drive_time_from_origin}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px] shrink-0">{s.cost_per_person}/pp</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{s.cuisine} · {s.reason}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Save Button */}
                {hasChanges && (
                  <Button
                    size="sm"
                    className="w-full gap-1"
                    onClick={() => saveStop(stop.id)}
                    disabled={saving === stop.id}
                  >
                    {saving === stop.id ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-4 w-4" /> Save Logistics</>
                    )}
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

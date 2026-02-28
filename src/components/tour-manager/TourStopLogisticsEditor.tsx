import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeSelect } from '@/components/ui/time-select';
import {
  ChevronDown, ChevronUp, Clock, MapPin, Utensils, Save, Loader2,
  Sparkles, AlertTriangle, CheckCircle, Info, GripVertical,
  Navigation, DollarSign, ParkingCircle, Fuel, Shield, Route,
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  toll_estimate: number | null;
  parking_notes: string | null;
  route_analysis: any;
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
}> = ({ stops: initialStops, tourId, onUpdate }) => {
  const [orderedStops, setOrderedStops] = useState(initialStops);
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Partial<TourStopLogistics>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<Record<string, any>>({});
  const [reordering, setReordering] = useState(false);
  const [analyzingRoute, setAnalyzingRoute] = useState(false);
  const [routeAnalysis, setRouteAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Sync if parent stops change
  React.useEffect(() => {
    setOrderedStops(initialStops);
    // Load any existing route_analysis from first non-origin stop
    const existingAnalysis = initialStops.find(s => s.route_analysis)?.route_analysis;
    if (existingAnalysis && !routeAnalysis) {
      setRouteAnalysis(existingAnalysis);
    }
  }, [initialStops]);

  const stops = orderedStops;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stops.findIndex(s => s.id === active.id);
    const newIndex = stops.findIndex(s => s.id === over.id);
    const reordered = arrayMove(stops, oldIndex, newIndex);
    setOrderedStops(reordered);

    setReordering(true);
    try {
      const updates = reordered.map((stop, idx) =>
        supabase.from('gw_tour_cities').update({ city_order: idx }).eq('id', stop.id)
      );
      await Promise.all(updates);

      const dates = reordered
        .filter(s => s.arrival_date)
        .map(s => new Date(s.arrival_date + 'T12:00:00'));
      if (dates.length > 0) {
        const startDate = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
        const endDate = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
        await supabase.from('gw_tours').update({ start_date: startDate, end_date: endDate }).eq('id', tourId);
      }

      toast({ title: 'City order updated' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Failed to save order', description: err.message, variant: 'destructive' });
    } finally {
      setReordering(false);
    }
  };

  const getEditData = (stopId: string, stop: TourStopLogistics) => {
    return { ...stop, ...(editData[stopId] || {}) };
  };

  const updateField = (stopId: string, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      [stopId]: { ...(prev[stopId] || {}), [field]: value },
    }));
  };

  const saveStop = async (stopId: string, overrideData?: Partial<TourStopLogistics>) => {
    const data = overrideData || editData[stopId];
    if (!data) return;

    setSaving(stopId);
    try {
      const updatePayload: Record<string, any> = {};
      if (data.departure_time !== undefined) updatePayload.departure_time = data.departure_time;
      if (data.arrival_time !== undefined) updatePayload.arrival_time = data.arrival_time;
      if (data.meals_needed !== undefined) updatePayload.meals_needed = data.meals_needed;
      if (data.meal_notes !== undefined) updatePayload.meal_notes = data.meal_notes;
      if (data.estimated_drive_hours !== undefined) updatePayload.estimated_drive_hours = data.estimated_drive_hours;
      if (data.estimated_drive_miles !== undefined) updatePayload.estimated_drive_miles = data.estimated_drive_miles;

      if (Object.keys(updatePayload).length === 0) return;

      const { error } = await supabase
        .from('gw_tour_cities')
        .update(updatePayload)
        .eq('id', stopId);

      if (error) throw error;
      toast({ title: 'Logistics saved' });
      setEditData(prev => {
        const { [stopId]: _, ...rest } = prev;
        return rest;
      });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  // Auto-save time fields when they change — keyed by stopId+field so both can save independently
  const autoSaveTimeoutRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  const updateFieldWithAutoSave = (stopId: string, field: string, value: any) => {
    updateField(stopId, field, value);

    if (field === 'departure_time' || field === 'arrival_time') {
      console.log(`[AutoSave] Scheduling save for ${field} = "${value}" on stop ${stopId}`);
      const key = `${stopId}:${field}`;
      if (autoSaveTimeoutRef.current[key]) {
        clearTimeout(autoSaveTimeoutRef.current[key]);
      }
      autoSaveTimeoutRef.current[key] = setTimeout(() => {
        // Save directly to DB to avoid stale editData references
        (async () => {
          console.log(`[AutoSave] Executing save: ${field} = "${value}" on stop ${stopId}`);
          setSaving(stopId);
          try {
            const { data: result, error } = await supabase
              .from('gw_tour_cities')
              .update({ [field]: value })
              .eq('id', stopId)
              .select();
            console.log(`[AutoSave] Result:`, { result, error });
            if (error) throw error;
            toast({ title: 'Time saved' });
            onUpdate();
          } catch (err: any) {
            console.error(`[AutoSave] Error:`, err);
            toast({ title: 'Error saving time', description: err.message, variant: 'destructive' });
          } finally {
            setSaving(null);
          }
        })();
      }, 600);
    }
  };

  // Flush pending time saves on unmount
  React.useEffect(() => {
    return () => {
      Object.values(autoSaveTimeoutRef.current).forEach(clearTimeout);
    };
  }, []);

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
      toast({ title: 'Suggestion failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingAI(null);
    }
  };

  // Analyze full route
  const analyzeFullRoute = async () => {
    if (stops.length < 2) {
      toast({ title: 'Need at least 2 stops', description: 'Add more cities to analyze the route.', variant: 'destructive' });
      return;
    }

    setAnalyzingRoute(true);
    try {
      const segments = [];
      for (let i = 1; i < stops.length; i++) {
        const from = `${stops[i - 1].city_name}${stops[i - 1].state_code ? `, ${stops[i - 1].state_code}` : ''}`;
        const to = `${stops[i].city_name}${stops[i].state_code ? `, ${stops[i].state_code}` : ''}`;
        segments.push({ from, to, cityId: stops[i].id });
      }

      const { data, error } = await supabase.functions.invoke('analyze-route-segment', {
        body: { segments, groupSize: 46 },
      });

      if (error) throw error;

      setRouteAnalysis(data);

      // Persist analysis to each city
      if (data?.segments) {
        const updatePromises = data.segments.map((seg: any, i: number) => {
          const stop = stops[i + 1]; // segments[0] corresponds to stops[1]
          if (!stop) return Promise.resolve();
          return supabase.from('gw_tour_cities').update({
            estimated_drive_miles: seg.distance_miles,
            estimated_drive_hours: seg.drive_hours,
            toll_estimate: seg.toll_estimate,
            parking_notes: seg.parking_options?.map((p: any) => `${p.name} (${p.type}): ${p.notes}`).join('\n') || null,
            route_analysis: seg,
          }).eq('id', stop.id);
        });
        await Promise.all(updatePromises);

        // Update total on tour
        await supabase.from('gw_tours').update({
          total_distance: data.total_distance_miles,
          estimated_duration: `${data.total_drive_hours.toFixed(1)} hours`,
          estimated_cost: (data.total_toll_estimate || 0) + (data.total_fuel_estimate || 0),
        }).eq('id', tourId);

        // Update local state
        const updatedStops = stops.map((stop, idx) => {
          if (idx === 0) return stop;
          const seg = data.segments[idx - 1];
          if (!seg) return stop;
          return {
            ...stop,
            estimated_drive_miles: seg.distance_miles,
            estimated_drive_hours: seg.drive_hours,
            toll_estimate: seg.toll_estimate,
            route_analysis: seg,
          };
        });
        setOrderedStops(updatedStops);
      }

      toast({ title: 'Route analyzed!', description: `${data.segments?.length || 0} legs analyzed with distance, tolls, parking & DOT compliance.` });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Route analysis failed', description: err.message, variant: 'destructive' });
    } finally {
      setAnalyzingRoute(false);
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

  const totalTolls = routeAnalysis?.total_toll_estimate || stops.reduce((sum, s) => sum + (s.toll_estimate || 0), 0);
  const totalFuel = routeAnalysis?.total_fuel_estimate || 0;

  return (
    <div className="space-y-4">
      {/* Analyze Full Route Button */}
      {stops.length > 1 && (
        <Button
          onClick={analyzeFullRoute}
          disabled={analyzingRoute}
          className="w-full gap-2"
          variant="default"
        >
          {analyzingRoute ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing {stops.length - 1} legs...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> <Route className="h-4 w-4" /> My Route Analysis — Distance, Tolls, Parking & DOT Compliance</>
          )}
        </Button>
      )}

      {/* Route Analysis Summary Card */}
      {routeAnalysis && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Route className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm">My Route Analysis Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
                  <div className="text-center">
                    <p className="text-lg font-bold">{routeAnalysis.total_distance_miles?.toFixed(0) || totalMiles.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Total Miles</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{routeAnalysis.total_drive_hours?.toFixed(1) || totalDriveHours.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Drive Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">${totalTolls.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Est. Tolls</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">${totalFuel.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Est. Fuel</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{routeAnalysis.recommended_drivers || '—'}</p>
                    <p className="text-xs text-muted-foreground">Drivers Needed</p>
                  </div>
                </div>
                {routeAnalysis.overall_dot_assessment && (
                  <div className="mt-3 p-2 rounded bg-muted/50 text-xs">
                    <span className="font-medium"><Shield className="h-3 w-3 inline mr-1" />DOT Assessment:</span> {routeAnalysis.overall_dot_assessment}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DOT Compliance Summary Card */}
      {stops.length > 1 && !routeAnalysis && (
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

      {/* Per-Stop Cards - Draggable */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {stops.map((stop, index) => {
            const isExpanded = expandedStop === stop.id;
            const data = getEditData(stop.id, stop);
            const compliance = dotCompliance[index];
            const aiData = aiResults[stop.id] || stop.lunch_stop_suggestion;
            const hasChanges = !!editData[stop.id];
            const segAnalysis = stop.route_analysis || routeAnalysis?.segments?.[index - 1];

            return (
              <SortableStopCard
                key={stop.id}
                stop={stop}
                index={index}
                isExpanded={isExpanded}
                data={data}
                compliance={compliance}
                aiData={aiData}
                hasChanges={hasChanges}
                stops={stops}
                reordering={reordering}
                saving={saving}
                loadingAI={loadingAI}
                segAnalysis={segAnalysis}
                onToggleExpand={() => setExpandedStop(isExpanded ? null : stop.id)}
                onUpdateField={updateFieldWithAutoSave}
                onSaveStop={saveStop}
                onFetchLunch={() => fetchLunchSuggestions(index)}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
};

// Sortable wrapper for each stop card
const SortableStopCard: React.FC<{
  stop: any;
  index: number;
  isExpanded: boolean;
  data: any;
  compliance: any;
  aiData: any;
  hasChanges: boolean;
  stops: any[];
  reordering: boolean;
  saving: string | null;
  loadingAI: string | null;
  segAnalysis: any;
  onToggleExpand: () => void;
  onUpdateField: (stopId: string, field: string, value: any) => void;
  onSaveStop: (stopId: string) => void;
  onFetchLunch: () => void;
}> = ({ stop, index, isExpanded, data, compliance, aiData, hasChanges, stops, reordering, saving, loadingAI, segAnalysis, onToggleExpand, onUpdateField, onSaveStop, onFetchLunch }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Card ref={setNodeRef} style={style} className="overflow-hidden">
      {/* Compact header */}
      <div className="w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-muted/30 transition-colors">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        <button className="flex-1 flex items-center gap-3 text-left" onClick={onToggleExpand}>
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
            {/* Inline distance/time */}
            {index > 0 && (data.estimated_drive_miles || segAnalysis?.distance_miles) && (
              <p className="text-xs text-muted-foreground">
                {(data.estimated_drive_miles || segAnalysis?.distance_miles)?.toFixed(0)} mi · {(data.estimated_drive_hours || segAnalysis?.drive_hours)?.toFixed(1)}h
                {segAnalysis?.toll_estimate > 0 && ` · $${segAnalysis.toll_estimate} tolls`}
              </p>
            )}
            {stop.arrival_date && !(data.estimated_drive_miles || segAnalysis?.distance_miles) && (
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

          {/* Route analysis indicator */}
          {segAnalysis && !compliance.exceedsLimit && (
            <Badge variant="outline" className="text-[10px] px-1 shrink-0 gap-0.5 text-primary border-primary/30">
              <Route className="h-2.5 w-2.5" /> ✓
            </Badge>
          )}

          {/* Meal suggestions indicator */}
          {aiData?.suggestions && aiData.suggestions.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 shrink-0 gap-0.5">
              <Utensils className="h-2.5 w-2.5" /> {aiData.suggestions.length}
            </Badge>
          )}

          {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </button>
      </div>

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
                    onChange={e => onUpdateField(stop.id, 'estimated_drive_miles', parseFloat(e.target.value) || null)}
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
                    onChange={e => onUpdateField(stop.id, 'estimated_drive_hours', parseFloat(e.target.value) || null)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* My Route Analysis Details */}
              {segAnalysis && (
                <div className="space-y-2 mt-2">
                  {/* Suggested Route */}
                  {segAnalysis.suggested_route && (
                    <div className="flex items-start gap-2 p-2 rounded bg-background border border-border/50">
                      <Navigation className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium">Suggested Route</p>
                        <p className="text-xs text-muted-foreground">{segAnalysis.suggested_route}</p>
                      </div>
                    </div>
                  )}

                  {/* Tolls & Fuel */}
                  <div className="grid grid-cols-2 gap-2">
                    {segAnalysis.toll_estimate !== undefined && (
                      <div className="flex items-center gap-2 p-2 rounded bg-background border border-border/50">
                        <DollarSign className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">${segAnalysis.toll_estimate} Tolls</p>
                          {segAnalysis.toll_details && (
                            <p className="text-[10px] text-muted-foreground">{segAnalysis.toll_details}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {segAnalysis.fuel_estimate !== undefined && (
                      <div className="flex items-center gap-2 p-2 rounded bg-background border border-border/50">
                        <Fuel className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">${segAnalysis.fuel_estimate} Fuel</p>
                          <p className="text-[10px] text-muted-foreground">~6 MPG charter bus</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Parking Options */}
                  {segAnalysis.parking_options && segAnalysis.parking_options.length > 0 && (
                    <div className="p-2 rounded bg-background border border-border/50">
                      <p className="text-xs font-medium flex items-center gap-1 mb-1">
                        <ParkingCircle className="h-3.5 w-3.5 text-blue-500" /> Charter Bus Parking
                      </p>
                      <div className="space-y-1">
                        {segAnalysis.parking_options.map((p: any, pi: number) => (
                          <div key={pi} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{p.name}</span>
                            <span className="text-[10px]"> ({p.type})</span>
                            {p.notes && <span> — {p.notes}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DOT Warnings */}
                  {segAnalysis.dot_warnings && segAnalysis.dot_warnings.length > 0 && (
                    <div className="space-y-1">
                      {segAnalysis.dot_warnings.map((w: string, wi: number) => (
                        <div key={wi} className={`text-xs p-2 rounded flex items-start gap-1 ${
                          !segAnalysis.dot_compliant ? 'bg-destructive/10 text-destructive' : 'bg-accent/50 text-accent-foreground'
                        }`}>
                          <Shield className="h-3 w-3 shrink-0 mt-0.5" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Route Warnings */}
                  {segAnalysis.route_warnings && segAnalysis.route_warnings.length > 0 && (
                    <div className="space-y-1">
                      {segAnalysis.route_warnings.map((w: string, wi: number) => (
                        <div key={wi} className="text-xs p-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-start gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                          {w}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fallback DOT warnings (when no analysis) */}
              {!segAnalysis && compliance.warnings.length > 0 && (
                <div className="space-y-1 mt-2">
                  {compliance.warnings.map((w: string, i: number) => (
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
          {(() => {
            const isOrigin = index === 0 && stop.city_order === 0;
            return (
              <div className={`grid ${isOrigin ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                {!isOrigin && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Arrival Time
                    </label>
                    <TimeSelect
                      value={data.arrival_time}
                      onChange={(v: string | null) => onUpdateField(stop.id, 'arrival_time', v)}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Departure Time
                  </label>
                  <TimeSelect
                    value={data.departure_time}
                    onChange={(v: string | null) => onUpdateField(stop.id, 'departure_time', v)}
                  />
                </div>
              </div>
            );
          })()}

          {/* My Meal Stop Finder */}
          {index > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium flex items-center gap-1">
                  <Utensils className="h-3 w-3" /> <Sparkles className="h-3 w-3 text-primary" /> Find Meal Stops (46 people)
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={onFetchLunch}
                  disabled={loadingAI === stop.id}
                >
                  {loadingAI === stop.id ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Finding restaurants...</>
                  ) : (
                    <><Sparkles className="h-3 w-3" /> Find Meal Stops</>
                  )}
                </Button>
              </div>

              {!aiData?.suggestions && loadingAI !== stop.id && (
                <p className="text-xs text-muted-foreground italic">
                  Find group-friendly restaurants between {stops[index - 1].city_name} and {stop.city_name} that can seat 46+ people with bus parking.
                </p>
              )}

              {loadingAI === stop.id && (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded" />
                  <Skeleton className="h-16 w-full rounded" />
                </div>
              )}

              {aiData?.suggestions && aiData.suggestions.length > 0 && (
                <div className="space-y-2">
                  {aiData.total_distance_miles && aiData.total_drive_hours && (
                    <p className="text-xs text-muted-foreground">
                      Route: {aiData.total_distance_miles} mi · ~{aiData.total_drive_hours}h drive
                    </p>
                  )}
                  {aiData.suggestions.map((s: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {s.city} · {s.distance_from_origin_miles} mi from {stops[index - 1].city_name} · {s.drive_time_from_origin}
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
              onClick={() => onSaveStop(stop.id)}
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
};

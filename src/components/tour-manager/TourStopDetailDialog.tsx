import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, Mail, Clock, Bus, Building2, Users, Calendar, Pencil, Bed, UtensilsCrossed, FileText, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface TourStopFull {
  id: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
  event_type: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_contact: string | null;
  venue_phone: string | null;
  venue_email: string | null;
  host_name: string | null;
  host_phone: string | null;
  host_email: string | null;
  host_location: string | null;
  concert_type: string | null;
  concert_time: string | null;
  travel_from: string | null;
  travel_to: string | null;
  travel_distance_miles: number | null;
  travel_duration_hours: number | null;
  departure_time: string | null;
  arrival_time: string | null;
  driver_notes: string | null;
  driver_hours_before: number | null;
  lodging_name: string | null;
  lodging_address: string | null;
  lodging_phone: string | null;
  meal_info: string | null;
  notes: string | null;
  honorarium_amount: number | null;
  bus_company_id: string | null;
}

interface TourStopDetailDialogProps {
  stop: TourStopFull | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (stop: TourStopFull) => void;
  busCompanyName?: string;
}

const DetailRow = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] uppercase font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
};

const MAX_DRIVER_HOURS = 10; // DOT regulations

export const TourStopDetailDialog = ({ stop, open, onOpenChange, onEdit, busCompanyName }: TourStopDetailDialogProps) => {
  if (!stop) return null;

  const eventDate = new Date(stop.start_date);
  const typeColors: Record<string, string> = {
    performance: 'bg-primary text-primary-foreground',
    travel: 'bg-amber-500 text-white',
    free: 'bg-emerald-500 text-white',
    workshop: 'bg-violet-500 text-white',
  };

  // Driver utilization analysis
  const totalDriverHours = (stop.travel_duration_hours || 0) + (stop.driver_hours_before || 0);
  const driverUtilization = totalDriverHours > 0 ? (totalDriverHours / MAX_DRIVER_HOURS) * 100 : 0;
  const driverStatus = totalDriverHours > MAX_DRIVER_HOURS ? 'over' : totalDriverHours > MAX_DRIVER_HOURS * 0.8 ? 'warning' : 'ok';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">{stop.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(eventDate, 'EEEE, MMMM d, yyyy')}
                {stop.end_date && ` – ${format(new Date(stop.end_date), 'MMM d')}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {stop.event_type && (
                <Badge className={cn("capitalize text-xs", typeColors[stop.event_type] || '')}>
                  {stop.event_type}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Venue & Location */}
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Venue & Location
            </h4>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              <DetailRow icon={Building2} label="Venue" value={stop.venue_name} />
              <DetailRow icon={MapPin} label="Address" value={stop.venue_address || stop.location} />
              <DetailRow icon={Phone} label="Venue Phone" value={stop.venue_phone} />
              <DetailRow icon={Mail} label="Venue Email" value={stop.venue_email} />
              <DetailRow icon={Users} label="Venue Contact" value={stop.venue_contact} />
              {stop.concert_type && <DetailRow icon={Calendar} label="Concert Type" value={stop.concert_type} />}
              {stop.concert_time && <DetailRow icon={Clock} label="Concert Time" value={stop.concert_time} />}
              {stop.honorarium_amount && (
                <DetailRow icon={FileText} label="Honorarium" value={`$${stop.honorarium_amount.toLocaleString()}`} />
              )}
            </div>
          </div>

          {/* Host Info */}
          {(stop.host_name || stop.host_phone || stop.host_email) && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Host Information
              </h4>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <DetailRow icon={Users} label="Host" value={stop.host_name} />
                <DetailRow icon={Phone} label="Phone" value={stop.host_phone} />
                <DetailRow icon={Mail} label="Email" value={stop.host_email} />
                <DetailRow icon={MapPin} label="Location" value={stop.host_location} />
              </div>
            </div>
          )}

          {/* Travel Info */}
          {(stop.travel_from || stop.travel_to || stop.travel_distance_miles) && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Bus className="h-3.5 w-3.5" /> Travel & Transportation
              </h4>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <DetailRow icon={MapPin} label="From" value={stop.travel_from} />
                <DetailRow icon={MapPin} label="To" value={stop.travel_to} />
                {stop.travel_distance_miles && (
                  <DetailRow icon={Bus} label="Distance" value={`${stop.travel_distance_miles} miles`} />
                )}
                {stop.travel_duration_hours && (
                  <DetailRow icon={Clock} label="Drive Time" value={`${stop.travel_duration_hours} hours`} />
                )}
                {stop.departure_time && (
                  <DetailRow icon={Clock} label="Departure" value={format(new Date(stop.departure_time), 'h:mm a')} />
                )}
                {stop.arrival_time && (
                  <DetailRow icon={Clock} label="Arrival" value={format(new Date(stop.arrival_time), 'h:mm a')} />
                )}
                {busCompanyName && <DetailRow icon={Bus} label="Bus Company" value={busCompanyName} />}
                <DetailRow icon={FileText} label="Driver Notes" value={stop.driver_notes} />
              </div>
            </div>
          )}

          {/* Driver Utilization Analysis */}
          {(stop.travel_duration_hours || stop.driver_hours_before) ? (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Driver Utilization Analysis
              </h4>
              <div className={cn(
                "rounded-lg p-3 border",
                driverStatus === 'over' ? "bg-destructive/10 border-destructive/30" :
                driverStatus === 'warning' ? "bg-amber-500/10 border-amber-500/30" :
                "bg-emerald-500/10 border-emerald-500/30"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">
                    {totalDriverHours.toFixed(1)}h / {MAX_DRIVER_HOURS}h DOT limit
                  </span>
                  <Badge variant={driverStatus === 'over' ? 'destructive' : driverStatus === 'warning' ? 'outline' : 'default'}
                    className="text-[10px]">
                    {driverStatus === 'over' ? 'OVER LIMIT' : driverStatus === 'warning' ? 'Near Limit' : 'Available'}
                  </Badge>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      driverStatus === 'over' ? "bg-destructive" :
                      driverStatus === 'warning' ? "bg-amber-500" :
                      "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(driverUtilization, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] text-muted-foreground">
                  <div>Previous driving: {(stop.driver_hours_before || 0).toFixed(1)}h</div>
                  <div>This leg: {(stop.travel_duration_hours || 0).toFixed(1)}h</div>
                </div>
                {driverStatus === 'over' && (
                  <p className="text-[10px] text-destructive mt-2 font-medium">
                    ⚠️ Driver exceeds DOT {MAX_DRIVER_HOURS}-hour limit. A replacement driver or rest stop is required.
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Lodging */}
          {(stop.lodging_name || stop.lodging_address) && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Bed className="h-3.5 w-3.5" /> Lodging
              </h4>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <DetailRow icon={Bed} label="Hotel" value={stop.lodging_name} />
                <DetailRow icon={MapPin} label="Address" value={stop.lodging_address} />
                <DetailRow icon={Phone} label="Phone" value={stop.lodging_phone} />
              </div>
            </div>
          )}

          {/* Meals & Notes */}
          {(stop.meal_info || stop.notes || stop.description) && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5" /> Additional Info
              </h4>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <DetailRow icon={UtensilsCrossed} label="Meals" value={stop.meal_info} />
                <DetailRow icon={FileText} label="Notes" value={stop.notes} />
                <DetailRow icon={FileText} label="Description" value={stop.description} />
              </div>
            </div>
          )}

          {/* Edit Button */}
          {onEdit && (
            <Button className="w-full" onClick={() => onEdit(stop)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Tour Stop Details
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

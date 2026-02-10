import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bus, Users, X, UserPlus, Loader2, ChevronDown } from "lucide-react";
import { useBusSeats, BusSeat } from "@/hooks/useBusSeats";
import { cn } from "@/lib/utils";

export const BusBuddiesSection = () => {
  const { seats, rosterMembers, loading, assignSeat, clearSeat, assignDoubleSeat } = useBusSeats();
  const [activeSeat, setActiveSeat] = useState<string | null>(null);
  const [doubleMode, setDoubleMode] = useState(false);

  // Assigned user IDs
  const assignedUserIds = new Set(seats.filter(s => s.user_id).map(s => s.user_id!));
  const availableMembers = rosterMembers.filter(m => !assignedUserIds.has(m.user_id));

  const assignedCount = new Set(seats.filter(s => s.user_id).map(s => s.user_id!)).size;

  // Get seat by row and letter
  const getSeat = (row: number, letter: string): BusSeat | undefined =>
    seats.find(s => s.row_number === row && s.seat_letter === letter);

  // Get the adjacent seat letter (A↔B on left side, C↔D on right side)
  const getAdjacentLetter = (letter: string): string => {
    const map: Record<string, string> = { A: 'B', B: 'A', C: 'D', D: 'C' };
    return map[letter] || letter;
  };

  const handleAssign = async (seatId: string, userId: string) => {
    if (doubleMode) {
      const seat = seats.find(s => s.id === seatId);
      if (seat) {
        const adjLetter = getAdjacentLetter(seat.seat_letter);
        const adjSeat = getSeat(seat.row_number, adjLetter);
        if (adjSeat && !adjSeat.user_id) {
          await assignDoubleSeat(seatId, adjSeat.id, userId);
        } else {
          await assignSeat(seatId, userId);
        }
      }
    } else {
      await assignSeat(seatId, userId);
    }
    setActiveSeat(null);
    setDoubleMode(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-accent/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bus className="h-6 w-6 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Bus Seating Assignments</p>
              <p className="text-sm text-muted-foreground">
                25 rows × 4 seats with aisle. Click an empty seat to assign a roster member. Toggle "Double Seat" to give a member two adjacent seats.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {assignedCount} / {rosterMembers.length} assigned
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend & Controls */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-dashed border-muted-foreground/40" />
          <span className="text-muted-foreground">Empty</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/20 border border-primary/40" />
          <span className="text-muted-foreground">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-4 rounded bg-accent border border-primary/40" />
          <span className="text-muted-foreground">Double Seat</span>
        </div>
        <div className="ml-auto">
          <Button
            variant={doubleMode ? "default" : "outline"}
            size="sm"
            onClick={() => setDoubleMode(!doubleMode)}
          >
            {doubleMode ? "Double Seat Mode ON" : "Double Seat Mode"}
          </Button>
        </div>
      </div>

      {/* Bus Layout */}
      <div className="relative mx-auto max-w-lg">
        {/* Bus shell */}
        <div className="bg-card border-2 border-border rounded-t-[60px] rounded-b-2xl p-4 pt-10 pb-6 space-y-1">
          {/* Driver area */}
          <div className="flex justify-center mb-4">
            <div className="bg-muted rounded-full px-4 py-1 text-xs text-muted-foreground font-medium">
              🚌 Driver
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr_32px_1fr_1fr] gap-1 mb-2 text-center">
            <span className="text-xs text-muted-foreground font-medium">A</span>
            <span className="text-xs text-muted-foreground font-medium">B</span>
            <span />
            <span className="text-xs text-muted-foreground font-medium">C</span>
            <span className="text-xs text-muted-foreground font-medium">D</span>
          </div>

          {/* Rows */}
          {rows.map(row => {
            const seatA = getSeat(row, 'A');
            const seatB = getSeat(row, 'B');
            const seatC = getSeat(row, 'C');
            const seatD = getSeat(row, 'D');

            return (
              <div key={row} className="grid grid-cols-[1fr_1fr_32px_1fr_1fr] gap-1 items-center">
                <SeatCell seat={seatA} activeSeat={activeSeat} setActiveSeat={setActiveSeat} availableMembers={availableMembers} onAssign={handleAssign} onClear={clearSeat} doubleMode={doubleMode} adjacentSeat={seatB} />
                <SeatCell seat={seatB} activeSeat={activeSeat} setActiveSeat={setActiveSeat} availableMembers={availableMembers} onAssign={handleAssign} onClear={clearSeat} doubleMode={doubleMode} adjacentSeat={seatA} />
                {/* Aisle + row number */}
                <div className="flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground font-mono">{row}</span>
                </div>
                <SeatCell seat={seatC} activeSeat={activeSeat} setActiveSeat={setActiveSeat} availableMembers={availableMembers} onAssign={handleAssign} onClear={clearSeat} doubleMode={doubleMode} adjacentSeat={seatD} />
                <SeatCell seat={seatD} activeSeat={activeSeat} setActiveSeat={setActiveSeat} availableMembers={availableMembers} onAssign={handleAssign} onClear={clearSeat} doubleMode={doubleMode} adjacentSeat={seatC} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Unassigned Members */}
      {availableMembers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-foreground mb-3">
              Unassigned Roster Members ({availableMembers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {availableMembers.map(m => (
                <Badge key={m.user_id} variant="outline" className="gap-1 py-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-primary/10">
                      {(m.full_name || '?').split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {m.full_name || 'Unknown'}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Individual seat cell component
interface SeatCellProps {
  seat?: BusSeat;
  activeSeat: string | null;
  setActiveSeat: (id: string | null) => void;
  availableMembers: { user_id: string; full_name: string | null; voice_part: string | null; avatar_url: string | null }[];
  onAssign: (seatId: string, userId: string) => Promise<void>;
  onClear: (seatId: string) => Promise<boolean>;
  doubleMode: boolean;
  adjacentSeat?: BusSeat;
}

const SeatCell = ({ seat, activeSeat, setActiveSeat, availableMembers, onAssign, onClear, doubleMode, adjacentSeat }: SeatCellProps) => {
  if (!seat) return <div className="h-12" />;

  const isOccupied = !!seat.user_id;
  const isPairedSecondary = seat.paired_with_seat_id && seat.is_double_seat;
  const initials = seat.profile?.full_name
    ? seat.profile.full_name.split(' ').map(n => n[0]).join('')
    : '';

  // If this is a secondary paired seat, show merged visual
  if (isPairedSecondary && seat.paired_with_seat_id) {
    const primary = seat.paired_with_seat_id;
    // Only show clear on one of the paired seats
    return (
      <div
        className="h-12 rounded bg-accent/60 border border-primary/30 flex items-center justify-center cursor-pointer hover:bg-accent/80 transition-colors"
        onClick={() => onClear(seat.id)}
        title={`${seat.profile?.full_name || 'Double seat'} — click to clear`}
      >
        <span className="text-[9px] text-muted-foreground">2×</span>
      </div>
    );
  }

  if (isOccupied) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "h-12 rounded flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer",
              "bg-primary/15 border border-primary/30 hover:bg-primary/25"
            )}
            title={seat.profile?.full_name || 'Assigned'}
          >
            <Avatar className="h-5 w-5">
              <AvatarImage src={seat.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-[8px] text-foreground font-medium truncate max-w-full px-0.5 leading-tight">
              {seat.profile?.full_name?.split(' ')[0] || '?'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3" side="right">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{seat.profile?.full_name}</p>
            <p className="text-xs text-muted-foreground">
              Row {seat.row_number}, Seat {seat.seat_letter}
              {seat.profile?.voice_part && ` • ${seat.profile.voice_part}`}
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => onClear(seat.id)}
            >
              <X className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Empty seat — show assign popover
  const canDouble = doubleMode && adjacentSeat && !adjacentSeat.user_id;

  return (
    <Popover open={activeSeat === seat.id} onOpenChange={(open) => setActiveSeat(open ? seat.id : null)}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-12 rounded border-2 border-dashed transition-colors flex items-center justify-center",
            "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5",
            activeSeat === seat.id && "border-primary bg-primary/10"
          )}
          title={`Row ${seat.row_number}, Seat ${seat.seat_letter} — click to assign`}
        >
          <UserPlus className="h-3 w-3 text-muted-foreground/40" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" side="right">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-1">
            Row {seat.row_number}, Seat {seat.seat_letter}
            {canDouble && " (Double seat mode)"}
          </p>
          {availableMembers.length === 0 ? (
            <p className="text-xs text-muted-foreground">All roster members assigned</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {availableMembers.map(m => (
                <button
                  key={m.user_id}
                  className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-left transition-colors"
                  onClick={() => onAssign(seat.id, m.user_id)}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback className="text-[8px] bg-primary/10">
                      {(m.full_name || '?').split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{m.full_name}</p>
                    {m.voice_part && <p className="text-[10px] text-muted-foreground">{m.voice_part}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

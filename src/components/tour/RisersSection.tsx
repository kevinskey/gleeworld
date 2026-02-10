import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, UserPlus, X, RotateCcw, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RosterMember {
  user_id: string;
  full_name: string | null;
  voice_part: string | null;
}

interface RiserSpot {
  row: number;
  position: number;
  userId: string | null;
  memberName: string | null;
}

const ROWS = 4;
const POSITIONS_PER_ROW = 12;
const ROW_LABELS = ['Row 4 (Back)', 'Row 3', 'Row 2', 'Row 1 (Front)'];

export const RisersSection = () => {
  const [spots, setSpots] = useState<RiserSpot[]>([]);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Initialize empty grid
  const initEmptyGrid = useCallback((): RiserSpot[] => {
    const grid: RiserSpot[] = [];
    for (let r = 1; r <= ROWS; r++) {
      for (let p = 1; p <= POSITIONS_PER_ROW; p++) {
        grid.push({ row: r, position: p, userId: null, memberName: null });
      }
    }
    return grid;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [riserRes, rosterRes] = await Promise.all([
        supabase
          .from('gw_tour_risers')
          .select('row_number, position, user_id')
          .eq('template_name', 'Default'),
        supabase
          .from('gw_tour_roster')
          .select('user_id, gw_profiles(full_name, voice_part)')
          .eq('status', 'confirmed'),
      ]);

      // Build roster list
      const members: RosterMember[] = (rosterRes.data || []).map((r: any) => ({
        user_id: r.user_id,
        full_name: r.gw_profiles?.full_name || 'Unknown',
        voice_part: r.gw_profiles?.voice_part || null,
      }));
      setRoster(members);

      // Build grid with saved data
      const grid = initEmptyGrid();
      const saved = riserRes.data || [];
      for (const s of saved) {
        const idx = grid.findIndex(g => g.row === s.row_number && g.position === s.position);
        if (idx !== -1 && s.user_id) {
          const member = members.find(m => m.user_id === s.user_id);
          grid[idx].userId = s.user_id;
          grid[idx].memberName = member?.full_name || 'Unknown';
        }
      }
      setSpots(grid);
    } catch (err) {
      console.error('Error loading risers:', err);
    } finally {
      setLoading(false);
    }
  }, [initEmptyGrid]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const assignedUserIds = spots.filter(s => s.userId).map(s => s.userId!);
  const availableMembers = roster.filter(m => !assignedUserIds.includes(m.user_id));
  const assignedCount = assignedUserIds.length;

  const handleAssign = (row: number, position: number, member: RosterMember) => {
    setSpots(prev =>
      prev.map(s =>
        s.row === row && s.position === position
          ? { ...s, userId: member.user_id, memberName: member.full_name }
          : s
      )
    );
  };

  const handleClear = (row: number, position: number) => {
    setSpots(prev =>
      prev.map(s =>
        s.row === row && s.position === position
          ? { ...s, userId: null, memberName: null }
          : s
      )
    );
  };

  const handleReset = () => {
    setSpots(initEmptyGrid());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session?.session?.user?.id || null;

      // Delete existing then insert
      await supabase.from('gw_tour_risers').delete().eq('template_name', 'Default');

      const rows = spots
        .filter(s => s.userId)
        .map(s => ({
          template_name: 'Default',
          row_number: s.row,
          position: s.position,
          user_id: s.userId,
          created_by: uid,
        }));

      if (rows.length > 0) {
        const { error } = await supabase.from('gw_tour_risers').insert(rows);
        if (error) throw error;
      }

      toast({ title: 'Risers saved successfully' });
    } catch (err: any) {
      console.error('Error saving risers:', err);
      toast({ title: 'Error saving risers', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Riser Positions
          </h2>
          <p className="text-sm text-muted-foreground">
            {assignedCount} of {roster.length} roster members placed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-primary">{roster.length}</p>
          <p className="text-xs text-muted-foreground">Tour Roster</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{assignedCount}</p>
          <p className="text-xs text-muted-foreground">Placed</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{availableMembers.length}</p>
          <p className="text-xs text-muted-foreground">Unplaced</p>
        </Card>
      </div>

      {/* Riser Grid - rendered back row (4) to front row (1) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-center">🎤 Stage View (Audience Perspective)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          {[4, 3, 2, 1].map(rowNum => {
            const rowSpots = spots.filter(s => s.row === rowNum);
            const label = ROW_LABELS[4 - rowNum];
            return (
              <div key={rowNum} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div
                  className="grid gap-1.5"
                  style={{ gridTemplateColumns: 'repeat(12, minmax(70px, 1fr))' }}
                >
                  {rowSpots.map(spot => (
                    <RiserSpotCell
                      key={`${spot.row}-${spot.position}`}
                      spot={spot}
                      availableMembers={availableMembers}
                      onAssign={handleAssign}
                      onClear={handleClear}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {/* Stage indicator */}
          <div className="mt-4 border-t-4 border-primary/30 pt-2 text-center">
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              Stage Front / Audience
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Unplaced Members */}
      {availableMembers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unplaced Members ({availableMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {availableMembers.map(m => (
                <Badge key={m.user_id} variant="outline" className="text-xs">
                  {m.full_name}
                  {m.voice_part && <span className="ml-1 opacity-60">({m.voice_part})</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Individual riser spot cell
const RiserSpotCell = ({
  spot,
  availableMembers,
  onAssign,
  onClear,
}: {
  spot: RiserSpot;
  availableMembers: RosterMember[];
  onAssign: (row: number, pos: number, member: RosterMember) => void;
  onClear: (row: number, pos: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = availableMembers.filter(m =>
    (m.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (spot.userId) {
    return (
      <div
        className={cn(
          'relative group rounded-md border border-primary/30 bg-primary/5 p-1.5 min-h-[52px] flex flex-col items-center justify-center text-center cursor-default'
        )}
      >
        <span className="text-[10px] font-medium leading-tight line-clamp-2">
          {spot.memberName}
        </span>
        <button
          onClick={() => onClear(spot.row, spot.position)}
          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 p-1.5 min-h-[52px] flex flex-col items-center justify-center text-center',
            'hover:border-primary/50 hover:bg-primary/5 transition-colors'
          )}
        >
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-[9px] text-muted-foreground/50 mt-0.5">{spot.position}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="center">
        <Input
          placeholder="Search roster..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-7 text-xs mb-2"
          autoFocus
        />
        <ScrollArea className="max-h-48">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No members found</p>
          ) : (
            filtered.map(m => (
              <button
                key={m.user_id}
                onClick={() => {
                  onAssign(spot.row, spot.position, m);
                  setOpen(false);
                  setSearch('');
                }}
                className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center justify-between"
              >
                <span>{m.full_name}</span>
                {m.voice_part && (
                  <span className="text-[10px] text-muted-foreground">{m.voice_part}</span>
                )}
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

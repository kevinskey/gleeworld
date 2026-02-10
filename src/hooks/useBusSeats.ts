import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BusSeat {
  id: string;
  row_number: number;
  seat_letter: string;
  user_id: string | null;
  is_double_seat: boolean;
  paired_with_seat_id: string | null;
  notes: string | null;
  profile?: {
    full_name: string | null;
    voice_part: string | null;
    avatar_url: string | null;
  } | null;
}

export interface RosterMember {
  user_id: string;
  full_name: string | null;
  voice_part: string | null;
  avatar_url: string | null;
}

export const useBusSeats = () => {
  const [seats, setSeats] = useState<BusSeat[]>([]);
  const [rosterMembers, setRosterMembers] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_bus_seats')
        .select('*')
        .order('row_number')
        .order('seat_letter');

      if (error) throw error;

      // Get profiles for assigned seats
      const userIds = (data || []).filter(s => s.user_id).map(s => s.user_id!);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, voice_part, avatar_url')
          .in('user_id', userIds);
        profiles = pData || [];
      }

      setSeats((data || []).map(s => ({
        ...s,
        profile: s.user_id ? profiles.find(p => p.user_id === s.user_id) || null : null,
      })));
    } catch (err) {
      console.error('Error fetching bus seats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoster = useCallback(async () => {
    const { data: rosterData } = await supabase
      .from('gw_tour_roster')
      .select('user_id')
      .in('status', ['confirmed', 'pending']);

    if (!rosterData || rosterData.length === 0) {
      setRosterMembers([]);
      return;
    }

    const { data } = await supabase
      .from('gw_profiles')
      .select('user_id, full_name, voice_part, avatar_url')
      .in('user_id', rosterData.map(r => r.user_id))
      .order('full_name');

    setRosterMembers(data || []);
  }, []);

  const assignSeat = async (seatId: string, userId: string) => {
    const { error } = await supabase
      .from('gw_bus_seats')
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq('id', seatId);

    if (error) {
      toast({ title: 'Error assigning seat', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchSeats();
    return true;
  };

  const clearSeat = async (seatId: string) => {
    // Also clear any paired seat
    const seat = seats.find(s => s.id === seatId);
    if (seat?.is_double_seat && seat.paired_with_seat_id) {
      await supabase
        .from('gw_bus_seats')
        .update({ user_id: null, is_double_seat: false, paired_with_seat_id: null, updated_at: new Date().toISOString() })
        .eq('id', seat.paired_with_seat_id);
    }
    // Clear seats paired TO this one
    const pairedToThis = seats.find(s => s.paired_with_seat_id === seatId);
    if (pairedToThis) {
      await supabase
        .from('gw_bus_seats')
        .update({ is_double_seat: false, paired_with_seat_id: null, updated_at: new Date().toISOString() })
        .eq('id', pairedToThis.id);
    }

    const { error } = await supabase
      .from('gw_bus_seats')
      .update({ user_id: null, is_double_seat: false, paired_with_seat_id: null, updated_at: new Date().toISOString() })
      .eq('id', seatId);

    if (error) {
      toast({ title: 'Error clearing seat', description: error.message, variant: 'destructive' });
      return false;
    }
    await fetchSeats();
    return true;
  };

  const assignDoubleSeat = async (seatId: string, adjacentSeatId: string, userId: string) => {
    // Assign user to primary seat, mark adjacent as double/paired
    const { error: e1 } = await supabase
      .from('gw_bus_seats')
      .update({ user_id: userId, is_double_seat: true, paired_with_seat_id: adjacentSeatId, updated_at: new Date().toISOString() })
      .eq('id', seatId);

    const { error: e2 } = await supabase
      .from('gw_bus_seats')
      .update({ user_id: userId, is_double_seat: true, paired_with_seat_id: seatId, updated_at: new Date().toISOString() })
      .eq('id', adjacentSeatId);

    if (e1 || e2) {
      toast({ title: 'Error assigning double seat', variant: 'destructive' });
      return false;
    }
    await fetchSeats();
    return true;
  };

  useEffect(() => {
    fetchSeats();
    fetchRoster();
  }, [fetchSeats, fetchRoster]);

  return { seats, rosterMembers, loading, assignSeat, clearSeat, assignDoubleSeat, refetch: fetchSeats };
};

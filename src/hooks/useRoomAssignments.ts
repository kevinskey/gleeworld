import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RoomOccupant {
  id: string;
  room_assignment_id: string;
  user_id: string;
  created_at: string;
  // Joined profile data
  profile?: {
    full_name: string | null;
    voice_part: string | null;
    avatar_url: string | null;
  };
}

export interface RoomAssignment {
  id: string;
  hotel_id: string | null;
  room_number: string;
  floor: string | null;
  room_type: string;
  max_occupants: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined hotel data
  hotel?: {
    hotel_name: string;
    city: string;
    state: string | null;
    check_in_date: string | null;
    check_out_date: string | null;
  };
  // Occupants
  occupants: RoomOccupant[];
}

export interface TourHotel {
  id: string;
  hotel_name: string;
  city: string;
  state: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  room_count: number | null;
}

export const useRoomAssignments = () => {
  const [rooms, setRooms] = useState<RoomAssignment[]>([]);
  const [hotels, setHotels] = useState<TourHotel[]>([]);
  const [members, setMembers] = useState<{ user_id: string; full_name: string | null; voice_part: string | null; avatar_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHotels = useCallback(async () => {
    const { data, error } = await supabase
      .from('gw_tour_hotels')
      .select('id, hotel_name, city, state, check_in_date, check_out_date, room_count')
      .order('check_in_date', { ascending: true });
    if (!error && data) setHotels(data);
  }, []);

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('gw_profiles')
      .select('user_id, full_name, voice_part, avatar_url')
      .eq('role', 'member')
      .order('full_name');
    if (!error && data) setMembers(data);
  }, []);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch room assignments with hotel info
      const { data: roomData, error: roomError } = await supabase
        .from('gw_room_assignments')
        .select(`
          *,
          gw_tour_hotels (
            hotel_name, city, state, check_in_date, check_out_date
          )
        `)
        .order('room_number');

      if (roomError) throw roomError;

      // Fetch occupants for all rooms
      const roomIds = (roomData || []).map(r => r.id);
      let occupantsData: any[] = [];
      
      if (roomIds.length > 0) {
        const { data: occData, error: occError } = await supabase
          .from('gw_room_occupants')
          .select('*')
          .in('room_assignment_id', roomIds);
        
        if (!occError && occData) {
          // Fetch profile info for occupants
          const userIds = occData.map(o => o.user_id);
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('gw_profiles')
              .select('user_id, full_name, voice_part, avatar_url')
              .in('user_id', userIds);
            
            occupantsData = occData.map(o => ({
              ...o,
              profile: profiles?.find(p => p.user_id === o.user_id) || null,
            }));
          } else {
            occupantsData = occData;
          }
        }
      }

      const enrichedRooms: RoomAssignment[] = (roomData || []).map(room => ({
        ...room,
        room_type: room.room_type || 'standard',
        max_occupants: room.max_occupants || 2,
        hotel: room.gw_tour_hotels || undefined,
        occupants: occupantsData.filter(o => o.room_assignment_id === room.id),
      }));

      setRooms(enrichedRooms);
    } catch (err) {
      console.error('Error fetching room assignments:', err);
      toast({ title: 'Error loading room assignments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createRoom = async (data: {
    hotel_id: string | null;
    room_number: string;
    floor?: string;
    room_type?: string;
    max_occupants?: number;
    notes?: string;
  }) => {
    const { data: session } = await supabase.auth.getSession();
    const { error } = await supabase.from('gw_room_assignments').insert({
      ...data,
      created_by: session?.session?.user?.id || null,
    });
    if (error) {
      toast({ title: 'Error creating room', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Room created successfully' });
    fetchRooms();
    return true;
  };

  const updateRoom = async (id: string, data: Partial<{
    hotel_id: string | null;
    room_number: string;
    floor: string;
    room_type: string;
    max_occupants: number;
    notes: string;
  }>) => {
    const { error } = await supabase.from('gw_room_assignments').update(data).eq('id', id);
    if (error) {
      toast({ title: 'Error updating room', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Room updated' });
    fetchRooms();
    return true;
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from('gw_room_assignments').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting room', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Room deleted' });
    fetchRooms();
    return true;
  };

  const addOccupant = async (roomId: string, userId: string) => {
    const { error } = await supabase.from('gw_room_occupants').insert({
      room_assignment_id: roomId,
      user_id: userId,
    });
    if (error) {
      toast({ title: 'Error adding member', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Member assigned to room' });
    fetchRooms();
    return true;
  };

  const removeOccupant = async (occupantId: string) => {
    const { error } = await supabase.from('gw_room_occupants').delete().eq('id', occupantId);
    if (error) {
      toast({ title: 'Error removing member', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Member removed from room' });
    fetchRooms();
    return true;
  };

  useEffect(() => {
    fetchRooms();
    fetchHotels();
    fetchMembers();
  }, [fetchRooms, fetchHotels, fetchMembers]);

  return {
    rooms,
    hotels,
    members,
    loading,
    refetch: fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    addOccupant,
    removeOccupant,
  };
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { debounce } from 'lodash';

export interface MeetingNotes {
  id: string;
  room_name: string;
  title: string | null;
  attendees: string[];
  agenda: string | null;
  discussion: string | null;
  decisions: string | null;
  action_items: string | null;
  additional_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export const useMeetingNotes = (roomName: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<MeetingNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const notesIdRef = useRef<string | null>(null);

  // Fetch or create meeting notes
  const fetchOrCreateNotes = useCallback(async () => {
    if (!roomName) return;
    
    setLoading(true);
    try {
      // First try to find existing active notes for this room
      const { data: existing, error: fetchError } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('room_name', roomName)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setNotes(existing as MeetingNotes);
        notesIdRef.current = existing.id;
      } else {
        // Create new notes for this meeting
        const { data: newNotes, error: createError } = await supabase
          .from('meeting_notes')
          .insert({
            room_name: roomName,
            title: `Meeting - ${new Date().toLocaleDateString()}`,
            attendees: [],
            created_by: user?.id
          })
          .select()
          .single();

        if (createError) throw createError;
        setNotes(newNotes as MeetingNotes);
        notesIdRef.current = newNotes.id;
      }
    } catch (error) {
      console.error('Error fetching/creating meeting notes:', error);
      toast({
        title: "Error",
        description: "Failed to load meeting notes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [roomName, user?.id, toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!notesIdRef.current) return;

    const channel = supabase
      .channel(`meeting-notes-${notesIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_notes',
          filter: `id=eq.${notesIdRef.current}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          setNotes(payload.new as MeetingNotes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notes?.id]);

  // Initialize on mount
  useEffect(() => {
    fetchOrCreateNotes();
  }, [fetchOrCreateNotes]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (updates: Partial<MeetingNotes>) => {
      if (!notesIdRef.current) return;
      
      setSaving(true);
      try {
        const { error } = await supabase
          .from('meeting_notes')
          .update(updates)
          .eq('id', notesIdRef.current);

        if (error) throw error;
      } catch (error) {
        console.error('Error saving meeting notes:', error);
        toast({
          title: "Error",
          description: "Failed to save changes",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
    }, 500),
    [toast]
  );

  // Update a field
  const updateField = useCallback((field: keyof MeetingNotes, value: any) => {
    setNotes(prev => prev ? { ...prev, [field]: value } : null);
    debouncedSave({ [field]: value });
  }, [debouncedSave]);

  // Add attendee
  const addAttendee = useCallback((name: string) => {
    if (!notes) return;
    const newAttendees = [...(notes.attendees || []), name];
    updateField('attendees', newAttendees);
  }, [notes, updateField]);

  // Remove attendee
  const removeAttendee = useCallback((index: number) => {
    if (!notes) return;
    const newAttendees = notes.attendees.filter((_, i) => i !== index);
    updateField('attendees', newAttendees);
  }, [notes, updateField]);

  // End meeting (mark notes as inactive for archiving)
  const endMeeting = useCallback(async () => {
    if (!notesIdRef.current) return;
    
    try {
      const { error } = await supabase
        .from('meeting_notes')
        .update({ is_active: false })
        .eq('id', notesIdRef.current);

      if (error) throw error;
      
      toast({
        title: "Meeting notes saved",
        description: "Your meeting minutes have been saved and can be retrieved later."
      });
    } catch (error) {
      console.error('Error ending meeting notes:', error);
    }
  }, [toast]);

  return {
    notes,
    loading,
    saving,
    updateField,
    addAttendee,
    removeAttendee,
    endMeeting,
    refresh: fetchOrCreateNotes
  };
};

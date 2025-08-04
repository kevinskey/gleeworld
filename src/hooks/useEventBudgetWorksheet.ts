import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface FoodBudgetItem {
  id: string;
  event_id: string;
  item: string;
  qty: number;
  unit_cost: number;
  total: number;
  vendor_url?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialsBudgetItem {
  id: string;
  event_id: string;
  item: string;
  purpose?: string;
  qty: number;
  cost: number;
  vendor_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TransportBudgetItem {
  id: string;
  event_id: string;
  item: string;
  description?: string;
  cost: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MediaBudgetItem {
  id: string;
  event_id: string;
  item: string;
  qty: number;
  cost: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PromoBudgetItem {
  id: string;
  event_id: string;
  item: string;
  description?: string;
  cost: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetAttachment {
  id: string;
  event_id: string;
  filename: string;
  file_url: string;
  file_type?: string;
  uploaded_by?: string;
  created_at: string;
}

export interface EventBudget {
  id: string;
  event_name?: string;
  event_type: string;
  event_date_start?: string;
  event_date_end?: string;
  location?: string;
  coordinator_id?: string;
  purpose?: string;
  attendees: number;
  volunteers: number;
  guest_speakers?: string;
  honoraria: number;
  misc_supplies: number;
  admin_fees: number;
  contingency: number;
  ticket_sales: number;
  donations: number;
  club_support: number;
  total_expenses: number;
  total_income: number;
  net_total: number;
  budget_status: string;
  title?: string;
  start_date?: string;
  end_date?: string;
}

type BudgetTableName = 'food_budget' | 'materials_budget' | 'transport_budget' | 'media_budget' | 'promo_budget';

export const useEventBudgetWorksheet = (eventId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [eventBudget, setEventBudget] = useState<EventBudget | null>(null);
  const [foodBudget, setFoodBudget] = useState<FoodBudgetItem[]>([]);
  const [materialsBudget, setMaterialsBudget] = useState<MaterialsBudgetItem[]>([]);
  const [transportBudget, setTransportBudget] = useState<TransportBudgetItem[]>([]);
  const [mediaBudget, setMediaBudget] = useState<MediaBudgetItem[]>([]);
  const [promoBudget, setPromoBudget] = useState<PromoBudgetItem[]>([]);
  const [attachments, setAttachments] = useState<BudgetAttachment[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEventBudget = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      setError(null);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      setEventBudget(eventData);

      // Fetch all budget categories
      const [foodResponse, materialsResponse, transportResponse, mediaResponse, promoResponse, attachmentsResponse, usersResponse, teamResponse] = await Promise.all([
        supabase.from('food_budget').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('materials_budget').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('transport_budget').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('media_budget').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('promo_budget').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('budget_attachments').select('*').eq('event_id', eventId).order('created_at'),
        supabase.from('gw_profiles').select('user_id, full_name, email').order('full_name'),
        supabase.from('event_team_members').select('*, profiles(id, full_name, email)').eq('event_id', eventId)
      ]);

      if (foodResponse.error) throw foodResponse.error;
      if (materialsResponse.error) throw materialsResponse.error;
      if (transportResponse.error) throw transportResponse.error;
      if (mediaResponse.error) throw mediaResponse.error;
      if (promoResponse.error) throw promoResponse.error;
      if (attachmentsResponse.error) throw attachmentsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (teamResponse.error) throw teamResponse.error;

      setFoodBudget(foodResponse.data || []);
      setMaterialsBudget(materialsResponse.data || []);
      setTransportBudget(transportResponse.data || []);
      setMediaBudget(mediaResponse.data || []);
      setPromoBudget(promoResponse.data || []);
      setAttachments(attachmentsResponse.data || []);
      setUsers(usersResponse.data || []);
      setTeamMembers(teamResponse.data || []);

    } catch (err) {
      console.error('Error fetching budget data:', err);
      setError('Failed to load budget data');
      toast({
        title: "Error",
        description: "Failed to load budget data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEventBudget = async (updates: Partial<EventBudget>) => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      setEventBudget(data);
      toast({
        title: "Success",
        description: "Budget updated successfully",
      });

      return data;
    } catch (err) {
      console.error('Error updating budget:', err);
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive",
      });
      return null;
    }
  };

  const addFoodBudgetItem = async (item: Omit<FoodBudgetItem, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('food_budget')
        .insert([{ ...item, event_id: eventId }])
        .select()
        .single();

      if (error) throw error;

      setFoodBudget(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Food budget item added successfully",
      });

      return data;
    } catch (err) {
      console.error('Error adding food budget item:', err);
      toast({
        title: "Error",
        description: "Failed to add food budget item",
        variant: "destructive",
      });
      return null;
    }
  };

  const addMaterialsBudgetItem = async (item: Omit<MaterialsBudgetItem, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('materials_budget')
        .insert([{ ...item, event_id: eventId }])
        .select()
        .single();

      if (error) throw error;

      setMaterialsBudget(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Materials budget item added successfully",
      });

      return data;
    } catch (err) {
      console.error('Error adding materials budget item:', err);
      toast({
        title: "Error",
        description: "Failed to add materials budget item",
        variant: "destructive",
      });
      return null;
    }
  };

  const addTransportBudgetItem = async (item: Omit<TransportBudgetItem, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('transport_budget')
        .insert([{ ...item, event_id: eventId }])
        .select()
        .single();

      if (error) throw error;

      setTransportBudget(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Transport budget item added successfully",
      });

      return data;
    } catch (err) {
      console.error('Error adding transport budget item:', err);
      toast({
        title: "Error",
        description: "Failed to add transport budget item",
        variant: "destructive",
      });
      return null;
    }
  };

  const addMediaBudgetItem = async (item: Omit<MediaBudgetItem, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('media_budget')
        .insert([{ ...item, event_id: eventId }])
        .select()
        .single();

      if (error) throw error;

      setMediaBudget(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Media budget item added successfully",
      });

      return data;
    } catch (err) {
      console.error('Error adding media budget item:', err);
      toast({
        title: "Error",
        description: "Failed to add media budget item",
        variant: "destructive",
      });
      return null;
    }
  };

  const addPromoBudgetItem = async (item: Omit<PromoBudgetItem, 'id' | 'event_id' | 'created_at' | 'updated_at'>) => {
    if (!eventId) return;

    try {
      const { data, error } = await supabase
        .from('promo_budget')
        .insert([{ ...item, event_id: eventId }])
        .select()
        .single();

      if (error) throw error;

      setPromoBudget(prev => [...prev, data]);
      toast({
        title: "Success",
        description: "Promo budget item added successfully",
      });

      return data;
    } catch (err) {
      console.error('Error adding promo budget item:', err);
      toast({
        title: "Error",
        description: "Failed to add promo budget item",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateBudgetItem = async (table: BudgetTableName, id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update the appropriate state
      switch (table) {
        case 'food_budget':
          setFoodBudget(prev => prev.map(item => item.id === id ? data as FoodBudgetItem : item));
          break;
        case 'materials_budget':
          setMaterialsBudget(prev => prev.map(item => item.id === id ? data as MaterialsBudgetItem : item));
          break;
        case 'transport_budget':
          setTransportBudget(prev => prev.map(item => item.id === id ? data as TransportBudgetItem : item));
          break;
        case 'media_budget':
          setMediaBudget(prev => prev.map(item => item.id === id ? data as MediaBudgetItem : item));
          break;
        case 'promo_budget':
          setPromoBudget(prev => prev.map(item => item.id === id ? data as PromoBudgetItem : item));
          break;
      }

      return data;
    } catch (err) {
      console.error('Error updating budget item:', err);
      toast({
        title: "Error",
        description: "Failed to update budget item",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteBudgetItem = async (table: BudgetTableName, id: string) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update the appropriate state
      switch (table) {
        case 'food_budget':
          setFoodBudget(prev => prev.filter(item => item.id !== id));
          break;
        case 'materials_budget':
          setMaterialsBudget(prev => prev.filter(item => item.id !== id));
          break;
        case 'transport_budget':
          setTransportBudget(prev => prev.filter(item => item.id !== id));
          break;
        case 'media_budget':
          setMediaBudget(prev => prev.filter(item => item.id !== id));
          break;
        case 'promo_budget':
          setPromoBudget(prev => prev.filter(item => item.id !== id));
          break;
      }

      toast({
        title: "Success",
        description: "Budget item deleted successfully",
      });
    } catch (err) {
      console.error('Error deleting budget item:', err);
      toast({
        title: "Error",
        description: "Failed to delete budget item",
        variant: "destructive",
      });
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!eventId) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${eventId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      const { data: attachmentData, error: attachmentError } = await supabase
        .from('budget_attachments')
        .insert([{
          event_id: eventId,
          filename: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          uploaded_by: user?.id
        }])
        .select()
        .single();

      if (attachmentError) throw attachmentError;

      setAttachments(prev => [...prev, attachmentData]);
      
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      return attachmentData;
    } catch (err) {
      console.error('Error uploading file:', err);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      return null;
    }
  };

  useEffect(() => {
    fetchEventBudget();
  }, [eventId]);

  return {
    eventBudget,
    foodBudget,
    materialsBudget,
    transportBudget,
    mediaBudget,
    promoBudget,
    attachments,
    users,
    teamMembers,
    loading,
    error,
    updateEventBudget,
    addFoodBudgetItem,
    addMaterialsBudgetItem,
    addTransportBudgetItem,
    addMediaBudgetItem,
    addPromoBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    uploadAttachment,
    refetch: fetchEventBudget
  };
};
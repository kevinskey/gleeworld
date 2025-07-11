import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DashboardSetting {
  id: string;
  setting_name: string;
  setting_value: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useDashboardSettings = () => {
  const [settings, setSettings] = useState<DashboardSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dashboard_settings')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      setSettings(data || []);
    } catch (error: any) {
      console.error('Error fetching dashboard settings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingName: string, settingValue?: string, imageUrl?: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_settings')
        .update({
          setting_value: settingValue,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('setting_name', settingName);

      if (error) throw error;

      toast({
        title: "Settings updated",
        description: "Dashboard settings have been successfully updated.",
      });

      fetchSettings(); // Refresh settings
    } catch (error: any) {
      console.error('Error updating dashboard setting:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSettingByName = (settingName: string): DashboardSetting | null => {
    return settings.find(setting => setting.setting_name === settingName) || null;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateSetting,
    getSettingByName,
    refetch: fetchSettings
  };
};
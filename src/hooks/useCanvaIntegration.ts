import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CanvaDesign {
  id: string;
  title: string;
  editUrl: string;
  viewUrl: string;
}

interface CanvaExportData {
  downloadUrl: string;
  jobId: string;
}

export const useCanvaIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const initiateOAuth = async (returnUrl: string): Promise<string | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('canva-oauth-init', {
        body: { returnUrl }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to initiate OAuth');

      return data.authUrl;
    } catch (error: any) {
      console.error('Error initiating Canva OAuth:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createDesign = async (title: string, templateId?: string): Promise<CanvaDesign | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('canva-create-design', {
        body: { 
          title,
          width: 2550,  // Letter size width in pixels (8.5" x 300 DPI)
          height: 3300, // Letter size height in pixels (11" x 300 DPI)
          ...(templateId && { templateId })
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to create design');

      return data.design;
    } catch (error: any) {
      console.error('Error creating Canva design:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportDesign = async (designId: string, format: 'pdf' | 'png' | 'jpg' = 'pdf'): Promise<CanvaExportData | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('canva-export-design', {
        body: { 
          designId,
          format
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to export design');

      return {
        downloadUrl: data.downloadUrl,
        jobId: data.jobId
      };
    } catch (error: any) {
      console.error('Error exporting Canva design:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    initiateOAuth,
    createDesign,
    exportDesign,
    loading,
    accessToken,
    setAccessToken
  };
};

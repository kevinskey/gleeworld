import { useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const DashboardBackgroundUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [currentBackground, setCurrentBackground] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load current background on mount
  useState(() => {
    const loadCurrentBackground = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('dashboard_background_url')
        .eq('user_id', user.id)
        .single();
      
      if (data?.dashboard_background_url) {
        setCurrentBackground(data.dashboard_background_url);
      }
    };
    
    loadCurrentBackground();
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, WEBP)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Delete old background if exists
      if (currentBackground) {
        const oldPath = currentBackground.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('dashboard-backgrounds')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new background
      const fileExt = file.name.split('.').pop();
      const fileName = `background-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dashboard-backgrounds')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dashboard-backgrounds')
        .getPublicUrl(filePath);

      // Update profile with new background URL
      const { error: updateError } = await supabase
        .from('gw_profiles')
        .update({ dashboard_background_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCurrentBackground(publicUrl);

      toast({
        title: 'Background updated',
        description: 'Your dashboard background has been updated successfully',
      });

      // Reload page to show new background
      setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
      console.error('Error uploading background:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload dashboard background',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!user?.id || !currentBackground) return;

    setUploading(true);

    try {
      // Delete from storage
      const oldPath = currentBackground.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('dashboard-backgrounds')
          .remove([`${user.id}/${oldPath}`]);
      }

      // Update profile to remove background URL
      const { error } = await supabase
        .from('gw_profiles')
        .update({ dashboard_background_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentBackground(null);

      toast({
        title: 'Background removed',
        description: 'Your custom dashboard background has been removed',
      });

      // Reload page to show default background
      setTimeout(() => window.location.reload(), 1000);

    } catch (error) {
      console.error('Error removing background:', error);
      toast({
        title: 'Remove failed',
        description: 'Failed to remove dashboard background',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Dashboard Background</h3>
      </div>

      {currentBackground && (
        <div className="relative group">
          <img
            src={currentBackground}
            alt="Dashboard background"
            className="w-full h-24 object-cover rounded-md"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemoveBackground}
            disabled={uploading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={uploading}
          onClick={() => document.getElementById('dashboard-bg-upload')?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {currentBackground ? 'Change' : 'Upload'} Background
        </Button>
        <input
          id="dashboard-bg-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Upload an image to customize your dashboard background (max 5MB)
      </p>
    </div>
  );
};

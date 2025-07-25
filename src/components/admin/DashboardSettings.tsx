import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { Upload, Image, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useToast } from "@/hooks/use-toast";

export const DashboardSettings = () => {
  const { settings, loading, error, updateSetting, getSettingByName, refetch } = useDashboardSettings();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const welcomeCardSetting = getSettingByName('welcome_card_background');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB.",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `dashboard-welcome-bg-${Math.random()}.${fileExt}`;
      const filePath = `dashboard-backgrounds/${fileName}`;

      setUploadProgress(50);

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(75);

      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(filePath);

      setUploadProgress(90);

      await updateSetting('welcome_card_background', 'custom', publicUrl);

      setUploadProgress(100);
      
      toast({
        title: "Success",
        description: "Welcome card background updated successfully!",
      });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveBackground = async () => {
    try {
      await updateSetting('welcome_card_background', 'default', null);
      toast({
        title: "Success",
        description: "Welcome card background removed successfully!",
      });
    } catch (error: any) {
      console.error('Error removing background:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading dashboard settings..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Settings</h1>
        <p className="text-gray-600">Manage global dashboard appearance and settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Image className="h-5 w-5 mr-2" />
            Welcome Card Background
          </CardTitle>
          <CardDescription>
            Set a background image for the welcome card that appears on all user dashboards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Background Preview */}
          {welcomeCardSetting?.image_url && (
            <div className="space-y-2">
              <Label>Current Background</Label>
              <div className="relative">
                <img
                  src={welcomeCardSetting.image_url}
                  alt="Current welcome card background"
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveBackground}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Upload New Background */}
          <div className="space-y-2">
            <Label htmlFor="background-upload">
              {welcomeCardSetting?.image_url ? 'Change Background' : 'Upload Background'}
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="background-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                disabled={uploading}
                onClick={() => document.getElementById('background-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Browse Files'}
              </Button>
            </div>
            {uploading && (
              <div className="space-y-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600">{uploadProgress}% uploaded</p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              Recommended: 1200x400px or larger. Max file size: 5MB. Supported formats: JPG, PNG, GIF
            </p>
          </div>

          {/* Usage Information */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">How it works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• The background image will appear on all user welcome cards</li>
              <li>• Users will see "Welcome back, [Full Name]!" instead of username/email</li>
              <li>• The image will be overlaid with text and maintain readability</li>
              <li>• Changes take effect immediately for all users</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
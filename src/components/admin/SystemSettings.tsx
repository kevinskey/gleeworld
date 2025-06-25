
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export const SystemSettings = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    autoBackup: true,
    maxFileSize: "10",
    sessionTimeout: "30"
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSettings({
      emailNotifications: true,
      autoBackup: true,
      maxFileSize: "10",
      sessionTimeout: "30"
    });
    
    toast({
      title: "Settings Reset",
      description: "Settings have been reset to default values.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          System Settings
        </CardTitle>
        <CardDescription>
          Configure system-wide settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-gray-600">Send email notifications for important events</p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>
          </div>

          {/* System Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">System</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup">Auto Backup</Label>
                <p className="text-sm text-gray-600">Automatically backup data daily</p>
              </div>
              <Switch
                id="auto-backup"
                checked={settings.autoBackup}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, autoBackup: checked }))
                }
              />
            </div>
          </div>

          {/* File Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">File Upload</h3>
            <div className="space-y-2">
              <Label htmlFor="max-file-size">Max File Size (MB)</Label>
              <Input
                id="max-file-size"
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, maxFileSize: e.target.value }))
                }
                min="1"
                max="100"
              />
            </div>
          </div>

          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Security</h3>
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))
                }
                min="5"
                max="480"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 border-t">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

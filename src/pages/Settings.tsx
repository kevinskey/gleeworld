import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Bell, 
  Shield, 
  Settings as SettingsIcon, 
  Palette,
  Save,
  Globe,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { DashboardBackgroundUploader } from "@/components/profile/DashboardBackgroundUploader";
import { ThemeSelector } from "@/components/settings/ThemeSelector";

const settingsSchema = z.object({
  display_name: z.string().min(1, "Display name is required"),
  language: z.string().default("en"),
  timezone: z.string().default("America/New_York"),
  
  // Notification settings
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  event_reminders: z.boolean().default(true),
  message_notifications: z.boolean().default(true),
  rehearsal_reminders: z.boolean().default(true),
  
  // Privacy settings
  profile_visibility: z.enum(["public", "members-only", "private"]).default("members-only"),
  show_email: z.boolean().default(false),
  show_phone: z.boolean().default(false),
  allow_messages: z.boolean().default(true),
  
  // Theme preferences
  theme: z.enum(["light", "dark", "system"]).default("system"),
  compact_mode: z.boolean().default(false),
  animations: z.boolean().default(true),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      display_name: userProfile?.full_name || "",
      language: "en",
      timezone: "America/New_York",
      email_notifications: true,
      push_notifications: true,
      event_reminders: true,
      message_notifications: true,
      rehearsal_reminders: true,
      profile_visibility: "members-only",
      show_email: false,
      show_phone: false,
      allow_messages: true,
      theme: "system",
      compact_mode: false,
      animations: true,
    }
  });

  const onSubmit = async (data: SettingsFormData) => {
    setLoading(true);
    try {
      // Here you would save the settings to your backend
      console.log("Saving settings:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const timezones = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "UTC", label: "UTC" },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
  ];

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences and privacy settings
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="theme" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Theme
              </TabsTrigger>
            </TabsList>

            {/* Personal Preferences */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Preferences
                  </CardTitle>
                  <CardDescription>
                    Manage your personal information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        {...register("display_name")}
                        className="bg-background"
                      />
                      {errors.display_name && (
                        <p className="text-sm text-destructive">{errors.display_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={watch("language")}
                        onValueChange={(value) => setValue("language", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={watch("timezone")}
                        onValueChange={(value) => setValue("timezone", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>
                    Control when and how you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={watch("email_notifications")}
                        onCheckedChange={(checked) => setValue("email_notifications", checked)}
                      />
                    </div>

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Push Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive browser push notifications
                        </p>
                      </div>
                      <Switch
                        checked={watch("push_notifications")}
                        onCheckedChange={(checked) => setValue("push_notifications", checked)}
                      />
                    </div>

                    {/* SMS Notifications - Automatic if phone number exists */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2 border-primary/20">
                      <div className="space-y-0.5 flex-1">
                        <Label className="text-base flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          SMS Notifications
                          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">Auto-enabled</span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically enabled if you have a phone number in your profile
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Add your phone number in Profile Settings to receive SMS notifications
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Notification Types</h3>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Event Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Get reminders for upcoming events
                        </p>
                      </div>
                      <Switch
                        checked={watch("event_reminders")}
                        onCheckedChange={(checked) => setValue("event_reminders", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Message Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when you receive messages
                        </p>
                      </div>
                      <Switch
                        checked={watch("message_notifications")}
                        onCheckedChange={(checked) => setValue("message_notifications", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Rehearsal Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Get reminders for rehearsals and sectionals
                        </p>
                      </div>
                      <Switch
                        checked={watch("rehearsal_reminders")}
                        onCheckedChange={(checked) => setValue("rehearsal_reminders", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Privacy Settings
                  </CardTitle>
                  <CardDescription>
                    Control who can see your information and contact you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Profile Visibility</Label>
                      <Select
                        value={watch("profile_visibility")}
                        onValueChange={(value: "public" | "members-only" | "private") => 
                          setValue("profile_visibility", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Public - Anyone can see your profile
                            </div>
                          </SelectItem>
                          <SelectItem value="members-only">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Members Only - Only Glee Club members
                            </div>
                          </SelectItem>
                          <SelectItem value="private">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Private - Hidden from everyone
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Show Email Address</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to see your email address
                        </p>
                      </div>
                      <Switch
                        checked={watch("show_email")}
                        onCheckedChange={(checked) => setValue("show_email", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Show Phone Number</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow others to see your phone number
                        </p>
                      </div>
                      <Switch
                        checked={watch("show_phone")}
                        onCheckedChange={(checked) => setValue("show_phone", checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Allow Messages</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow other members to send you messages
                        </p>
                      </div>
                      <Switch
                        checked={watch("allow_messages")}
                        onCheckedChange={(checked) => setValue("allow_messages", checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Account Settings */}
            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Account Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account security and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">Email Address</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Your current email address
                      </p>
                      <Input
                        value={user?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base">Change Password</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Update your account password
                      </p>
                      <Button 
                        variant="outline" 
                        type="button"
                        onClick={() => setShowChangePassword(true)}
                      >
                        Change Password
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Add an extra layer of security to your account
                      </p>
                      <Button variant="outline" type="button">
                        Set Up 2FA
                      </Button>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base text-destructive">Danger Zone</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        These actions cannot be undone
                      </p>
                      <Button variant="destructive" type="button">
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Theme Preferences */}
            <TabsContent value="theme" className="space-y-6">
              <ThemeSelector />
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end pt-6">
            <Button 
              type="submit" 
              disabled={!isDirty || loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>

        <ChangePasswordDialog 
          open={showChangePassword} 
          onOpenChange={setShowChangePassword} 
        />
      </div>
    </UniversalLayout>
  );
}
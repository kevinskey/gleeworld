import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Music, 
  Crown, 
  Shield, 
  DollarSign,
  Upload,
  Save,
  RefreshCw
} from "lucide-react";

const VOICE_PARTS = [
  { value: 'soprano_1', label: 'Soprano 1' },
  { value: 'soprano_2', label: 'Soprano 2' },
  { value: 'alto_1', label: 'Alto 1' },
  { value: 'alto_2', label: 'Alto 2' },
  { value: 'tenor', label: 'Tenor' },
  { value: 'bass', label: 'Bass' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'on_leave', label: 'On Leave' }
];

const EXEC_BOARD_ROLES = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Music Director',
  'Assistant Music Director',
  'Business Manager',
  'Publicity Manager',
  'Social Chair',
  'Librarian'
];

const MUSIC_ROLES = [
  'Section Leader',
  'Assistant Section Leader',
  'Pitch Leader',
  'Accompanist',
  'Soloist'
];

export const GleeWorldProfileManager = () => {
  const { user } = useAuth();
  const { userProfile, loading, error, updateProfile, refetch } = useUserProfile(user);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        first_name: userProfile.first_name || '',
        last_name: userProfile.last_name || '',
        phone: userProfile.phone || '',
        voice_part: userProfile.voice_part || '',
        class_year: userProfile.class_year?.toString() || '',
        join_date: userProfile.join_date || '',
        status: userProfile.status || 'active',
        title: userProfile.title || '',
        exec_board_role: userProfile.exec_board_role || '',
        music_role: userProfile.music_role || '',
        org: userProfile.org || '',
      });
    }
  }, [userProfile]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        ...formData,
        class_year: formData.class_year ? parseInt(formData.class_year) : null,
        join_date: formData.join_date || null,
      };

      const result = await updateProfile(updates);
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
        setIsEditing(false);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading profile...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !userProfile) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Profile not found'}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={userProfile.avatar_url || ''} />
                <AvatarFallback className="text-lg">
                  {userProfile.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{userProfile.display_name}</CardTitle>
                <div className="flex items-center space-x-2 mt-2">
                  {userProfile.voice_part && (
                    <Badge variant="secondary">
                      <Music className="h-3 w-3 mr-1" />
                      {VOICE_PARTS.find(vp => vp.value === userProfile.voice_part)?.label}
                    </Badge>
                  )}
                  {userProfile.is_exec_board && (
                    <Badge variant="default">
                      <Crown className="h-3 w-3 mr-1" />
                      Executive Board
                    </Badge>
                  )}
                  {userProfile.is_admin && (
                    <Badge variant="destructive">
                      <Shield className="h-3 w-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "outline" : "default"}
            >
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="glee">Glee Club</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  {isEditing ? (
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{userProfile.first_name || 'Not set'}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  {isEditing ? (
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">{userProfile.last_name || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Label>
                <p className="mt-1 text-sm text-gray-600">{userProfile.email}</p>
              </div>

              <div>
                <Label htmlFor="phone" className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone
                </Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                ) : (
                  <p className="mt-1 text-sm">{userProfile.phone || 'Not set'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Glee Club Information */}
        <TabsContent value="glee">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Music className="h-5 w-5 mr-2" />
                Glee Club Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="voice_part">Voice Part</Label>
                  {isEditing ? (
                    <Select
                      value={formData.voice_part}
                      onValueChange={(value) => handleInputChange('voice_part', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select voice part" />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_PARTS.map((part) => (
                          <SelectItem key={part.value} value={part.value}>
                            {part.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm">
                      {VOICE_PARTS.find(vp => vp.value === userProfile.voice_part)?.label || 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="class_year">Class Year</Label>
                  {isEditing ? (
                    <Input
                      id="class_year"
                      type="number"
                      value={formData.class_year}
                      onChange={(e) => handleInputChange('class_year', e.target.value)}
                      placeholder="2025"
                    />
                  ) : (
                    <p className="mt-1 text-sm">{userProfile.class_year || 'Not set'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="join_date" className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Join Date
                  </Label>
                  {isEditing ? (
                    <Input
                      id="join_date"
                      type="date"
                      value={formData.join_date}
                      onChange={(e) => handleInputChange('join_date', e.target.value)}
                    />
                  ) : (
                    <p className="mt-1 text-sm">
                      {userProfile.join_date ? new Date(userProfile.join_date).toLocaleDateString() : 'Not set'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  {isEditing ? (
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm">
                      {STATUS_OPTIONS.find(s => s.value === userProfile.status)?.label || 'Active'}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Dues Status
                </Label>
                <div className="mt-1 flex items-center">
                  <Badge variant={userProfile.dues_paid ? "default" : "destructive"}>
                    {userProfile.dues_paid ? "Paid" : "Unpaid"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Leadership */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Crown className="h-5 w-5 mr-2" />
                Roles & Leadership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Official Title</Label>
                {isEditing ? (
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., President, Section Leader"
                  />
                ) : (
                  <p className="mt-1 text-sm">{userProfile.title || 'None'}</p>
                )}
              </div>

              {userProfile.is_exec_board && (
                <div>
                  <Label htmlFor="exec_board_role">Executive Board Role</Label>
                  {isEditing ? (
                    <Select
                      value={formData.exec_board_role}
                      onValueChange={(value) => handleInputChange('exec_board_role', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select executive role" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXEC_BOARD_ROLES.map((role) => (
                          <SelectItem key={role} value={role.toLowerCase().replace(/\s+/g, '_')}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm">{userProfile.exec_board_role || 'Not specified'}</p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="music_role">Music Role</Label>
                {isEditing ? (
                  <Select
                    value={formData.music_role}
                    onValueChange={(value) => handleInputChange('music_role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select music role" />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSIC_ROLES.map((role) => (
                        <SelectItem key={role} value={role.toLowerCase().replace(/\s+/g, '_')}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="mt-1 text-sm">{userProfile.music_role || 'None'}</p>
                )}
              </div>

              <div>
                <Label htmlFor="org">Organization</Label>
                {isEditing ? (
                  <Input
                    id="org"
                    value={formData.org}
                    onChange={(e) => handleInputChange('org', e.target.value)}
                    placeholder="Harvard Glee Club"
                  />
                ) : (
                  <p className="mt-1 text-sm">{userProfile.org || 'Not set'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Information */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Account Balance</Label>
                  <p className="text-2xl font-bold text-green-600">
                    ${userProfile.account_balance?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <Badge variant={userProfile.ecommerce_enabled ? "default" : "secondary"}>
                  {userProfile.ecommerce_enabled ? "Shopping Enabled" : "Shopping Disabled"}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Member Since</Label>
                <p className="text-sm text-gray-600">
                  {new Date(userProfile.created_at).toLocaleDateString()}
                </p>
              </div>

              {userProfile.last_sign_in_at && (
                <div className="space-y-2">
                  <Label>Last Sign In</Label>
                  <p className="text-sm text-gray-600">
                    {new Date(userProfile.last_sign_in_at).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      {isEditing && (
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
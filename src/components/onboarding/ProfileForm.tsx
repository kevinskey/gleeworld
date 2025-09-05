import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OnboardingProfile } from '@/hooks/useOnboardingProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ProfileFormProps {
  profile: OnboardingProfile;
  onUpdate: (field: keyof OnboardingProfile, value: any) => void;
  saving?: boolean;
}

export const ProfileForm = ({ profile, onUpdate, saving }: ProfileFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      
      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/headshot.${fileExt}`;
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('user-files')
        .upload(fileName, file, { 
          upsert: true 
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-files')
        .getPublicUrl(fileName);

      // Update profile with the headshot URL
      onUpdate('headshot_url', publicUrl);
      
      toast({
        title: "Profile picture uploaded!",
        description: "Your headshot has been saved successfully.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onUpdate('headshot_url', null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Tell us about yourself. All fields are optional, but completing them helps us serve you better.
          {saving && <span className="text-muted-foreground text-sm ml-2">Saving...</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Profile Picture Section */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Profile Picture</Label>
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.headshot_url || ''} />
              <AvatarFallback className="text-2xl">
                {profile.first_name?.[0] || profile.email?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : profile.headshot_url ? 'Change Photo' : 'Upload Photo'}
              </Button>
              
              {profile.headshot_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeImage}
                  disabled={uploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Upload a clear headshot photo that shows your face. This will be used in your profile and for identification purposes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First Name</Label>
            <Input
              id="first_name"
              value={profile.first_name || ''}
              onChange={(e) => onUpdate('first_name', e.target.value)}
              placeholder="Your first name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name</Label>
            <Input
              id="last_name"
              value={profile.last_name || ''}
              onChange={(e) => onUpdate('last_name', e.target.value)}
              placeholder="Your last name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="preferred_name">Preferred Name</Label>
          <Input
            id="preferred_name"
            value={profile.preferred_name || ''}
            onChange={(e) => onUpdate('preferred_name', e.target.value)}
            placeholder="What should we call you?"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pronouns">Pronouns</Label>
            <Select
              value={profile.pronouns || ''}
              onValueChange={(value) => onUpdate('pronouns', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pronouns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="she/her">She/Her</SelectItem>
                <SelectItem value="he/him">He/Him</SelectItem>
                <SelectItem value="they/them">They/Them</SelectItem>
                <SelectItem value="she/they">She/They</SelectItem>
                <SelectItem value="he/they">He/They</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduation_year">Graduation Year</Label>
            <Input
              id="graduation_year"
              type="number"
              min="2024"
              max="2030"
              value={profile.graduation_year || ''}
              onChange={(e) => onUpdate('graduation_year', parseInt(e.target.value) || null)}
              placeholder="2025"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={profile.email || ''}
              onChange={(e) => onUpdate('email', e.target.value)}
              placeholder="your.email@spelman.edu"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={profile.phone || ''}
              onChange={(e) => onUpdate('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="voice_part">Voice Part</Label>
            <Select
              value={profile.voice_part || ''}
              onValueChange={(value) => onUpdate('voice_part', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select voice part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S1">Soprano 1</SelectItem>
                <SelectItem value="S2">Soprano 2</SelectItem>
                <SelectItem value="A1">Alto 1</SelectItem>
                <SelectItem value="A2">Alto 2</SelectItem>
                <SelectItem value="T1">Tenor 1</SelectItem>
                <SelectItem value="T2">Tenor 2</SelectItem>
                <SelectItem value="B1">Bass 1</SelectItem>
                <SelectItem value="B2">Bass 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="academic_major">Academic Major</Label>
            <Input
              id="academic_major"
              value={profile.academic_major || ''}
              onChange={(e) => onUpdate('academic_major', e.target.value)}
              placeholder="Computer Science"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
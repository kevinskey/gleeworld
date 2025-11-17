import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AlumnaeProfileEditorProps {
  user: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EXEC_BOARD_POSITIONS = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Chaplain',
  'Historian',
  'Librarian',
  'Business Manager',
  'Publicity Manager',
  'Social Chair',
  'Sergeant at Arms',
  'Section Leader - Soprano',
  'Section Leader - Alto',
  'Other'
];

const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 1900; year--) {
    years.push(year.toString());
  }
  return years;
};

export const AlumnaeProfileEditor = ({ user, open, onOpenChange, onSuccess }: AlumnaeProfileEditorProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    city: user?.city || '',
    state: user?.state || '',
    graduation_year: user?.graduation_year || '',
    major: user?.major || '',
    minor: user?.minor || '',
    current_employer: user?.current_employer || '',
    current_position: user?.current_position || '',
    voice_part: user?.voice_part || '',
    bio: user?.bio || '',
    linkedin_url: user?.linkedin_url || '',
    instagram_handle: user?.instagram_handle || '',
    website_url: user?.website_url || '',
    is_mentor: user?.is_mentor || false,
    is_featured: user?.is_featured || false,
    section_leader: user?.section_leader || false,
    exec_board_positions: user?.exec_board_positions || [],
    exec_board_years: user?.exec_board_years || [],
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addExecBoardPosition = () => {
    if (selectedPosition && !formData.exec_board_positions.includes(selectedPosition)) {
      handleChange('exec_board_positions', [...formData.exec_board_positions, selectedPosition]);
      setSelectedPosition('');
    }
  };

  const removeExecBoardPosition = (position: string) => {
    handleChange('exec_board_positions', formData.exec_board_positions.filter((p: string) => p !== position));
  };

  const addExecBoardYear = () => {
    if (selectedYear && !formData.exec_board_years.includes(selectedYear)) {
      handleChange('exec_board_years', [...formData.exec_board_years, selectedYear]);
      setSelectedYear('');
    }
  };

  const removeExecBoardYear = (year: string) => {
    handleChange('exec_board_years', formData.exec_board_years.filter((y: string) => y !== year));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('gw_profiles')
        .update(formData)
        .eq('user_id', user.user_id || user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Alumna Profile</DialogTitle>
          <DialogDescription>
            Update profile information for {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="glee">Glee Club</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voice_part">Voice Part</Label>
                <Input
                  id="voice_part"
                  value={formData.voice_part}
                  onChange={(e) => handleChange('voice_part', e.target.value)}
                  placeholder="e.g., Soprano, Alto"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                rows={4}
                placeholder="Share your story, achievements, and interests..."
              />
            </div>
          </TabsContent>

          <TabsContent value="academic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="graduation_year">Graduation Year</Label>
                <Input
                  id="graduation_year"
                  value={formData.graduation_year}
                  onChange={(e) => handleChange('graduation_year', e.target.value)}
                  placeholder="e.g., 2020"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="major">Major</Label>
                <Input
                  id="major"
                  value={formData.major}
                  onChange={(e) => handleChange('major', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minor">Minor</Label>
              <Input
                id="minor"
                value={formData.minor}
                onChange={(e) => handleChange('minor', e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="glee" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Executive Board Positions</Label>
                <div className="flex gap-2">
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                    <SelectTrigger className="flex-1 bg-background">
                      <SelectValue placeholder="Select position..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {EXEC_BOARD_POSITIONS.map((position) => (
                        <SelectItem key={position} value={position}>
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    onClick={addExecBoardPosition} 
                    disabled={!selectedPosition}
                  >
                    Add
                  </Button>
                </div>
                {formData.exec_board_positions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.exec_board_positions.map((position: string) => (
                      <Badge key={position} variant="secondary" className="gap-1">
                        {position}
                        <button
                          type="button"
                          onClick={() => removeExecBoardPosition(position)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Year(s) Served on E-Board</Label>
                <div className="flex gap-2">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="flex-1 bg-background">
                      <SelectValue placeholder="Select year..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-[200px]">
                      {generateYears().map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    onClick={addExecBoardYear} 
                    disabled={!selectedYear}
                  >
                    Add
                  </Button>
                </div>
                {formData.exec_board_years.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.exec_board_years.map((year: string) => (
                      <Badge key={year} variant="secondary" className="gap-1">
                        {year}
                        <button
                          type="button"
                          onClick={() => removeExecBoardYear(year)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice_part_glee">Voice Part</Label>
                <Input
                  id="voice_part_glee"
                  value={formData.voice_part}
                  onChange={(e) => handleChange('voice_part', e.target.value)}
                  placeholder="e.g., Soprano, Alto"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="section_leader_glee">Section Leader</Label>
                  <p className="text-sm text-muted-foreground">Was a section leader during membership</p>
                </div>
                <Switch
                  id="section_leader_glee"
                  checked={formData.section_leader}
                  onCheckedChange={(checked) => handleChange('section_leader', checked)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="professional" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="current_employer">Current Employer</Label>
              <Input
                id="current_employer"
                value={formData.current_employer}
                onChange={(e) => handleChange('current_employer', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_position">Current Position</Label>
              <Input
                id="current_position"
                value={formData.current_position}
                onChange={(e) => handleChange('current_position', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input
                id="linkedin_url"
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => handleChange('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website_url">Personal Website</Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="instagram_handle">Instagram Handle</Label>
              <Input
                id="instagram_handle"
                value={formData.instagram_handle}
                onChange={(e) => handleChange('instagram_handle', e.target.value)}
                placeholder="@username"
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold">Status Settings</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_mentor">Mentor Status</Label>
                  <p className="text-sm text-muted-foreground">Available to mentor current members</p>
                </div>
                <Switch
                  id="is_mentor"
                  checked={formData.is_mentor}
                  onCheckedChange={(checked) => handleChange('is_mentor', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_featured">Featured Status</Label>
                  <p className="text-sm text-muted-foreground">Show in featured alumnae section</p>
                </div>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => handleChange('is_featured', checked)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

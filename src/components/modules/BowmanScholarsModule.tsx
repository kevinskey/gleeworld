import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBowmanScholars } from '@/hooks/useBowmanScholars';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CameraCapture } from '@/components/ui/camera-capture';
import { GraduationCap, User, Edit2, Users, BookOpen, Calendar, Plus, Trash2, Clock, Camera, Upload, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLiturgicalWorksheets, LiturgicalWorksheet } from '@/hooks/useLiturgicalWorksheets';
import { LiturgicalWorksheetForm } from '@/components/liturgical/LiturgicalWorksheetForm';
import { format } from 'date-fns';

export const BowmanScholarsModule = () => {
  const { scholars, loading, updateScholar, getCurrentScholar } = useBowmanScholars();
  const { user } = useAuth();
  const currentScholar = getCurrentScholar();
  
  // Liturgical worksheets functionality
  const { 
    worksheets, 
    loading: worksheetsLoading, 
    createWorksheet, 
    updateWorksheet, 
    deleteWorksheet 
  } = useLiturgicalWorksheets();
  
  const [editMode, setEditMode] = useState(false);
  const [showWorksheetForm, setShowWorksheetForm] = useState(false);
  const [editingWorksheet, setEditingWorksheet] = useState<LiturgicalWorksheet | undefined>();
  const [showCamera, setShowCamera] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    full_name: currentScholar?.full_name || '',
    major: currentScholar?.major || '',
    grad_year: currentScholar?.grad_year || new Date().getFullYear(),
    hometown: currentScholar?.hometown || '',
    bio: currentScholar?.bio || '',
    headshot_url: currentScholar?.headshot_url || '',
    resume_url: currentScholar?.resume_url || '',
    ministry_statement: currentScholar?.ministry_statement || '',
  });

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save your profile",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.full_name.trim()) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    console.log('Saving Bowman Scholar profile:', { user_id: user.id, formData });
    const result = await updateScholar(formData);
    console.log('Save result:', result);
    if (result.success) {
      setEditMode(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWorksheetSave = async (worksheetData: Partial<LiturgicalWorksheet>) => {
    if (editingWorksheet) {
      return await updateWorksheet(editingWorksheet.id, worksheetData);
    } else {
      return await createWorksheet(worksheetData);
    }
  };

  const handleEditWorksheet = (worksheet: LiturgicalWorksheet) => {
    setEditingWorksheet(worksheet);
    setShowWorksheetForm(true);
  };

  const handleNewWorksheet = () => {
    setEditingWorksheet(undefined);
    setShowWorksheetForm(true);
  };

  const handleCancelWorksheet = () => {
    setShowWorksheetForm(false);
    setEditingWorksheet(undefined);
  };

  const handleCameraCapture = async (imageBlob: Blob) => {
    if (!user) return;

    try {
      const fileExt = 'jpg';
      const fileName = `${user.id}/headshot.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('bowman-scholars')
        .upload(fileName, imageBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('bowman-scholars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, headshot_url: data.publicUrl }));
      setShowCamera(false);
      
      toast({
        title: "Success",
        description: "Photo captured successfully",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    }
  };

  const handleHeadshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingHeadshot(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/headshot.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('bowman-scholars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('bowman-scholars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, headshot_url: data.publicUrl }));
      
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploadingHeadshot(false);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Error",
        description: "Please upload a PDF or Word document",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingResume(true);

    try {
      const fileExt = file.name.split('.').pop() || 'pdf';
      const fileName = `${user.id}/resume.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('bowman-scholars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('bowman-scholars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, resume_url: data.publicUrl }));
      
      toast({
        title: "Success",
        description: "Resume uploaded successfully",
      });
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast({
        title: "Error",
        description: "Failed to upload resume",
        variant: "destructive",
      });
    } finally {
      setUploadingResume(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
          <p className="text-muted-foreground mb-4">
            Please log in to GleeWorld to access the Bowman Scholars program
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading Bowman Scholars...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <div className="px-2 sm:px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6 w-full">
        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-6">
          <div className="p-1.5 lg:p-2 bg-gradient-to-br from-gold/20 to-blue/20 rounded-lg">
            <GraduationCap className="h-5 w-5 lg:h-6 lg:w-6 text-gold" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold">Bowman Scholars</h1>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Celebrating academic excellence in the Glee Club community
            </p>
          </div>
        </div>

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="directory" className="flex items-center gap-1 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Scholar </span>Directory
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">My </span>Profile
          </TabsTrigger>
          <TabsTrigger value="liturgical" className="flex items-center gap-1 text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Liturgical </span>Planning
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-1 text-xs sm:text-sm">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          {/* Lyke House Bowman Scholar Program Landing */}
          <Card className="mb-4 lg:mb-6">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="grid lg:grid-cols-2 gap-4 lg:gap-8 items-start">
                {/* Left column - Sister Thea Bowman Image */}
                <div className="flex justify-center lg:justify-start order-2 lg:order-1">
                  <img 
                    src="/lovable-uploads/eef8650c-760f-4cc7-9e94-d1da279feeca.png"
                    alt="Sister Thea Bowman speaking at a podium"
                    className="rounded-lg shadow-lg w-full max-w-sm lg:max-w-full h-auto"
                  />
                </div>
                
                {/* Right column - Program Information */}
                <div className="space-y-4 order-1 lg:order-2">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary leading-tight py-2 lg:py-4 px-2">
                    Lyke House Bowman Scholar Program
                  </h2>
                  
                  <div className="space-y-3 lg:space-y-4 text-muted-foreground leading-relaxed text-sm lg:text-base">
                    <p>
                      This program is named in honor of Sister Thea Bowman. It is a group of music majors who are invited to help develop the music program at the Catholic Center in the spirit of Sr. Thea Bowman.
                    </p>
                    
                    <p>
                      One of the main goals of the Bowman Scholar program is to create the foundation for training musicians and artists to serve Catholic parishes, especially predominantly Black congregations, across the nation and around the world.
                    </p>
                    
                    <p>
                      Sr. Thea Bowman was an African American Franciscan Sister of Perpetual Adoration. Born in Yazoo City, Mississippi, Thea expressed early on to her Methodist parents that she desired to become Catholic. Soon after she was enrolled in a school served by the Franciscan Sisters, and at age 15 in 1952 she entered their convent in LaCrosse, Wisconsin.
                    </p>
                    
                    <p className="hidden lg:block">
                      Through music, dance, poetry and other expressive art forms, Sr. Thea's message of Black Catholic identity reached the masses. She understood the need for the Black American experience to be embedded within the Catholic tradition of Christian expression, and sought to eliminate the barriers of racism, misunderstanding, and unilateralism that would hinder the Catholic Church in the U.S. from being fully catholic or universal.
                    </p>
                    
                    <div className="bg-muted/50 p-3 lg:p-4 rounded-lg">
                      <p className="text-xs lg:text-sm">
                        <strong>For more information about the Bowman Scholar program, please contact:</strong><br />
                        Dr. Kevin Johnson, Director of Worship and Liturgy<br />
                        <a href="mailto:kevinskey@mac.com" className="text-primary hover:underline break-all">
                          kevinskey@mac.com
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bowman Scholars Directory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 sm:h-80 lg:h-96">
                <div className="grid gap-4">
                  {scholars.length === 0 ? (
                    <div className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No scholars found</p>
                    </div>
                  ) : (
                     scholars.map((scholar) => (
                       <Card key={scholar.user_id} className="p-3 lg:p-4">
                         <div className="flex items-start gap-3 lg:gap-4">
                           <Avatar className="h-12 w-12 lg:h-16 lg:w-16 flex-shrink-0">
                             <AvatarImage src={scholar.headshot_url} />
                             <AvatarFallback>
                               <GraduationCap className="h-6 w-6 lg:h-8 lg:w-8" />
                             </AvatarFallback>
                           </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 lg:gap-2 mb-2">
                                <Badge variant="secondary" className="bg-gold/20 text-gold text-xs">
                                  Bowman Scholar
                                </Badge>
                                {scholar.grad_year && (
                                  <Badge variant="outline" className="text-xs">
                                    Class of {scholar.grad_year}
                                  </Badge>
                                )}
                              </div>
                              {scholar.full_name && (
                                <h4 className="text-sm lg:text-base font-semibold mb-1">{scholar.full_name}</h4>
                              )}
                              <div className="flex flex-wrap gap-2 text-xs lg:text-sm text-muted-foreground mb-1">
                                {scholar.major && <span>• {scholar.major}</span>}
                                {scholar.hometown && <span>• {scholar.hometown}</span>}
                              </div>
                              {scholar.bio && (
                                <p className="text-xs lg:text-sm text-muted-foreground line-clamp-2">{scholar.bio}</p>
                              )}
                              {scholar.resume_url && (
                                <div className="mt-2">
                                  <a 
                                    href={scholar.resume_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <FileText className="h-3 w-3" />
                                    View Resume
                                  </a>
                                </div>
                              )}
                            </div>
                         </div>
                       </Card>
                     ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  My Scholar Profile
                </CardTitle>
                {currentScholar && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(!editMode)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    {editMode ? 'Cancel' : 'Edit'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!currentScholar && !editMode ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Create Your Scholar Profile</h3>
                  <p className="text-muted-foreground mb-4">
                    Share your academic journey with the Glee Club community
                  </p>
                  <Button onClick={() => setEditMode(true)}>
                    Create Profile
                  </Button>
                </div>
               ) : editMode ? (
                 <div className="space-y-6">
                   {/* Basic Information */}
                   <div className="space-y-4">
                     <h3 className="text-lg font-semibold">Basic Information</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                         <Label htmlFor="full_name">Full Name *</Label>
                         <Input
                           id="full_name"
                           value={formData.full_name}
                           onChange={(e) => handleInputChange('full_name', e.target.value)}
                           placeholder="Your full name"
                           required
                         />
                       </div>
                       <div>
                         <Label htmlFor="hometown">Hometown</Label>
                         <Input
                           id="hometown"
                           value={formData.hometown}
                           onChange={(e) => handleInputChange('hometown', e.target.value)}
                           placeholder="City, State"
                         />
                       </div>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                         <Label htmlFor="major">Major</Label>
                         <Input
                           id="major"
                           value={formData.major}
                           onChange={(e) => handleInputChange('major', e.target.value)}
                           placeholder="Your major"
                         />
                       </div>
                       <div>
                         <Label htmlFor="grad_year">Graduation Year</Label>
                         <Input
                           id="grad_year"
                           type="number"
                           value={formData.grad_year}
                           onChange={(e) => handleInputChange('grad_year', parseInt(e.target.value))}
                         />
                       </div>
                     </div>
                   </div>

                    {/* Profile Photo */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Profile Photo</h3>
                      <div className="flex flex-col sm:flex-row items-start gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={formData.headshot_url} />
                          <AvatarFallback>
                            <GraduationCap className="h-10 w-10" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowCamera(true)}
                              disabled={uploadingHeadshot}
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Take Selfie
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('headshot-upload')?.click()}
                              disabled={uploadingHeadshot}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {uploadingHeadshot ? 'Uploading...' : 'Upload Photo'}
                            </Button>
                            <Input
                              id="headshot-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleHeadshotUpload}
                              className="hidden"
                            />
                          </div>
                          <div>
                            <Label htmlFor="headshot_url" className="text-sm">Or enter URL:</Label>
                            <Input
                              id="headshot_url"
                              value={formData.headshot_url}
                              onChange={(e) => handleInputChange('headshot_url', e.target.value)}
                              placeholder="Image URL"
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                   {/* Resume Upload */}
                   <div className="space-y-4">
                     <h3 className="text-lg font-semibold">Resume</h3>
                     <div className="flex items-center gap-4">
                       <div className="flex-1">
                         <Label htmlFor="resume">Upload Resume (PDF or Word)</Label>
                         <Input
                           id="resume"
                           type="file"
                           accept=".pdf,.doc,.docx"
                           onChange={handleResumeUpload}
                           disabled={uploadingResume}
                           className="mt-1"
                         />
                         {formData.resume_url && (
                           <p className="text-sm text-green-600 mt-1">Resume uploaded successfully</p>
                         )}
                       </div>
                       {uploadingResume && (
                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                       )}
                     </div>
                   </div>

                   {/* Bio */}
                   <div className="space-y-4">
                     <div>
                       <Label htmlFor="bio">Academic Bio</Label>
                       <Textarea
                         id="bio"
                         value={formData.bio}
                         onChange={(e) => handleInputChange('bio', e.target.value)}
                         placeholder="Tell us about your academic achievements, goals, and background..."
                         rows={4}
                         className="mt-1"
                       />
                     </div>
                   </div>

                   {/* Ministry Statement */}
                   <div className="space-y-4">
                     <div>
                       <Label htmlFor="ministry_statement">Ministry Statement</Label>
                       <Textarea
                         id="ministry_statement"
                         value={formData.ministry_statement}
                         onChange={(e) => handleInputChange('ministry_statement', e.target.value)}
                         placeholder="Share your vision for ministry and how you plan to serve Catholic parishes..."
                         rows={6}
                         className="mt-1"
                       />
                     </div>
                   </div>
                  
                   <div className="flex gap-2 pt-4">
                     <Button onClick={handleSave} disabled={!formData.full_name.trim()}>
                       Save Profile
                     </Button>
                     <Button variant="outline" onClick={() => setEditMode(false)}>
                       Cancel
                     </Button>
                   </div>
                 </div>
              ) : (
                 <div className="space-y-4">
                   <div className="flex items-start gap-3 lg:gap-4">
                     <Avatar className="h-16 w-16 lg:h-20 lg:w-20 flex-shrink-0">
                       <AvatarImage src={currentScholar?.headshot_url} />
                       <AvatarFallback>
                         <GraduationCap className="h-8 w-8 lg:h-10 lg:w-10" />
                       </AvatarFallback>
                     </Avatar>
                     <div className="flex-1 min-w-0">
                       <div className="flex flex-wrap items-center gap-1 lg:gap-2 mb-2">
                         <Badge className="bg-gold/20 text-gold text-xs lg:text-sm">
                           Bowman Scholar
                         </Badge>
                         {currentScholar?.grad_year && (
                           <Badge variant="outline" className="text-xs lg:text-sm">
                             Class of {currentScholar.grad_year}
                           </Badge>
                         )}
                       </div>
                       {currentScholar?.major && (
                         <p className="font-medium mb-2 text-sm lg:text-base">{currentScholar.major}</p>
                       )}
                       {currentScholar?.bio && (
                         <p className="text-muted-foreground text-sm lg:text-base">{currentScholar.bio}</p>
                       )}
                     </div>
                   </div>
                 </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liturgical" className="space-y-4">
          {showWorksheetForm ? (
            <LiturgicalWorksheetForm
              worksheet={editingWorksheet}
              onSave={handleWorksheetSave}
              onCancel={handleCancelWorksheet}
            />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Liturgical Worksheets for Lyke House Catholic Center
                    </CardTitle>
                    <Button onClick={handleNewWorksheet}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Worksheet
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {worksheetsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="ml-2">Loading worksheets...</p>
                    </div>
                  ) : worksheets.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Liturgical Worksheets Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first liturgical planning worksheet for weekly liturgies at Lyke House.
                      </p>
                      <Button onClick={handleNewWorksheet}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Worksheet
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                         {worksheets.map((worksheet) => (
                          <Card 
                            key={worksheet.id} 
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleEditWorksheet(worksheet)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-medium">
                                    {format(new Date(worksheet.liturgical_date), 'MMMM d, yyyy')}
                                  </h4>
                                  <Badge variant="secondary">
                                    {worksheet.liturgical_season}
                                  </Badge>
                                  <Badge 
                                    variant={worksheet.status === 'published' ? 'default' : 'outline'}
                                  >
                                    {worksheet.status}
                                  </Badge>
                                </div>
                                {worksheet.theme && (
                                  <p className="text-sm font-medium text-primary mb-1">
                                    Theme: {worksheet.theme}
                                  </p>
                                )}
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {worksheet.readings?.gospel && (
                                    <p><strong>Gospel:</strong> {worksheet.readings.gospel}</p>
                                  )}
                                  {worksheet.music_selections?.entrance_hymn && (
                                    <p><strong>Entrance:</strong> {worksheet.music_selections.entrance_hymn}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditWorksheet(worksheet);
                                  }}
                                >
                                  <Edit2 className="h-5 w-5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteWorksheet(worksheet.id);
                                  }}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Academic Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                 <Card className="p-3 lg:p-4">
                   <h3 className="font-medium mb-2 text-sm lg:text-base">Study Groups</h3>
                   <p className="text-xs lg:text-sm text-muted-foreground">
                     Connect with fellow scholars for collaborative learning sessions.
                   </p>
                 </Card>
                 
                 <Card className="p-3 lg:p-4">
                   <h3 className="font-medium mb-2 text-sm lg:text-base">Academic Calendar</h3>
                   <p className="text-xs lg:text-sm text-muted-foreground">
                     Important academic dates and Bowman Scholar events.
                   </p>
                 </Card>
                 
                 <Card className="p-3 lg:p-4">
                   <h3 className="font-medium mb-2 text-sm lg:text-base">Scholarship Opportunities</h3>
                   <p className="text-xs lg:text-sm text-muted-foreground">
                     Information about additional scholarships and academic grants.
                   </p>
                 </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  GraduationCap, User, Edit2, Users, BookOpen, Calendar, 
  Save, Camera, Upload, FileText, Clock, ChevronLeft, 
  Mail, MapPin, Home, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBowmanScholars } from '@/hooks/useBowmanScholars';
import { useLiturgicalWorksheets, LiturgicalWorksheet } from '@/hooks/useLiturgicalWorksheets';
import { LiturgicalWorksheetForm } from '@/components/liturgical/LiturgicalWorksheetForm';
import { CameraCapture } from '@/components/ui/camera-capture';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { getCourseByCode } from '@/config/academyCourses';

const course = getCourseByCode('LH 100');

export default function LH100BowmanScholars() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scholars, loading, updateScholar, getCurrentScholar } = useBowmanScholars();
  const { worksheets, loading: worksheetsLoading, createWorksheet, updateWorksheet, deleteWorksheet } = useLiturgicalWorksheets();
  
  const [activeView, setActiveView] = useState<'profile' | 'directory' | 'worksheets' | 'schedule'>('profile');
  const [editMode, setEditMode] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showWorksheetForm, setShowWorksheetForm] = useState(false);
  const [editingWorksheet, setEditingWorksheet] = useState<LiturgicalWorksheet | undefined>();
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  
  const currentScholar = getCurrentScholar();
  
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

  React.useEffect(() => {
    if (currentScholar) {
      setFormData({
        full_name: currentScholar.full_name || '',
        major: currentScholar.major || '',
        grad_year: currentScholar.grad_year || new Date().getFullYear(),
        hometown: currentScholar.hometown || '',
        bio: currentScholar.bio || '',
        headshot_url: currentScholar.headshot_url || '',
        resume_url: currentScholar.resume_url || '',
        ministry_statement: currentScholar.ministry_statement || '',
      });
    }
  }, [currentScholar]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('You must be logged in to save your profile');
      return;
    }
    const result = await updateScholar(formData);
    if (result.success) {
      setEditMode(false);
      toast.success('Profile saved successfully');
    }
  };

  const handleHeadshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingHeadshot(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `bowman-scholars/${user.id}/headshot.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, headshot_url: publicUrl }));
      toast.success('Headshot uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload headshot');
    } finally {
      setUploadingHeadshot(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingResume(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `bowman-scholars/${user.id}/resume.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);
      
      setFormData(prev => ({ ...prev, resume_url: publicUrl }));
      toast.success('Resume uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleCameraCapture = async (blob: Blob) => {
    if (!user) return;
    try {
      const filePath = `bowman-scholars/${user.id}/headshot-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('media').upload(filePath, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, headshot_url: publicUrl }));
      toast.success('Photo captured and uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    }
    setShowCamera(false);
  };

  const handleWorksheetSave = async (worksheetData: Partial<LiturgicalWorksheet>) => {
    if (editingWorksheet) {
      return await updateWorksheet(editingWorksheet.id, worksheetData);
    } else {
      return await createWorksheet(worksheetData);
    }
  };

  const viewOptions = [
    { value: 'profile', label: 'My Profile', icon: User },
    { value: 'directory', label: 'Scholars Directory', icon: Users },
    { value: 'worksheets', label: 'Liturgy Planning', icon: BookOpen },
    { value: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/academy')}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Academy</span>
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{course?.title || 'Bowman Scholars'}</h1>
                <p className="text-sm text-muted-foreground">{course?.courseCode} • Spring 2026</p>
              </div>
            </div>
            
            {/* View Selector - Dropdown on mobile */}
            <Select value={activeView} onValueChange={(v: any) => setActiveView(v)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {viewOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Profile View */}
        {activeView === 'profile' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Profile Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Scholar Profile
                </CardTitle>
                {currentScholar && (
                  <Button 
                    variant={editMode ? "default" : "outline"} 
                    size="sm"
                    onClick={() => editMode ? handleSave() : setEditMode(true)}
                  >
                    {editMode ? (
                      <><Save className="h-4 w-4 mr-1" /> Save</>
                    ) : (
                      <><Edit2 className="h-4 w-4 mr-1" /> Edit</>
                    )}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar & Basic Info */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                      <AvatarImage src={formData.headshot_url} />
                      <AvatarFallback className="text-2xl">
                        {formData.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {editMode && (
                      <div className="absolute -bottom-2 -right-2 flex gap-1">
                        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setShowCamera(true)}>
                          <Camera className="h-4 w-4" />
                        </Button>
                        <label>
                          <Button size="icon" variant="secondary" className="h-8 w-8" asChild>
                            <span><Upload className="h-4 w-4" /></span>
                          </Button>
                          <input type="file" accept="image/*" className="hidden" onChange={handleHeadshotUpload} />
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    {editMode ? (
                      <Input 
                        value={formData.full_name} 
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        placeholder="Full Name"
                        className="text-lg font-semibold"
                      />
                    ) : (
                      <h2 className="text-xl font-semibold">{formData.full_name || 'Your Name'}</h2>
                    )}
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      <Badge variant="secondary">{formData.major || 'Major'}</Badge>
                      <Badge variant="outline">Class of {formData.grad_year}</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Form Fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Major</Label>
                    {editMode ? (
                      <Input 
                        value={formData.major} 
                        onChange={(e) => handleInputChange('major', e.target.value)}
                        placeholder="e.g., Music"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{formData.major || 'Not specified'}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Graduation Year</Label>
                    {editMode ? (
                      <Select 
                        value={String(formData.grad_year)} 
                        onValueChange={(v) => handleInputChange('grad_year', parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026, 2027, 2028, 2029].map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">{formData.grad_year}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Hometown</Label>
                    {editMode ? (
                      <Input 
                        value={formData.hometown} 
                        onChange={(e) => handleInputChange('hometown', e.target.value)}
                        placeholder="City, State"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{formData.hometown || 'Not specified'}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><FileText className="h-3 w-3" /> Resume</Label>
                    {editMode ? (
                      <label>
                        <Button variant="outline" size="sm" className="w-full" asChild disabled={uploadingResume}>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingResume ? 'Uploading...' : formData.resume_url ? 'Replace Resume' : 'Upload Resume'}
                          </span>
                        </Button>
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
                      </label>
                    ) : formData.resume_url ? (
                      <a href={formData.resume_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                        View Resume
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not uploaded</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bio</Label>
                  {editMode ? (
                    <Textarea 
                      value={formData.bio} 
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{formData.bio || 'No bio provided'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Ministry Statement</Label>
                  {editMode ? (
                    <Textarea 
                      value={formData.ministry_statement} 
                      onChange={(e) => handleInputChange('ministry_statement', e.target.value)}
                      placeholder="Share your vision for ministry and spiritual leadership..."
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">{formData.ministry_statement || 'No ministry statement provided'}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Info Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Meeting Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Thursdays</p>
                      <p className="text-muted-foreground">7:00 PM - 9:00 PM EST</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Sundays</p>
                      <p className="text-muted-foreground">9:00 AM - 1:00 PM EST</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    About the Program
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Named after Sister Thea Bowman, this program develops liturgical leaders through spiritual formation, music ministry, and worship planning.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Directory View */}
        {activeView === 'directory' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Bowman Scholars Directory
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading scholars...</p>
              ) : scholars.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No scholars found</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {scholars.map(scholar => (
                    <Card key={scholar.user_id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={scholar.headshot_url} />
                            <AvatarFallback>{scholar.full_name?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium truncate">{scholar.full_name || 'Scholar'}</h3>
                            <p className="text-sm text-muted-foreground truncate">{scholar.major}</p>
                            <p className="text-xs text-muted-foreground">Class of {scholar.grad_year}</p>
                          </div>
                        </div>
                        {scholar.hometown && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {scholar.hometown}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Worksheets View */}
        {activeView === 'worksheets' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Liturgical Worksheets
              </CardTitle>
              <Button size="sm" onClick={() => { setEditingWorksheet(undefined); setShowWorksheetForm(true); }}>
                + New Worksheet
              </Button>
            </CardHeader>
            <CardContent>
              {worksheetsLoading ? (
                <p className="text-center text-muted-foreground py-8">Loading worksheets...</p>
              ) : worksheets.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No liturgical worksheets yet. Create your first one!</p>
              ) : (
                <div className="space-y-3">
                  {worksheets.map(ws => (
                    <Card key={ws.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setEditingWorksheet(ws); setShowWorksheetForm(true); }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{ws.liturgical_season || 'Liturgy'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {ws.liturgical_date ? format(new Date(ws.liturgical_date), 'MMMM d, yyyy') : 'No date'}
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {ws.liturgical_season || 'draft'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedule View */}
        {activeView === 'schedule' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Spring 2026 Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="font-medium mb-2">Weekly Meetings</h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Thursday Evening</p>
                        <p className="text-sm text-muted-foreground">7:00 PM - 9:00 PM EST</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Sunday Ministry</p>
                        <p className="text-sm text-muted-foreground">9:00 AM - 1:00 PM EST</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Semester: January 14 - May 6, 2026</p>
                  <p className="mt-1">Session calendar and attendance will be tracked here once classes begin.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Camera Capture Modal */}
        <CameraCapture 
          isOpen={showCamera}
          onCapture={handleCameraCapture} 
          onCancel={() => setShowCamera(false)}
        />

        {/* Liturgical Worksheet Form Modal */}
        {showWorksheetForm && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl my-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{editingWorksheet ? 'Edit Worksheet' : 'New Liturgical Worksheet'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowWorksheetForm(false); setEditingWorksheet(undefined); }}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="max-h-[70vh] overflow-y-auto">
                <LiturgicalWorksheetForm 
                  worksheet={editingWorksheet}
                  onSave={handleWorksheetSave}
                  onCancel={() => { setShowWorksheetForm(false); setEditingWorksheet(undefined); }}
                />
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </UniversalLayout>
  );
}


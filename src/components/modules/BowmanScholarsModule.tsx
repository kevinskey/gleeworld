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
import { GraduationCap, User, Edit2, Users, BookOpen, Calendar, Plus, FileText, Clock } from 'lucide-react';
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
  
  const [formData, setFormData] = useState({
    major: currentScholar?.major || '',
    grad_year: currentScholar?.grad_year || new Date().getFullYear(),
    bio: currentScholar?.bio || '',
    headshot_url: currentScholar?.headshot_url || '',
  });

  const handleSave = async () => {
    const result = await updateScholar(formData);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-gold/20 to-blue/20 rounded-lg">
          <GraduationCap className="h-6 w-6 text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Bowman Scholars</h1>
          <p className="text-sm text-muted-foreground">
            Celebrating academic excellence in the Glee Club community
          </p>
        </div>
      </div>

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Scholar Directory
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Profile
          </TabsTrigger>
          <TabsTrigger value="liturgical" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Liturgical Planning
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          {/* Lyke House Bowman Scholar Program Landing */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8 items-start">
                {/* Left column - Sister Thea Bowman Image */}
                <div className="flex justify-center md:justify-start">
                  <img 
                    src="/lovable-uploads/eef8650c-760f-4cc7-9e94-d1da279feeca.png"
                    alt="Sister Thea Bowman speaking at a podium"
                    className="rounded-lg shadow-lg max-w-full h-auto"
                  />
                </div>
                
                {/* Right column - Program Information */}
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-primary">
                    Lyke House Bowman Scholar Program
                  </h2>
                  
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    <p>
                      This program is named in honor of Sister Thea Bowman. It is a group of music majors who are invited to help develop the music program at the Catholic Center in the spirit of Sr. Thea Bowman.
                    </p>
                    
                    <p>
                      One of the main goals of the Bowman Scholar program is to create the foundation for training musicians and artists to serve Catholic parishes, especially predominantly Black congregations, across the nation and around the world.
                    </p>
                    
                    <p>
                      Sr. Thea Bowman was an African American Franciscan Sister of Perpetual Adoration. Born in Yazoo City, Mississippi, Thea expressed early on to her Methodist parents that she desired to become Catholic. Soon after she was enrolled in a school served by the Franciscan Sisters, and at age 15 in 1952 she entered their convent in LaCrosse, Wisconsin.
                    </p>
                    
                    <p>
                      Through music, dance, poetry and other expressive art forms, Sr. Thea's message of Black Catholic identity reached the masses. She understood the need for the Black American experience to be embedded within the Catholic tradition of Christian expression, and sought to eliminate the barriers of racism, misunderstanding, and unilateralism that would hinder the Catholic Church in the U.S. from being fully catholic or universal.
                    </p>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="text-sm">
                        <strong>For more information about the Bowman Scholar program, please contact:</strong><br />
                        Dr. Kevin Johnson, Director of Worship and Liturgy<br />
                        <a href="mailto:kevinskey@mac.com" className="text-primary hover:underline">
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
              <ScrollArea className="h-96">
                <div className="grid gap-4">
                  {scholars.length === 0 ? (
                    <div className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No scholars found</p>
                    </div>
                  ) : (
                    scholars.map((scholar) => (
                      <Card key={scholar.user_id} className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={scholar.headshot_url} />
                            <AvatarFallback>
                              <GraduationCap className="h-8 w-8" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="bg-gold/20 text-gold">
                                Bowman Scholar
                              </Badge>
                              {scholar.grad_year && (
                                <Badge variant="outline">
                                  Class of {scholar.grad_year}
                                </Badge>
                              )}
                            </div>
                            {scholar.major && (
                              <p className="text-sm font-medium mb-1">{scholar.major}</p>
                            )}
                            {scholar.bio && (
                              <p className="text-sm text-muted-foreground">{scholar.bio}</p>
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                  
                  <div>
                    <Label htmlFor="headshot_url">Headshot URL</Label>
                    <Input
                      id="headshot_url"
                      value={formData.headshot_url}
                      onChange={(e) => handleInputChange('headshot_url', e.target.value)}
                      placeholder="URL to your professional headshot"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      placeholder="Tell us about your academic achievements and goals..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleSave}>Save Profile</Button>
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={currentScholar?.headshot_url} />
                      <AvatarFallback>
                        <GraduationCap className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-gold/20 text-gold">
                          Bowman Scholar
                        </Badge>
                        {currentScholar?.grad_year && (
                          <Badge variant="outline">
                            Class of {currentScholar.grad_year}
                          </Badge>
                        )}
                      </div>
                      {currentScholar?.major && (
                        <p className="font-medium mb-2">{currentScholar.major}</p>
                      )}
                      {currentScholar?.bio && (
                        <p className="text-muted-foreground">{currentScholar.bio}</p>
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
                          <Card key={worksheet.id} className="p-4 hover:shadow-md transition-shadow">
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
                                  onClick={() => handleEditWorksheet(worksheet)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteWorksheet(worksheet.id)}
                                >
                                  <FileText className="h-4 w-4" />
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
                <Card className="p-4">
                  <h3 className="font-medium mb-2">Study Groups</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with fellow scholars for collaborative learning sessions.
                  </p>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-medium mb-2">Academic Calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    Important academic dates and Bowman Scholar events.
                  </p>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-medium mb-2">Scholarship Opportunities</h3>
                  <p className="text-sm text-muted-foreground">
                    Information about additional scholarships and academic grants.
                  </p>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
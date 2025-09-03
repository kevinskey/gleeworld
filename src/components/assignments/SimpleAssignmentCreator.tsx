import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Users, Music, Plus, Check, FileText, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

interface SimpleAssignmentCreatorProps {
  onAssignmentCreated?: () => void;
}

export const SimpleAssignmentCreator: React.FC<SimpleAssignmentCreatorProps> = ({
  onAssignmentCreated
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useUserRole();
  
  const [isCreating, setIsCreating] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignment_type: 'sight_reading',
    grading_period: 'week_1',
    points_possible: 100,
    target_type: 'all',
    target_value: '',
    notes: '',
    musicxml_content: ''
  });

  // Check if user has permission to create assignments
  const canCreateAssignments = () => {
    return (
      profile?.is_admin ||
      profile?.is_super_admin ||
      profile?.exec_board_role === 'student_conductor' ||
      (profile?.role && ['admin', 'director', 'instructor', 'section_leader'].includes(profile.role))
    );
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.musicxml') && !file.name.toLowerCase().endsWith('.xml')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a MusicXML file (.musicxml or .xml)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Read file content
    try {
      setIsUploading(true);
      const content = await file.text();
      setFormData({ ...formData, musicxml_content: content });
      
      if (!formData.title.trim()) {
        // Extract title from filename
        const fileName = file.name.replace(/\.(musicxml|xml)$/i, '');
        setFormData(prev => ({ ...prev, title: fileName, musicxml_content: content }));
      }
      
      toast({
        title: "File Loaded",
        description: `${file.name} has been loaded successfully.`,
      });
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: "File Read Error",
        description: "Failed to read the MusicXML file.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFormData({ ...formData, musicxml_content: '' });
  };

  const handleCreateAssignment = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for the assignment.",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "Due Date Required",
        description: "Please select a due date for the assignment.",
        variant: "destructive",
      });
      return;
    }

    if (formData.assignment_type === 'sight_reading' && !formData.musicxml_content) {
      toast({
        title: "MusicXML File Required",
        description: "Please upload a MusicXML file for sight reading assignments.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create assignment using existing edge function
      const { data, error } = await supabase.functions.invoke('create-sight-reading-assignment', {
        body: {
          title: formData.title,
          description: formData.description,
          due_date: dueDate.toISOString(),
          points_possible: formData.points_possible,
          target_type: formData.target_type === 'all' ? 'individual' : formData.target_type,
          target_value: formData.target_value || null,
          grading_period: formData.grading_period,
          musicxml_content: formData.musicxml_content || null
        }
      });

      if (error) throw error;

      toast({
        title: "Assignment Created",
        description: `Assignment "${formData.title}" has been created successfully.`,
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        assignment_type: 'sight_reading',
        grading_period: 'week_1',
        points_possible: 100,
        target_type: 'all',
        target_value: '',
        notes: '',
        musicxml_content: ''
      });
      setDueDate(undefined);
      setShowForm(false);
      setSelectedFile(null);
      
      onAssignmentCreated?.();

    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create assignment",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (!canCreateAssignments()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            You don't have permission to create assignments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={() => {
                  setFormData({ ...formData, assignment_type: 'sight_reading' });
                  setShowForm(true);
                }}
                className="h-20 flex flex-col gap-2"
                variant="outline"
              >
                <Music className="h-6 w-6" />
                <span>Sight Reading</span>
                <span className="text-xs text-muted-foreground">MusicXML file</span>
              </Button>
              
              <Button
                onClick={() => {
                  setFormData({ ...formData, assignment_type: 'practice_exercise' });
                  setShowForm(true);
                }}
                className="h-20 flex flex-col gap-2"
                variant="outline"
              >
                <FileText className="h-6 w-6" />
                <span>Practice Exercise</span>
              </Button>
              
              <Button
                onClick={() => {
                  setFormData({ ...formData, assignment_type: 'section_notes' });
                  setShowForm(true);
                }}
                className="h-20 flex flex-col gap-2"
                variant="outline"
              >
                <Users className="h-6 w-6" />
                <span>Section Notes</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Create {formData.assignment_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Assignment
              </CardTitle>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="assignment-title">Assignment Title *</Label>
                <Input
                  id="assignment-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter assignment title"
                />
              </div>

              <div>
                <Label htmlFor="assignment-description">Description</Label>
                <Textarea
                  id="assignment-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Assignment instructions or description..."
                  rows={3}
                />
              </div>

              {formData.assignment_type === 'sight_reading' && (
                <div>
                  <Label>MusicXML File *</Label>
                  <div className="space-y-3">
                    <div 
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => document.getElementById('musicxml-file')?.click()}
                    >
                      <input
                        id="musicxml-file"
                        type="file"
                        accept=".musicxml,.xml"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {!selectedFile ? (
                        <div className="space-y-2">
                          <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                          <div>
                            <p className="text-sm font-medium">Upload MusicXML File</p>
                            <p className="text-xs text-muted-foreground">Click to browse or drag and drop</p>
                            <p className="text-xs text-muted-foreground">.musicxml or .xml files only</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <FileText className="h-10 w-10 text-primary mx-auto" />
                          <div>
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {selectedFile && (
                      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{selectedFile.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeFile}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP") : "Select due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="points">Points Possible</Label>
                  <Input
                    id="points"
                    type="number"
                    value={formData.points_possible}
                    onChange={(e) => setFormData({ ...formData, points_possible: parseInt(e.target.value) || 100 })}
                    min="1"
                    max="1000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target-type">Assign To</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(value) => setFormData({ ...formData, target_type: value, target_value: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          All Members
                        </div>
                      </SelectItem>
                      <SelectItem value="section">Voice Section</SelectItem>
                      <SelectItem value="class">Class Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.target_type === 'section' && (
                  <div>
                    <Label htmlFor="voice-section">Voice Section</Label>
                    <Select
                      value={formData.target_value}
                      onValueChange={(value) => setFormData({ ...formData, target_value: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select voice section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soprano_1">Soprano 1</SelectItem>
                        <SelectItem value="soprano_2">Soprano 2</SelectItem>
                        <SelectItem value="alto_1">Alto 1</SelectItem>
                        <SelectItem value="alto_2">Alto 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.target_type === 'class' && (
                  <div>
                    <Label htmlFor="class-level">Class Level</Label>
                    <Select
                      value={formData.target_value}
                      onValueChange={(value) => setFormData({ ...formData, target_value: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="freshman">Freshman</SelectItem>
                        <SelectItem value="sophomore">Sophomore</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="grading-period">Grading Period</Label>
                <Select
                  value={formData.grading_period}
                  onValueChange={(value) => setFormData({ ...formData, grading_period: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week_1">Week 1</SelectItem>
                    <SelectItem value="week_2">Week 2</SelectItem>
                    <SelectItem value="week_3">Week 3</SelectItem>
                    <SelectItem value="week_4">Week 4</SelectItem>
                    <SelectItem value="week_5">Week 5</SelectItem>
                    <SelectItem value="week_6">Week 6</SelectItem>
                    <SelectItem value="week_7">Week 7</SelectItem>
                    <SelectItem value="week_8">Week 8</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes or instructions..."
                  rows={2}
                />
              </div>

              <Button 
                onClick={handleCreateAssignment}
                disabled={!dueDate || !formData.title.trim() || isCreating || isUploading || (formData.assignment_type === 'sight_reading' && !formData.musicxml_content)}
                className="w-full"
              >
                {isCreating ? (
                  "Creating Assignment..."
                ) : isUploading ? (
                  "Processing File..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Assignment
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
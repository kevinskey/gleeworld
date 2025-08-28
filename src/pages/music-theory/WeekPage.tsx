import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  BookOpen, 
  Upload, 
  FileText, 
  ExternalLink, 
  Calendar,
  Clock,
  Target,
  CheckCircle,
  Music,
  Award
} from 'lucide-react';
import { toast } from 'sonner';

// Week data structure
const weekData = {
  1: {
    topic: "Intro to notation, clefs, rhythm values",
    date: "Aug 21",
    month: "August",
    materials: [
      "Introduction to Music Notation",
      "Understanding Clefs (Treble, Bass, Alto)",
      "Note Values and Rest Values",
      "Time Signatures Basics"
    ],
    assignments: [
      {
        id: "1-1",
        title: "Notation Worksheet #1",
        type: "worksheet",
        dueDate: "Aug 23",
        points: 10,
        description: "Complete exercises on note identification and clef reading"
      },
      {
        id: "1-2", 
        title: "Rhythm Clapping Exercise",
        type: "audio",
        dueDate: "Aug 25",
        points: 15,
        description: "Record yourself clapping basic rhythm patterns"
      }
    ],
    objectives: [
      "Identify notes on treble and bass clef",
      "Understand basic note and rest values",
      "Read simple rhythm patterns",
      "Write basic notation symbols"
    ]
  },
  2: {
    topic: "Time signatures and meter; rhythm dictation",
    date: "Aug 26 & 28",
    month: "August",
    materials: [
      "Time Signatures Explained",
      "Understanding Meter (Duple, Triple, Quadruple)",
      "Rhythm Dictation Techniques",
      "Practice Exercises"
    ],
    assignments: [
      {
        id: "2-1",
        title: "Time Signature Analysis",
        type: "worksheet",
        dueDate: "Aug 30",
        points: 15,
        description: "Analyze various musical examples for time signatures and meter"
      },
      {
        id: "2-2",
        title: "Rhythm Dictation Recording",
        type: "audio",
        dueDate: "Sep 1",
        points: 20,
        description: "Listen to rhythms and notate what you hear"
      }
    ],
    objectives: [
      "Identify common time signatures",
      "Feel and conduct different meters",
      "Notate rhythms from audio examples",
      "Understand the relationship between time signature and meter"
    ]
  }
  // Add more weeks as needed...
};

const WeekPage = () => {
  const { weekNumber } = useParams<{ weekNumber: string }>();
  const [teacherNotes, setTeacherNotes] = useState('');
  const [additionalLinks, setAdditionalLinks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const week = weekData[parseInt(weekNumber || '0') as keyof typeof weekData];

  if (!week) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Week Not Found</h1>
            <p className="text-muted-foreground mb-6">The requested week content is not available.</p>
            <Link to="/music-theory-fundamentals">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </Button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`File "${file.name}" selected for upload`);
    }
  };

  const handleSubmitAssignment = (assignmentId: string) => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }
    
    // Here you would implement the actual file upload logic
    toast.success('Assignment submitted successfully!');
    setSelectedFile(null);
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        {/* Header */}
        <section className="py-8 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <Link to="/music-theory-fundamentals">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Course
                </Button>
              </Link>
              <Badge variant="outline">{week.month}</Badge>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">
                  Week {weekNumber}
                </h1>
                <p className="text-xl text-muted-foreground">{week.topic}</p>
                {week.date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {week.date}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-8 px-6">
          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="materials">Materials</TabsTrigger>
                <TabsTrigger value="assignments">Assignments</TabsTrigger>
                <TabsTrigger value="submit">Submit Work</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Learning Objectives
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {week.objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                          <span className="text-muted-foreground">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Teacher Notes & Additional Resources</CardTitle>
                    <CardDescription>
                      Important announcements and supplementary materials for this week
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="teacher-notes">Weekly Notes</Label>
                      <Textarea
                        id="teacher-notes"
                        placeholder="Teacher can add important notes, announcements, or clarifications here..."
                        value={teacherNotes}
                        onChange={(e) => setTeacherNotes(e.target.value)}
                        rows={4}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="additional-links">Additional Links & Resources</Label>
                      <Textarea
                        id="additional-links"
                        placeholder="Add helpful links, video tutorials, or reference materials..."
                        value={additionalLinks}
                        onChange={(e) => setAdditionalLinks(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Materials Tab */}
              <TabsContent value="materials" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Course Materials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {week.materials.map((material, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-primary" />
                            <span>{material}</span>
                          </div>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Access
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments" className="space-y-6">
                <div className="grid gap-4">
                  {week.assignments.map((assignment) => (
                    <Card key={assignment.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {assignment.type === 'audio' ? <Music className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                              {assignment.title}
                            </CardTitle>
                            <CardDescription>{assignment.description}</CardDescription>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">{assignment.points} points</Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              <Clock className="w-4 h-4 inline mr-1" />
                              Due {assignment.dueDate}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground capitalize">
                            {assignment.type} Assignment
                          </span>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Submit Work Tab */}
              <TabsContent value="submit" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5" />
                      Submit Assignment
                    </CardTitle>
                    <CardDescription>
                      Upload your completed work for this week's assignments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="assignment-select">Select Assignment</Label>
                      <select className="w-full p-2 border rounded-md bg-background">
                        <option value="">Choose an assignment...</option>
                        {week.assignments.map((assignment) => (
                          <option key={assignment.id} value={assignment.id}>
                            {assignment.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="file-upload">Upload File</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        onChange={handleFileUpload}
                        accept=".pdf,.doc,.docx,.mp3,.wav,.m4a"
                      />
                      {selectedFile && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Selected: {selectedFile.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="submission-notes">Notes (Optional)</Label>
                      <Textarea
                        id="submission-notes"
                        placeholder="Add any notes or comments about your submission..."
                        rows={3}
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => handleSubmitAssignment('current')}
                      disabled={!selectedFile}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Submit Assignment
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default WeekPage;
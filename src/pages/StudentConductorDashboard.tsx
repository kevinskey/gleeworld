import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { useNavigate } from "react-router-dom";
import { 
  Music, 
  Calendar, 
  Users, 
  Clock, 
  Star,
  Home,
  X,
  Play,
  Pause,
  SkipForward,
  Volume2,
  FileText,
  Target,
  BookOpen,
  Award,
  TrendingUp
} from "lucide-react";

export const StudentConductorDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("repertoire");
  const [isPlaying, setIsPlaying] = useState(false);

  // Mock data for repertoire
  const repertoire = [
    { 
      id: 1, 
      title: "Amazing Grace", 
      composer: "Traditional", 
      difficulty: "Intermediate",
      status: "In Progress",
      lastRehearsed: "2024-01-25",
      notes: "Work on dynamics in measures 16-24"
    },
    { 
      id: 2, 
      title: "Ave Maria", 
      composer: "Schubert", 
      difficulty: "Advanced",
      status: "Mastered",
      lastRehearsed: "2024-01-23",
      notes: "Performance ready"
    },
    { 
      id: 3, 
      title: "Swing Low, Sweet Chariot", 
      composer: "Traditional Spiritual", 
      difficulty: "Beginner",
      status: "Learning",
      lastRehearsed: "2024-01-26",
      notes: "Focus on rhythm in chorus"
    },
  ];

  // Mock data for rehearsal schedule
  const rehearsalSchedule = [
    { id: 1, date: "2024-01-29", time: "3:00 PM - 5:00 PM", focus: "Amazing Grace - Dynamics", type: "Full Choir" },
    { id: 2, date: "2024-01-30", time: "4:00 PM - 5:00 PM", focus: "Sectionals - Alto/Soprano", type: "Sectional" },
    { id: 3, date: "2024-02-01", time: "3:00 PM - 5:00 PM", focus: "New Repertoire Introduction", type: "Full Choir" },
    { id: 4, date: "2024-02-03", time: "2:00 PM - 4:00 PM", focus: "Performance Preparation", type: "Full Choir" },
  ];

  // Mock conducting resources
  const conductingResources = [
    { id: 1, title: "Basic Conducting Patterns", type: "Video", duration: "12 min", completed: true },
    { id: 2, title: "Tempo and Dynamics", type: "Article", duration: "8 min read", completed: true },
    { id: 3, title: "Choir Warm-up Techniques", type: "Video", duration: "15 min", completed: false },
    { id: 4, title: "Score Analysis Methods", type: "PDF", duration: "20 pages", completed: false },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Mastered': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Learning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        {/* Navigation Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Exit Student Conductor Dashboard
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Music className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Student Conductor Dashboard</h1>
              <p className="text-muted-foreground">Lead rehearsals and develop your conducting skills</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="repertoire">Repertoire</TabsTrigger>
                <TabsTrigger value="rehearsals">Rehearsals</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="repertoire" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Current Repertoire
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {repertoire.map((piece) => (
                        <Card key={piece.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{piece.title}</h4>
                                <p className="text-muted-foreground">{piece.composer}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={getDifficultyColor(piece.difficulty)}>
                                  {piece.difficulty}
                                </Badge>
                                <Badge className={`border ${getStatusColor(piece.status)}`}>
                                  {piece.status}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Last Rehearsed</p>
                                <p className="font-medium">{new Date(piece.lastRehearsed).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Conductor Notes</p>
                                <p className="font-medium text-sm">{piece.notes}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <FileText className="h-4 w-4 mr-2" />
                                View Score
                              </Button>
                              <Button size="sm" variant="outline">
                                <Play className="h-4 w-4 mr-2" />
                                Practice Track
                              </Button>
                              <Button size="sm" variant="outline">
                                Edit Notes
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rehearsals" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Rehearsal Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rehearsalSchedule.map((rehearsal) => (
                        <Card key={rehearsal.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-semibold">{new Date(rehearsal.date).toLocaleDateString()}</p>
                                  <p className="text-sm text-muted-foreground">{rehearsal.time}</p>
                                </div>
                              </div>
                              <Badge variant="outline">{rehearsal.type}</Badge>
                            </div>
                            <p className="text-sm mb-3">{rehearsal.focus}</p>
                            <div className="flex gap-2">
                              <Button size="sm">
                                <Play className="h-4 w-4 mr-2" />
                                Start Rehearsal
                              </Button>
                              <Button size="sm" variant="outline">
                                Edit Plan
                              </Button>
                              <Button size="sm" variant="outline">
                                View Attendance
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Conducting Development Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progress</span>
                        <span className="text-sm text-muted-foreground">2 of 4 completed</span>
                      </div>
                      <Progress value={50} className="h-2" />
                    </div>
                    
                    <div className="space-y-4">
                      {conductingResources.map((resource) => (
                        <Card key={resource.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${resource.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <div>
                                  <p className="font-medium">{resource.title}</p>
                                  <p className="text-sm text-muted-foreground">{resource.type} • {resource.duration}</p>
                                </div>
                              </div>
                              <Button size="sm" variant={resource.completed ? "outline" : "default"}>
                                {resource.completed ? "Review" : "Start"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Conducting Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Conducting Skills</span>
                      <span>75%</span>
                    </div>
                    <Progress value={75} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Score Analysis</span>
                      <span>60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Rehearsal Leadership</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  Start Practice Session
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Rehearsal
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Add Repertoire
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Contact Choir Members
                </Button>
              </CardContent>
            </Card>

            {/* Practice Timer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Practice Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="text-3xl font-mono font-bold">25:00</div>
                  <div className="flex justify-center gap-2">
                    <Button size="sm" onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline">
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Focus: Tempo Consistency
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Plus, 
  Calendar, 
  Upload, 
  FileText, 
  Video, 
  Mic, 
  Edit, 
  Trash,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface Interview {
  id: string;
  name: string;
  role: string;
  topic: string;
  status: "scheduled" | "completed" | "transcribed" | "archived";
  dateScheduled?: string;
  dateCompleted?: string;
  hasAudio: boolean;
  hasVideo: boolean;
  hasTranscript: boolean;
  notes: string;
}

export const InterviewToolkit = () => {
  const [activeTab, setActiveTab] = useState("schedule");
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [topic, setTopic] = useState("");
  const [dateScheduled, setDateScheduled] = useState("");
  const [notes, setNotes] = useState("");

  // Mock data
  const [interviews, setInterviews] = useState<Interview[]>([
    {
      id: "1",
      name: "Dr. Dorothy Johnson",
      role: "Director Emerita",
      topic: "Centennial Reflections",
      status: "completed",
      dateScheduled: "2024-11-15",
      dateCompleted: "2024-11-15",
      hasAudio: true,
      hasVideo: true,
      hasTranscript: false,
      notes: "Amazing stories about the early years of the Glee Club"
    },
    {
      id: "2",
      name: "Alumni Class of '95",
      role: "Alumni",
      topic: "90s Era Memories",
      status: "transcribed",
      dateScheduled: "2024-10-20",
      dateCompleted: "2024-10-20",
      hasAudio: true,
      hasVideo: false,
      hasTranscript: true,
      notes: "Group interview with 5 alumni from the Class of '95"
    },
    {
      id: "3",
      name: "Sarah Mitchell",
      role: "Senior",
      topic: "Student Perspective on Centennial Year",
      status: "scheduled",
      dateScheduled: "2024-12-15",
      hasAudio: false,
      hasVideo: false,
      hasTranscript: false,
      notes: "Current senior's perspective on being part of the centennial year"
    }
  ]);

  const handleScheduleInterview = () => {
    if (!name || !role || !topic) return;

    const newInterview: Interview = {
      id: Date.now().toString(),
      name,
      role,
      topic,
      status: "scheduled",
      dateScheduled,
      hasAudio: false,
      hasVideo: false,
      hasTranscript: false,
      notes
    };

    setInterviews([newInterview, ...interviews]);
    
    // Reset form
    setName("");
    setRole("");
    setTopic("");
    setDateScheduled("");
    setNotes("");
  };

  const updateInterviewStatus = (interviewId: string, status: Interview['status']) => {
    setInterviews(interviews.map(interview => 
      interview.id === interviewId 
        ? { 
            ...interview, 
            status,
            dateCompleted: status === "completed" ? new Date().toISOString().split('T')[0] : interview.dateCompleted
          }
        : interview
    ));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled": return <Calendar className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "transcribed": return <FileText className="h-4 w-4" />;
      case "archived": return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "secondary";
      case "completed": return "default";
      case "transcribed": return "outline";
      case "archived": return "outline";
      default: return "secondary";
    }
  };

  const filterInterviews = (status?: string) => {
    if (!status) return interviews;
    return interviews.filter(interview => interview.status === status);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Interview Toolkit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="schedule">
                <Plus className="h-4 w-4 mr-2" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="pending">
                <Clock className="h-4 w-4 mr-2" />
                Pending ({filterInterviews("scheduled").length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                <CheckCircle className="h-4 w-4 mr-2" />
                Completed ({filterInterviews("completed").length + filterInterviews("transcribed").length})
              </TabsTrigger>
              <TabsTrigger value="all">
                <Users className="h-4 w-4 mr-2" />
                All ({interviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Interviewee Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role/Position</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Sophomore">Sophomore</SelectItem>
                      <SelectItem value="First-Year">First-Year</SelectItem>
                      <SelectItem value="Alumni">Alumni</SelectItem>
                      <SelectItem value="Director">Director</SelectItem>
                      <SelectItem value="Faculty">Faculty</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                      <SelectItem value="Community Member">Community Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="topic">Interview Topic/Title</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Centennial Memories, Student Experience, etc."
                />
              </div>

              <div>
                <Label htmlFor="dateScheduled">Scheduled Date (Optional)</Label>
                <Input
                  id="dateScheduled"
                  type="date"
                  value={dateScheduled}
                  onChange={(e) => setDateScheduled(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about the interview..."
                  rows={3}
                />
              </div>

              <Button onClick={handleScheduleInterview} disabled={!name || !role || !topic}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Interview
              </Button>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {filterInterviews("scheduled").map((interview) => (
                <Card key={interview.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{interview.name}</h3>
                          <Badge variant="secondary">{interview.role}</Badge>
                          <Badge variant={getStatusColor(interview.status)} className="flex items-center gap-1">
                            {getStatusIcon(interview.status)}
                            Scheduled
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{interview.topic}</p>
                        {interview.dateScheduled && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Scheduled for: {new Date(interview.dateScheduled).toLocaleDateString()}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">{interview.notes}</p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateInterviewStatus(interview.id, "completed")}
                        >
                          Mark Complete
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {[...filterInterviews("completed"), ...filterInterviews("transcribed")].map((interview) => (
                <Card key={interview.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{interview.name}</h3>
                          <Badge variant="secondary">{interview.role}</Badge>
                          <Badge variant={getStatusColor(interview.status)} className="flex items-center gap-1">
                            {getStatusIcon(interview.status)}
                            {interview.status === "transcribed" ? "Transcribed" : "Completed"}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{interview.topic}</p>
                        {interview.dateCompleted && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Completed: {new Date(interview.dateCompleted).toLocaleDateString()}
                          </p>
                        )}
                        
                        <div className="flex gap-4 mb-2">
                          <div className="flex items-center gap-1 text-sm">
                            <Mic className="h-4 w-4" />
                            Audio: {interview.hasAudio ? "Yes" : "No"}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Video className="h-4 w-4" />
                            Video: {interview.hasVideo ? "Yes" : "No"}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <FileText className="h-4 w-4" />
                            Transcript: {interview.hasTranscript ? "Yes" : "No"}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{interview.notes}</p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button variant="outline" size="sm">
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Files
                        </Button>
                        {!interview.hasTranscript && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateInterviewStatus(interview.id, "transcribed")}
                          >
                            Mark Transcribed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {interviews.map((interview) => (
                <Card key={interview.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{interview.name}</h3>
                          <Badge variant="secondary">{interview.role}</Badge>
                          <Badge variant={getStatusColor(interview.status)} className="flex items-center gap-1">
                            {getStatusIcon(interview.status)}
                            {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{interview.topic}</p>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {interview.dateScheduled && (
                            <p>Scheduled: {new Date(interview.dateScheduled).toLocaleDateString()}</p>
                          )}
                          {interview.dateCompleted && (
                            <p>Completed: {new Date(interview.dateCompleted).toLocaleDateString()}</p>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{interview.notes}</p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
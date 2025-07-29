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
  MessageSquare, 
  Send, 
  Bell, 
  HelpCircle, 
  Mail, 
  Calendar,
  Archive,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  recipient: "assistant" | "director" | "executive_board";
  status: "sent" | "read" | "archived";
  priority: "low" | "medium" | "high";
  sentDate: string;
}

interface HelpRequest {
  id: string;
  title: string;
  description: string;
  category: "media" | "interview" | "event" | "technical" | "general";
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "resolved";
  submittedDate: string;
}

export const CommunicationTools = () => {
  const [activeTab, setActiveTab] = useState("announcements");
  
  // Announcement form state
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementRecipient, setAnnouncementRecipient] = useState("");
  const [announcementPriority, setAnnouncementPriority] = useState("medium");

  // Help request form state
  const [helpTitle, setHelpTitle] = useState("");
  const [helpDescription, setHelpDescription] = useState("");
  const [helpCategory, setHelpCategory] = useState("");
  const [helpPriority, setHelpPriority] = useState("medium");

  // Mock data
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "Fall Concert Media Upload Complete",
      message: "All photos and videos from the Fall Concert have been uploaded and tagged. Ready for review.",
      recipient: "director",
      status: "read",
      priority: "medium",
      sentDate: "2024-11-21T10:30:00Z"
    },
    {
      id: "2",
      title: "Interview Schedule Update",
      message: "Dr. Johnson interview rescheduled to next Friday at 2 PM. Please confirm availability.",
      recipient: "assistant",
      status: "sent",
      priority: "high",
      sentDate: "2024-11-20T14:15:00Z"
    }
  ]);

  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([
    {
      id: "1",
      title: "Need help with video editing software",
      description: "Having trouble with the new video editing software for interview processing. Could use some technical assistance.",
      category: "technical",
      priority: "medium",
      status: "in_progress",
      submittedDate: "2024-11-19T11:00:00Z"
    },
    {
      id: "2",
      title: "Alumni contact information needed",
      description: "Need contact details for Class of '98 alumni for upcoming interview series.",
      category: "interview",
      priority: "low",
      status: "pending",
      submittedDate: "2024-11-18T16:30:00Z"
    }
  ]);

  const handleSendAnnouncement = () => {
    if (!announcementTitle || !announcementMessage || !announcementRecipient) return;

    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      title: announcementTitle,
      message: announcementMessage,
      recipient: announcementRecipient as "assistant" | "director" | "executive_board",
      status: "sent",
      priority: announcementPriority as "low" | "medium" | "high",
      sentDate: new Date().toISOString()
    };

    setAnnouncements([newAnnouncement, ...announcements]);
    
    // Reset form
    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setAnnouncementRecipient("");
    setAnnouncementPriority("medium");
  };

  const handleSubmitHelpRequest = () => {
    if (!helpTitle || !helpDescription || !helpCategory) return;

    const newHelpRequest: HelpRequest = {
      id: Date.now().toString(),
      title: helpTitle,
      description: helpDescription,
      category: helpCategory as "media" | "interview" | "event" | "technical" | "general",
      priority: helpPriority as "low" | "medium" | "high",
      status: "pending",
      submittedDate: new Date().toISOString()
    };

    setHelpRequests([newHelpRequest, ...helpRequests]);
    
    // Reset form
    setHelpTitle("");
    setHelpDescription("");
    setHelpCategory("");
    setHelpPriority("medium");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent": return <Send className="h-4 w-4" />;
      case "read": return <CheckCircle className="h-4 w-4" />;
      case "archived": return <Archive className="h-4 w-4" />;
      case "pending": return <Clock className="h-4 w-4" />;
      case "in_progress": return <AlertCircle className="h-4 w-4" />;
      case "resolved": return <CheckCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getRecipientDisplay = (recipient: string) => {
    switch (recipient) {
      case "assistant": return "Assistant Historian";
      case "director": return "Director";
      case "executive_board": return "Executive Board";
      default: return recipient;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="announcements">
                <Bell className="h-4 w-4 mr-2" />
                Announcements
              </TabsTrigger>
              <TabsTrigger value="help">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help Requests
              </TabsTrigger>
              <TabsTrigger value="history">
                <Archive className="h-4 w-4 mr-2" />
                Message History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="announcements" className="space-y-6">
              {/* Send Announcement Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Send Announcement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="announcement-title">Title</Label>
                      <Input
                        id="announcement-title"
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        placeholder="Announcement title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="announcement-recipient">Send To</Label>
                      <Select value={announcementRecipient} onValueChange={setAnnouncementRecipient}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select recipient" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assistant">Assistant Historian</SelectItem>
                          <SelectItem value="director">Director</SelectItem>
                          <SelectItem value="executive_board">Executive Board</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="announcement-message">Message</Label>
                    <Textarea
                      id="announcement-message"
                      value={announcementMessage}
                      onChange={(e) => setAnnouncementMessage(e.target.value)}
                      placeholder="Your announcement message..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <Label>Priority</Label>
                      <Select value={announcementPriority} onValueChange={setAnnouncementPriority}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleSendAnnouncement}
                      disabled={!announcementTitle || !announcementMessage || !announcementRecipient}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Announcement
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Announcements */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Recent Announcements</h3>
                {announcements.slice(0, 3).map((announcement) => (
                  <Card key={announcement.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{announcement.title}</h4>
                            <Badge variant={getPriorityColor(announcement.priority)}>
                              {announcement.priority}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getStatusIcon(announcement.status)}
                              {announcement.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            To: {getRecipientDisplay(announcement.recipient)}
                          </p>
                          <p className="text-sm">{announcement.message}</p>
                        </div>
                        <div className="text-xs text-muted-foreground ml-4">
                          {new Date(announcement.sentDate).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="help" className="space-y-6">
              {/* Submit Help Request Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Help</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="help-title">Issue Title</Label>
                      <Input
                        id="help-title"
                        value={helpTitle}
                        onChange={(e) => setHelpTitle(e.target.value)}
                        placeholder="Brief description of the issue"
                      />
                    </div>
                    <div>
                      <Label htmlFor="help-category">Category</Label>
                      <Select value={helpCategory} onValueChange={setHelpCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="media">Media/Upload Issues</SelectItem>
                          <SelectItem value="interview">Interview Coordination</SelectItem>
                          <SelectItem value="event">Event Documentation</SelectItem>
                          <SelectItem value="technical">Technical Support</SelectItem>
                          <SelectItem value="general">General Question</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="help-description">Description</Label>
                    <Textarea
                      id="help-description"
                      value={helpDescription}
                      onChange={(e) => setHelpDescription(e.target.value)}
                      placeholder="Detailed description of what you need help with..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <Label>Priority</Label>
                      <Select value={helpPriority} onValueChange={setHelpPriority}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleSubmitHelpRequest}
                      disabled={!helpTitle || !helpDescription || !helpCategory}
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Submit Request
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Help Request Status */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Your Help Requests</h3>
                {helpRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{request.title}</h4>
                            <Badge variant={getPriorityColor(request.priority)}>
                              {request.priority}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Category: {request.category}
                          </p>
                          <p className="text-sm">{request.description}</p>
                        </div>
                        <div className="text-xs text-muted-foreground ml-4">
                          {new Date(request.submittedDate).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Message Archive</h3>
                <p>Complete history of all announcements and help requests will be displayed here.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
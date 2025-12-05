import { useState, useRef } from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, Plus, Calendar, Save, Edit2, Trash2, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Agenda {
  id: string;
  title: string;
  content: string;
  meetingNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingAgendasPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [activeAgenda, setActiveAgenda] = useState<Agenda | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const templates = [
    {
      id: "weekly",
      title: "Weekly Meeting",
      description: "Standard format for weekly exec board meetings",
      content: `EXECUTIVE BOARD WEEKLY MEETING AGENDA

Date: ${new Date().toLocaleDateString()}
Time: 
Location: 

I. CALL TO ORDER
   - Roll Call
   - Approval of Previous Minutes

II. OFFICER REPORTS
   - President's Report
   - Vice President's Report
   - Secretary's Report
   - Treasurer's Report
   - Other Officers

III. OLD BUSINESS
   - 
   - 

IV. NEW BUSINESS
   - 
   - 

V. ANNOUNCEMENTS
   - Upcoming Events
   - Important Dates

VI. ADJOURNMENT
   - Next Meeting Date: `
    },
    {
      id: "emergency",
      title: "Emergency Meeting",
      description: "Quick format for urgent matters",
      content: `EMERGENCY EXECUTIVE BOARD MEETING

Date: ${new Date().toLocaleDateString()}
Time: 
Called by: 

URGENT MATTER:


ATTENDEES:
- 
- 

DISCUSSION POINTS:
1. 
2. 
3. 

IMMEDIATE ACTION ITEMS:
- Action: 
  Responsible: 
  Deadline: 

RESOLUTION:


Meeting Adjourned: `
    },
    {
      id: "semester-review",
      title: "Semester Review",
      description: "Comprehensive end-of-semester format",
      content: `END OF SEMESTER EXECUTIVE BOARD REVIEW

Semester: 
Date: ${new Date().toLocaleDateString()}

I. SEMESTER OVERVIEW
   - Major Accomplishments:
   - Challenges Faced:
   - Lessons Learned:

II. DEPARTMENTAL REVIEWS
   A. President
      - Goals Met:
      - Ongoing Projects:
      - Recommendations:

   B. Vice President
      - Goals Met:
      - Ongoing Projects:
      - Recommendations:

   (Continue for all positions)

III. FINANCIAL SUMMARY
   - Budget Overview:
   - Major Expenditures:
   - Fundraising Results:

IV. EVENT RECAP
   - Successful Events:
   - Areas for Improvement:

V. TRANSITION NOTES
   - Items for Incoming Board:
   - Pending Projects:
   - Important Contacts:

VI. GOALS FOR NEXT SEMESTER
   1. 
   2. 
   3. 

VII. CLOSING REMARKS
`
    }
  ];

  const handleCreateFromTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newAgenda: Agenda = {
      id: crypto.randomUUID(),
      title: `${template.title} - ${new Date().toLocaleDateString()}`,
      content: template.content,
      meetingNotes: "",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setAgendas(prev => [newAgenda, ...prev]);
    setActiveAgenda(newAgenda);
    setEditTitle(newAgenda.title);
    setEditContent(newAgenda.content);
    setEditNotes(newAgenda.meetingNotes);
    setIsEditing(true);
    toast.success(`New agenda created from "${template.title}" template`);
  };

  const handleCreateBlank = () => {
    const newAgenda: Agenda = {
      id: crypto.randomUUID(),
      title: `Meeting Agenda - ${new Date().toLocaleDateString()}`,
      content: "",
      meetingNotes: "",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setAgendas(prev => [newAgenda, ...prev]);
    setActiveAgenda(newAgenda);
    setEditTitle(newAgenda.title);
    setEditContent(newAgenda.content);
    setEditNotes(newAgenda.meetingNotes);
    setIsEditing(true);
    toast.success("New blank agenda created");
  };

  const handleOpenAgenda = (agenda: Agenda) => {
    setActiveAgenda(agenda);
    setEditTitle(agenda.title);
    setEditContent(agenda.content);
    setEditNotes(agenda.meetingNotes);
    setIsEditing(false);
  };

  const handleSaveAgenda = () => {
    if (!activeAgenda) return;
    if (!editTitle.trim()) {
      toast.error("Please enter an agenda title");
      return;
    }

    const updatedAgenda: Agenda = {
      ...activeAgenda,
      title: editTitle,
      content: editContent,
      meetingNotes: editNotes,
      updatedAt: new Date()
    };

    setAgendas(prev => prev.map(a => a.id === activeAgenda.id ? updatedAgenda : a));
    setActiveAgenda(updatedAgenda);
    setIsEditing(false);
    toast.success("Agenda saved");
  };

  const handleDeleteAgenda = (agendaId: string) => {
    setAgendas(prev => prev.filter(a => a.id !== agendaId));
    if (activeAgenda?.id === agendaId) {
      setActiveAgenda(null);
      setIsEditing(false);
    }
    toast.success("Agenda deleted");
  };

  const handleCloseAgenda = () => {
    setActiveAgenda(null);
    setIsEditing(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const content = await file.text();
      setEditNotes(prev => prev + (prev ? "\n\n" : "") + `--- Uploaded: ${file.name} ---\n${content}`);
      toast.success(`Notes from "${file.name}" added`);
    } else {
      toast.error("Please upload a text file (.txt or .md)");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Active agenda view
  if (activeAgenda) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={handleCloseAgenda}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to All Agendas
          </Button>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-4">
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold"
                    placeholder="Agenda Title"
                  />
                ) : (
                  <CardTitle className="text-2xl">{activeAgenda.title}</CardTitle>
                )}
                <div className="flex gap-2 shrink-0">
                  {isEditing ? (
                    <>
                      <Button onClick={handleSaveAgenda} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleDeleteAgenda(activeAgenda.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Created {activeAgenda.createdAt.toLocaleDateString()} • 
                Last updated {activeAgenda.updatedAt.toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Agenda Content</label>
                {isEditing ? (
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    placeholder="Enter your agenda content here..."
                  />
                ) : (
                  <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono min-h-[200px]">
                    {activeAgenda.content || "No content yet. Click Edit to add agenda items."}
                  </pre>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Meeting Notes</label>
                  {isEditing && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".txt,.md"
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Notes
                      </Button>
                    </>
                  )}
                </div>
                {isEditing ? (
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="min-h-[150px] font-mono text-sm"
                    placeholder="Add meeting notes, decisions, action items..."
                  />
                ) : (
                  <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono min-h-[100px]">
                    {activeAgenda.meetingNotes || "No meeting notes yet. Click Edit to add notes."}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  // Main list view
  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/executive-board-workshop')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Workshop
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Meeting Agendas</h1>
            <p className="text-muted-foreground">Create and manage meeting agendas</p>
          </div>
          <Button className="gap-2" onClick={handleCreateBlank}>
            <Plus className="h-4 w-4" />
            Blank Agenda
          </Button>
        </div>

        <div className="grid gap-4">
          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Start from Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Click a template to create a new agenda with pre-filled structure
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleCreateFromTemplate(template.id)}
                    className="p-4 rounded-lg bg-muted/30 border hover:bg-primary/10 hover:border-primary/30 transition-colors text-left"
                  >
                    <h4 className="font-medium">{template.title}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* My Agendas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                My Agendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {agendas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No agendas yet.</p>
                  <p className="text-sm">Choose a template above or create a blank agenda to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {agendas.map((agenda) => (
                    <div 
                      key={agenda.id}
                      className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors flex items-center justify-between cursor-pointer"
                      onClick={() => handleOpenAgenda(agenda)}
                    >
                      <div>
                        <h4 className="font-medium">{agenda.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Updated {agenda.updatedAt.toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAgenda(agenda.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default MeetingAgendasPage;

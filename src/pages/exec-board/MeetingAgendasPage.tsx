import { useState } from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, Plus, Calendar, Download, Copy, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MeetingAgendasPage = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showNewAgendaDialog, setShowNewAgendaDialog] = useState(false);
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaNotes, setNewAgendaNotes] = useState("");

  const templates = [
    {
      id: "weekly",
      title: "Weekly Meeting Template",
      description: "Standard format for weekly exec board meetings",
      content: `EXECUTIVE BOARD WEEKLY MEETING AGENDA

Date: [DATE]
Time: [TIME]
Location: [LOCATION]

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
   - [Item 1]
   - [Item 2]

IV. NEW BUSINESS
   - [Item 1]
   - [Item 2]

V. ANNOUNCEMENTS
   - Upcoming Events
   - Important Dates

VI. ADJOURNMENT
   - Next Meeting Date: [DATE]`
    },
    {
      id: "emergency",
      title: "Emergency Meeting Template",
      description: "Quick format for urgent matters",
      content: `EMERGENCY EXECUTIVE BOARD MEETING

Date: [DATE]
Time: [TIME]
Called by: [NAME]

URGENT MATTER:
[Describe the urgent issue requiring immediate attention]

ATTENDEES:
- 
- 

DISCUSSION POINTS:
1. 
2. 
3. 

IMMEDIATE ACTION ITEMS:
- Action: [DESCRIPTION]
  Responsible: [NAME]
  Deadline: [DATE]

RESOLUTION:
[Document the decision made]

Meeting Adjourned: [TIME]`
    },
    {
      id: "semester-review",
      title: "End of Semester Review Template",
      description: "Comprehensive review format",
      content: `END OF SEMESTER EXECUTIVE BOARD REVIEW

Semester: [FALL/SPRING] [YEAR]
Date: [DATE]

I. SEMESTER OVERVIEW
   - Major Accomplishments
   - Challenges Faced
   - Lessons Learned

II. DEPARTMENTAL REVIEWS
   A. President
      - Goals Met:
      - Ongoing Projects:
      - Recommendations:

   B. Vice President
      - Goals Met:
      - Ongoing Projects:
      - Recommendations:

   [Continue for all positions]

III. FINANCIAL SUMMARY
   - Budget Overview
   - Major Expenditures
   - Fundraising Results

IV. EVENT RECAP
   - Successful Events
   - Areas for Improvement

V. TRANSITION NOTES
   - Items for Incoming Board
   - Pending Projects
   - Important Contacts

VI. GOALS FOR NEXT SEMESTER
   1. 
   2. 
   3. 

VII. CLOSING REMARKS`
    }
  ];

  const handleCopyTemplate = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Template copied to clipboard!");
  };

  const handleDownloadTemplate = (title: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template downloaded!");
  };

  const handleCreateAgenda = () => {
    if (!newAgendaTitle.trim()) {
      toast.error("Please enter an agenda title");
      return;
    }
    toast.success(`Agenda "${newAgendaTitle}" created!`);
    setShowNewAgendaDialog(false);
    setNewAgendaTitle("");
    setNewAgendaNotes("");
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

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
            <p className="text-muted-foreground">Templates and past meeting notes</p>
          </div>
          <Button className="gap-2" onClick={() => setShowNewAgendaDialog(true)}>
            <Plus className="h-4 w-4" />
            New Agenda
          </Button>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Agenda Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map((template) => (
                  <div 
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className="p-4 rounded-lg bg-muted/30 border hover:bg-muted/50 hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <h4 className="font-medium">{template.title}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Past Meeting Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No meeting notes uploaded yet.</p>
                <p className="text-sm mb-4">Meeting notes will appear here once added.</p>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Meeting Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Preview Dialog */}
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplateData?.title}</DialogTitle>
              <DialogDescription>{selectedTemplateData?.description}</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                {selectedTemplateData?.content}
              </pre>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => handleCopyTemplate(selectedTemplateData?.content || "")}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Template
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleDownloadTemplate(selectedTemplateData?.title || "", selectedTemplateData?.content || "")}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* New Agenda Dialog */}
        <Dialog open={showNewAgendaDialog} onOpenChange={setShowNewAgendaDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agenda</DialogTitle>
              <DialogDescription>Start a new meeting agenda from scratch or use a template</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Agenda Title</label>
                <Input 
                  placeholder="e.g., Weekly Meeting - December 5, 2025"
                  value={newAgendaTitle}
                  onChange={(e) => setNewAgendaTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea 
                  placeholder="Add any initial notes or agenda items..."
                  value={newAgendaNotes}
                  onChange={(e) => setNewAgendaNotes(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateAgenda} className="flex-1">
                  Create Agenda
                </Button>
                <Button variant="outline" onClick={() => setShowNewAgendaDialog(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </UniversalLayout>
  );
};

export default MeetingAgendasPage;

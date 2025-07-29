import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, 
  FileText, 
  Calendar, 
  Users, 
  ClipboardList,
  MessageSquare,
  CheckSquare,
  Clock,
  ArrowLeft,
  ExternalLink,
  RefreshCw
} from "lucide-react";

type MeetingStatus = 'draft' | 'approved' | 'archived';

interface MeetingMinute {
  id: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  attendees: string[];
  agenda_items: string[];
  discussion_points: string;
  action_items: string[];
  next_meeting_date: string | null;
  status: MeetingStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  google_doc_id?: string | null;
  google_doc_url?: string | null;
}

interface MeetingMinutesEditorProps {
  minute?: MeetingMinute;
  onBack: () => void;
  onSave: () => void;
}

export const MeetingMinutesEditor = ({ minute, onBack, onSave }: MeetingMinutesEditorProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [formData, setFormData] = useState({
    title: minute?.title || '',
    meeting_date: minute?.meeting_date ? new Date(minute.meeting_date).toISOString().split('T')[0] : '',
    meeting_type: minute?.meeting_type || 'executive_board',
    status: minute?.status || 'draft',
    attendees: minute?.attendees?.join(', ') || '',
    agenda_items: minute?.agenda_items?.join('\n') || '',
    discussion_points: minute?.discussion_points || '',
    action_items: minute?.action_items?.join('\n') || '',
    next_meeting_date: minute?.next_meeting_date ? new Date(minute.next_meeting_date).toISOString().split('T')[0] : ''
  });

  // Auto-save functionality
  useEffect(() => {
    if (!minute) return; // Don't auto-save for new documents
    
    const autoSaveTimer = setTimeout(() => {
      handleSave(true); // Silent save
    }, 30000); // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [formData, minute]);

  const handleSave = async (silent = false) => {
    try {
      setIsSaving(true);
      
      const payload = {
        title: formData.title,
        meeting_date: new Date(formData.meeting_date).toISOString(),
        meeting_type: formData.meeting_type,
        status: formData.status as MeetingStatus,
        attendees: formData.attendees.split(',').map(a => a.trim()).filter(Boolean),
        agenda_items: formData.agenda_items.split('\n').filter(Boolean),
        discussion_points: formData.discussion_points,
        action_items: formData.action_items.split('\n').filter(Boolean),
        next_meeting_date: formData.next_meeting_date ? new Date(formData.next_meeting_date).toISOString() : null
      };

      if (minute?.id) {
        const { error } = await supabase
          .from('gw_meeting_minutes')
          .update(payload)
          .eq('id', minute.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_meeting_minutes')
          .insert([{ ...payload, created_by: (await supabase.auth.getUser()).data.user?.id }]);
        
        if (error) throw error;
      }

      setLastSaved(new Date());
      
      if (!silent) {
        toast({
          title: "Document Saved",
          description: "Meeting minutes have been saved successfully."
        });
        onSave();
      }
    } catch (error) {
      console.error('Error saving meeting minutes:', error);
      if (!silent) {
        toast({
          title: "Save Failed",
          description: "Failed to save meeting minutes. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const createGoogleDoc = async () => {
    try {
      if (!minute?.id) {
        toast({
          title: "Save First",
          description: "Please save the document before creating a Google Doc.",
          variant: "destructive"
        });
        return;
      }

      const content = `Meeting Minutes: ${formData.title}
      
Date: ${formData.meeting_date}
Type: ${formData.meeting_type}
Attendees: ${formData.attendees}

AGENDA ITEMS:
${formData.agenda_items}

DISCUSSION POINTS:
${formData.discussion_points}

ACTION ITEMS:
${formData.action_items}

Next Meeting: ${formData.next_meeting_date || 'TBD'}`;

      const { data, error } = await supabase.functions.invoke('google-docs-manager', {
        body: {
          action: 'create',
          minuteId: minute.id,
          title: formData.title,
          content: content
        }
      });

      if (error) throw error;

      if (data?.needsAuth) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google first.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Google Doc Created",
        description: "Meeting minutes have been synced to Google Docs."
      });
    } catch (error) {
      console.error('Error creating Google Doc:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to create Google Doc. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openGoogleDoc = () => {
    if (minute?.google_doc_url) {
      window.open(minute.google_doc_url, '_blank');
    }
  };

  const syncFromGoogleDoc = async () => {
    if (!minute?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke('google-docs-manager', {
        body: {
          action: 'sync',
          minuteId: minute.id
        }
      });

      if (error) throw error;

      if (data?.needsAuth) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google first.",
          variant: "destructive"
        });
        return;
      }

      // Refresh the data
      onSave();
      
      toast({
        title: "Synced from Google Docs",
        description: "Meeting minutes have been updated from Google Docs."
      });
    } catch (error) {
      console.error('Error syncing from Google Doc:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync from Google Docs. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Editor Header */}
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">Meeting Minutes Editor</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            
            {minute?.google_doc_url ? (
              <>
                <Button variant="outline" size="sm" onClick={openGoogleDoc}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google Docs
                </Button>
                <Button variant="outline" size="sm" onClick={syncFromGoogleDoc}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync from Google Docs
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={createGoogleDoc}>
                <FileText className="h-4 w-4 mr-2" />
                Create Google Doc
              </Button>
            )}
            
            <Button onClick={() => handleSave()} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      {/* Document Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white shadow-lg border rounded-lg min-h-[800px]">
            {/* Document Header */}
            <div className="border-b p-6 space-y-4">
              <div className="space-y-2">
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Meeting Title"
                  className="text-xl font-bold border-none shadow-none p-0 focus-visible:ring-0"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Date
                  </div>
                  <Input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, meeting_date: e.target.value }))}
                    className="h-8"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Type
                  </div>
                  <Select value={formData.meeting_type} onValueChange={(value) => setFormData(prev => ({ ...prev, meeting_type: value }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive_board">Executive Board</SelectItem>
                      <SelectItem value="general_meeting">General Meeting</SelectItem>
                      <SelectItem value="committee">Committee Meeting</SelectItem>
                      <SelectItem value="emergency">Emergency Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge className="h-4 w-4" />
                    Status
                  </div>
                  <Select value={formData.status} onValueChange={(value: MeetingStatus) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Next Meeting
                  </div>
                  <Input
                    type="date"
                    value={formData.next_meeting_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, next_meeting_date: e.target.value }))}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            {/* Document Content */}
            <div className="p-6 space-y-6">
              {/* Attendees Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <Users className="h-5 w-5" />
                  Attendees
                </div>
                <Input
                  value={formData.attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                  placeholder="List attendees separated by commas..."
                  className="border-l-4 border-l-blue-500"
                />
              </div>

              {/* Agenda Items Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <ClipboardList className="h-5 w-5" />
                  Agenda Items
                </div>
                <Textarea
                  value={formData.agenda_items}
                  onChange={(e) => setFormData(prev => ({ ...prev, agenda_items: e.target.value }))}
                  placeholder="List agenda items (one per line)..."
                  rows={6}
                  className="border-l-4 border-l-green-500 font-mono"
                />
              </div>

              {/* Discussion Points Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <MessageSquare className="h-5 w-5" />
                  Discussion Points
                </div>
                <Textarea
                  value={formData.discussion_points}
                  onChange={(e) => setFormData(prev => ({ ...prev, discussion_points: e.target.value }))}
                  placeholder="Document key discussion points, decisions made, and important conversations..."
                  rows={10}
                  className="border-l-4 border-l-orange-500 leading-relaxed"
                />
              </div>

              {/* Action Items Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckSquare className="h-5 w-5" />
                  Action Items
                </div>
                <Textarea
                  value={formData.action_items}
                  onChange={(e) => setFormData(prev => ({ ...prev, action_items: e.target.value }))}
                  placeholder="List action items with responsible parties (one per line)..."
                  rows={6}
                  className="border-l-4 border-l-red-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
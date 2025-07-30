import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  FileText, 
  Calendar, 
  User, 
  Clock,
  Edit3,
  Trash2,
  Eye
} from "lucide-react";
import { MeetingMinutesEditor } from "./MeetingMinutesEditor";
import { MeetingMinutesDocument } from "./MeetingMinutesDocument";

type MeetingStatus = 'draft' | 'approved' | 'archived';
type ViewMode = 'list' | 'editor' | 'document';

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
}

export const MeetingMinutes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMinute, setSelectedMinute] = useState<MeetingMinute | null>(null);

  useEffect(() => {
    if (user) {
      fetchMeetingMinutes();
    }
  }, [user]);

  const fetchMeetingMinutes = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_meeting_minutes')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      setMinutes((data as MeetingMinute[]) || []);
    } catch (error) {
      console.error('Error fetching meeting minutes:', error);
      toast({
        title: "Error",
        description: "Failed to load meeting minutes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meeting minute?')) return;

    try {
      const { error } = await supabase
        .from('gw_meeting_minutes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMinutes(prev => prev.filter(m => m.id !== id));
      toast({
        title: "Success",
        description: "Meeting minutes deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting meeting minutes:', error);
      toast({
        title: "Error",
        description: "Failed to delete meeting minutes",
        variant: "destructive"
      });
    }
  };

  const handleView = (minute: MeetingMinute) => {
    setSelectedMinute(minute);
    setViewMode('document');
  };

  const handleEdit = (minute: MeetingMinute) => {
    setSelectedMinute(minute);
    setViewMode('editor');
  };

  const handleCreateNew = () => {
    setSelectedMinute(null);
    setViewMode('editor');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedMinute(null);
    fetchMeetingMinutes(); // Refresh the list
  };

  const getStatusColor = (status: MeetingStatus) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'approved': return 'default';
      case 'archived': return 'outline';
      default: return 'secondary';
    }
  };

  // Show Editor View
  if (viewMode === 'editor') {
    return (
      <MeetingMinutesEditor
        minute={selectedMinute || undefined}
        onBack={handleBackToList}
        onSave={handleBackToList}
      />
    );
  }

  // Show Document View
  if (viewMode === 'document' && selectedMinute) {
    return (
      <MeetingMinutesDocument
        minute={selectedMinute}
        onBack={handleBackToList}
        onEdit={() => setViewMode('editor')}
      />
    );
  }

  // Show List View (Default)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meeting minutes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">Meeting Minutes</h1>
          <p className="text-black bg-white px-4 py-2 rounded-md inline-block">
            Document and manage executive board meeting minutes
          </p>
        </div>
        <Button onClick={handleCreateNew} className="self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Meeting Minutes
        </Button>
      </div>

      {/* Meeting Minutes List */}
      <div className="grid gap-4">
        {minutes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-3">No Meeting Minutes</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start documenting your executive board meetings by creating your first meeting minutes.
                Use our word processor-like interface for a professional experience.
              </p>
              <Button onClick={handleCreateNew} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create First Minutes
              </Button>
            </CardContent>
          </Card>
        ) : (
          minutes.map((minute) => (
            <Card key={minute.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-3 mb-3">
                      <FileText className="h-6 w-6 text-primary" />
                      <span className="text-xl">{minute.title}</span>
                      <Badge variant={getStatusColor(minute.status)} className="ml-auto">
                        {minute.status}
                      </Badge>
                    </CardTitle>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(minute.meeting_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {minute.attendees.length} attendees
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {minute.meeting_type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Last updated: {new Date(minute.updated_at).toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleView(minute)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(minute)}
                      className="gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(minute.id)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
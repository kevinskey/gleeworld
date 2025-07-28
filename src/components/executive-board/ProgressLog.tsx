import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, FileText, DollarSign, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ProgressEntry {
  id: string;
  user_position: string;
  action_type: string;
  action_description: string;
  related_entity_type: string;
  created_at: string;
  metadata: any;
}

export const ProgressLog = () => {
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgressLog();
  }, []);

  const fetchProgressLog = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_executive_board_progress_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setProgressEntries(data || []);
    } catch (error) {
      console.error('Error fetching progress log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType: string, entityType: string) => {
    switch (entityType) {
      case 'event': return Calendar;
      case 'task': return FileText;
      case 'budget': return DollarSign;
      case 'announcement': return Megaphone;
      default: return Activity;
    }
  };

  const getPositionBadgeVariant = (position: string) => {
    const positionVariants: Record<string, any> = {
      president: "default",
      secretary: "secondary",
      treasurer: "outline",
      tour_manager: "outline",
      wardrobe_manager: "outline",
      librarian: "outline",
      historian: "outline",
      pr_coordinator: "outline",
      chaplain: "outline",
      data_analyst: "outline"
    };
    return positionVariants[position] || "outline";
  };

  const formatPosition = (position: string) => {
    return position.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Progress Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-muted-foreground">Loading activity...</div>
        ) : progressEntries.length > 0 ? (
          progressEntries.map((entry) => {
            const Icon = getActionIcon(entry.action_type, entry.related_entity_type);
            return (
              <div key={entry.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getPositionBadgeVariant(entry.user_position)} className="text-xs">
                      {formatPosition(entry.user_position)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm">{entry.action_description}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-muted-foreground text-center py-4">
            No activity yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};
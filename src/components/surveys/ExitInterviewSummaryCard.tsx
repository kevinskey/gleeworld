import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ClipboardList, ChevronDown, ChevronUp, Star, Calendar, 
  CheckCircle2, XCircle, Briefcase, Plane, Music, GraduationCap,
  MessageSquare, Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExitInterview {
  id: string;
  user_id: string;
  semester: string;
  intent_to_continue: boolean;
  intent_to_continue_notes: string | null;
  interested_in_exec_board: boolean;
  exec_board_position_interest: string | null;
  exec_board_work_done: string | null;
  interested_in_fall_tour: boolean;
  interested_in_advanced_ensemble: boolean;
  advanced_ensemble_notes: string | null;
  interested_in_private_lessons: boolean;
  private_lessons_instrument: string | null;
  what_worked_well: string | null;
  what_could_improve: string | null;
  suggestions_for_next_semester: string | null;
  satisfaction_overall: number | null;
  satisfaction_rehearsals: number | null;
  satisfaction_performances: number | null;
  satisfaction_community: number | null;
  satisfaction_leadership: number | null;
  satisfaction_communication: number | null;
  current_gpa: number | null;
  additional_comments: string | null;
  created_at: string;
}

interface ExitInterviewSummaryCardProps {
  userId?: string; // If provided, shows for specific user (admin view in dossiers)
  showInSettings?: boolean; // If true, shows in collapsible format for settings
}

export const ExitInterviewSummaryCard: React.FC<ExitInterviewSummaryCardProps> = ({ 
  userId, 
  showInSettings = false 
}) => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<ExitInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<ExitInterview | null>(null);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchInterviews();
    }
  }, [targetUserId]);

  const fetchInterviews = async () => {
    if (!targetUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('member_exit_interviews')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInterviews(data || []);
      if (data && data.length > 0) {
        setSelectedInterview(data[0]);
      }
    } catch (error) {
      console.error('Error fetching exit interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground text-xs">N/A</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    );
  };

  const renderInterviewContent = (interview: ExitInterview) => (
    <div className="space-y-4">
      {/* Quick Stats Row */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={interview.intent_to_continue ? "default" : "destructive"}>
          {interview.intent_to_continue ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
          {interview.intent_to_continue ? "Returning" : "Not Returning"}
        </Badge>
        {interview.interested_in_exec_board && (
          <Badge variant="secondary">
            <Briefcase className="h-3 w-3 mr-1" />
            Exec Interest
          </Badge>
        )}
        {interview.interested_in_fall_tour && (
          <Badge variant="secondary">
            <Plane className="h-3 w-3 mr-1" />
            Tour Interest
          </Badge>
        )}
        {interview.interested_in_advanced_ensemble && (
          <Badge variant="secondary">
            <Music className="h-3 w-3 mr-1" />
            Ensemble Interest
          </Badge>
        )}
        {interview.current_gpa && (
          <Badge variant="outline">
            <GraduationCap className="h-3 w-3 mr-1" />
            GPA: {interview.current_gpa}
          </Badge>
        )}
      </div>

      {/* Exec Board Interest Details */}
      {interview.interested_in_exec_board && (
        <div className="bg-primary/5 rounded-lg p-3 space-y-2">
          <p className="font-medium text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Executive Board Interest
          </p>
          {interview.exec_board_position_interest && (
            <p className="text-sm"><span className="text-muted-foreground">Positions:</span> {interview.exec_board_position_interest}</p>
          )}
          {interview.exec_board_work_done && (
            <p className="text-sm"><span className="text-muted-foreground">Previous Work:</span> {interview.exec_board_work_done}</p>
          )}
        </div>
      )}

      {/* Satisfaction Ratings Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="flex items-center justify-between bg-accent/30 rounded p-2">
          <span className="text-xs">Overall</span>
          {renderStars(interview.satisfaction_overall)}
        </div>
        <div className="flex items-center justify-between bg-accent/30 rounded p-2">
          <span className="text-xs">Rehearsals</span>
          {renderStars(interview.satisfaction_rehearsals)}
        </div>
        <div className="flex items-center justify-between bg-accent/30 rounded p-2">
          <span className="text-xs">Performances</span>
          {renderStars(interview.satisfaction_performances)}
        </div>
        <div className="flex items-center justify-between bg-accent/30 rounded p-2">
          <span className="text-xs">Community</span>
          {renderStars(interview.satisfaction_community)}
        </div>
        <div className="flex items-center justify-between bg-accent/30 rounded p-2">
          <span className="text-xs">Leadership</span>
          {renderStars(interview.satisfaction_leadership)}
        </div>
        <div className="flex items-center justify-between bg-accent/30 rounded p-2">
          <span className="text-xs">Communication</span>
          {renderStars(interview.satisfaction_communication)}
        </div>
      </div>

      {/* Notes Section */}
      {interview.intent_to_continue_notes && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Intent Notes</p>
          <p className="text-sm bg-accent/20 rounded p-2">{interview.intent_to_continue_notes}</p>
        </div>
      )}

      {/* Feedback Summary */}
      {(interview.what_worked_well || interview.what_could_improve || interview.suggestions_for_next_semester) && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Feedback Summary
          </p>
          {interview.what_worked_well && (
            <div className="text-sm">
              <span className="font-medium text-green-600 dark:text-green-400">+</span>{' '}
              <span className="text-muted-foreground">{interview.what_worked_well}</span>
            </div>
          )}
          {interview.what_could_improve && (
            <div className="text-sm">
              <span className="font-medium text-amber-600 dark:text-amber-400">△</span>{' '}
              <span className="text-muted-foreground">{interview.what_could_improve}</span>
            </div>
          )}
          {interview.suggestions_for_next_semester && (
            <div className="text-sm">
              <span className="font-medium text-blue-600 dark:text-blue-400">→</span>{' '}
              <span className="text-muted-foreground">{interview.suggestions_for_next_semester}</span>
            </div>
          )}
        </div>
      )}

      {interview.additional_comments && (
        <div className="text-sm border-t pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Additional Comments</p>
          <p className="text-muted-foreground italic">"{interview.additional_comments}"</p>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (interviews.length === 0) {
    return null;
  }

  // Settings view - collapsible format
  if (showInSettings) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-card/80 backdrop-blur-sm border-2 border-border overflow-hidden">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      My Exit Interview History
                      <Badge variant="secondary" className="text-xs">
                        {interviews.length} submission{interviews.length !== 1 ? 's' : ''}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      View your past exit interview responses
                    </p>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Semester Selector */}
              {interviews.length > 1 && (
                <div className="flex gap-2 mb-4 flex-wrap">
                  {interviews.map((interview) => (
                    <Button
                      key={interview.id}
                      variant={selectedInterview?.id === interview.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedInterview(interview)}
                    >
                      {interview.semester}
                    </Button>
                  ))}
                </div>
              )}
              
              {selectedInterview && (
                <>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Calendar className="h-3 w-3" />
                    Submitted {format(new Date(selectedInterview.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </div>
                  {renderInterviewContent(selectedInterview)}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  // Default view - full card (for admin dossier view)
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Exit Interview Summary
          </span>
          {interviews.length > 1 && (
            <Badge variant="outline" className="text-xs">
              {interviews.length} submissions
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Semester Selector */}
        {interviews.length > 1 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {interviews.map((interview) => (
              <Button
                key={interview.id}
                variant={selectedInterview?.id === interview.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedInterview(interview)}
              >
                {interview.semester}
              </Button>
            ))}
          </div>
        )}
        
        {selectedInterview && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Calendar className="h-3 w-3" />
              Submitted {format(new Date(selectedInterview.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </div>
            {renderInterviewContent(selectedInterview)}
          </>
        )}
      </CardContent>
    </Card>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, ChevronDown, ChevronUp, CheckCircle2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const getCurrentSemester = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month >= 7) {
    return `Fall ${year}`;
  } else {
    return `Spring ${year}`;
  }
};

export const CollapsibleExecBoardExitInterview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isExecBoard, setIsExecBoard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserAndSubmission = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is exec board
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('is_exec_board, is_admin, is_super_admin')
          .eq('user_id', user.id)
          .maybeSingle();

        const isExec = profile?.is_exec_board || profile?.is_admin || profile?.is_super_admin;
        setIsExecBoard(!!isExec);

        if (isExec) {
          // Check for existing submission
          const { data } = await supabase
            .from('exec_board_interviews')
            .select('id')
            .eq('user_id', user.id)
            .eq('semester', getCurrentSemester())
            .maybeSingle();

          setHasSubmitted(!!data);
        }
      } catch (error) {
        console.error('Error checking exec board status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserAndSubmission();
  }, [user]);

  // Only show for exec board members
  if (!user || loading || !isExecBoard) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/80 backdrop-blur-sm border-2 border-amber-500/30 overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-6 w-6 text-amber-600" />
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Exec Board Exit Interview - {getCurrentSemester()}
                    {hasSubmitted && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    End-of-semester leadership interview
                  </CardDescription>
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
          <div className="px-6 pb-6">
            <p className="text-muted-foreground mb-4">
              Share your progress, experiences, and recommendations as an executive board member.
            </p>
            <Button 
              onClick={() => navigate('/exec-board-exit-interview')}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              {hasSubmitted ? 'View/Edit Response' : 'Complete Interview'}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

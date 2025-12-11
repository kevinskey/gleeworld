import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, ChevronDown, ChevronUp, CheckCircle2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const CollapsibleMemberExitInterview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSubmission = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('member_exit_interviews')
          .select('id, is_draft')
          .eq('user_id', user.id)
          .eq('semester', 'Fall 2025')
          .maybeSingle();

        setHasSubmitted(data && data.is_draft === false);
      } catch (error) {
        console.error('Error checking submission:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSubmission();
  }, [user]);

  if (!user || loading) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-card/80 backdrop-blur-sm border-2 border-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Music className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Member Exit Interview - Fall 2025
                    {hasSubmitted && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    End-of-semester feedback for Glee Club members
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
              Share your feedback about performances, activities, and your experience this semester.
            </p>
            <Button 
              onClick={() => navigate('/member-exit-interview')}
              className="gap-2"
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

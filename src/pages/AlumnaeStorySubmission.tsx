import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { AddStoryDialog } from "@/components/alumnae/AddStoryDialog";
import { BookOpenIcon, PlusIcon, CheckCircleIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface UserStory {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  graduation_year?: number;
  is_approved: boolean;
  created_at: string;
}

export default function AlumnaeStorySubmission() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAddStoryDialogOpen, setIsAddStoryDialogOpen] = useState(false);
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerifiedAlumna, setIsVerifiedAlumna] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAlumnaStatusAndFetchStories();
  }, [user, navigate]);

  const checkAlumnaStatusAndFetchStories = async () => {
    if (!user) return;

    try {
      // Check if user is verified alumna
      const { data: profileData } = await supabase
        .from('gw_profiles')
        .select('role, verified')
        .eq('user_id', user.id)
        .single();

      const verified = profileData?.role === 'alumna' && profileData?.verified === true;
      setIsVerifiedAlumna(verified);

      if (verified) {
        // Fetch user's stories
        const { data: storiesData } = await supabase
          .from('alumnae_stories')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setUserStories(storiesData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error loading your stories');
    } finally {
      setLoading(false);
    }
  };

  const handleStoryAdded = () => {
    checkAlumnaStatusAndFetchStories();
    toast.success('Your story has been submitted for review!');
  };

  if (loading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </UniversalLayout>
    );
  }

  if (!isVerifiedAlumna) {
    return (
      <UniversalLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <BookOpenIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-4">Access Restricted</h2>
              <p className="text-muted-foreground mb-6">
                Story submission is exclusively for verified Spelman College Glee Club alumnae.
                Please contact an administrator to verify your alumni status.
              </p>
              <Button onClick={() => navigate('/alumnae')}>
                Return to Alumnae Landing
              </Button>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  return (
    <UniversalLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-primary">
            Share Your Glee Club Story
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your experiences and memories help preserve the rich history of the Spelman College Glee Club 
            for future generations. Every story matters and contributes to our collective legacy.
          </p>
        </div>

        {/* Story Submission Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <BookOpenIcon className="h-6 w-6" />
              Submit Your Story
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Share your memories, experiences, and moments that made your time in the 
                Spelman College Glee Club special. Your story will be reviewed by our team 
                before being shared with the community.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Story Guidelines:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 text-left">
                  <li>• Share authentic experiences from your time in Glee Club</li>
                  <li>• Include specific memories, performances, or relationships</li>
                  <li>• Add photos if you have them to enhance your story</li>
                  <li>• Stories are reviewed before publication</li>
                  <li>• Keep content appropriate and respectful</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={() => setIsAddStoryDialogOpen(true)}
              size="lg"
              className="w-full max-w-xs"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Share Your Story
            </Button>
          </CardContent>
        </Card>

        {/* User's Stories */}
        {userStories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Submitted Stories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {userStories.map((story) => (
                  <div
                    key={story.id}
                    className="border rounded-lg p-6 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">{story.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Submitted {format(new Date(story.created_at), 'MMM dd, yyyy')}
                          </span>
                          {story.graduation_year && (
                            <span>Class of {story.graduation_year}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {story.is_approved ? (
                          <>
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium text-green-600">
                              Published
                            </span>
                          </>
                        ) : (
                          <>
                            <ClockIcon className="h-5 w-5 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-600">
                              Under Review
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4">
                      {story.image_url && (
                        <img
                          src={story.image_url}
                          alt={story.title}
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-muted-foreground line-clamp-4">
                          {story.content}
                        </p>
                      </div>
                    </div>

                    {!story.is_approved && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          <strong>Under Review:</strong> Your story is being reviewed by our team. 
                          You'll be notified once it's approved and published.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {userStories.length === 0 && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
              <BookOpenIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Stories Yet</h3>
              <p className="text-muted-foreground mb-6">
                You haven't submitted any stories yet. Start sharing your Glee Club memories!
              </p>
              <Button
                onClick={() => setIsAddStoryDialogOpen(true)}
                variant="outline"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Submit Your First Story
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Story Dialog */}
        <AddStoryDialog
          open={isAddStoryDialogOpen}
          onOpenChange={setIsAddStoryDialogOpen}
          onStoryAdded={handleStoryAdded}
        />
      </div>
    </UniversalLayout>
  );
}
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Image, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CourseCreatePostProps {
  courseId: string;
  userProfile: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  onPostCreated: () => void;
}

export function CourseCreatePost({ courseId, userProfile, onPostCreated }: CourseCreatePostProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('gw_course_lounge_posts')
        .insert({
          course_id: courseId,
          author_id: user.id,
          content: content.trim(),
          media_urls: [],
        });

      if (error) throw error;

      setContent('');
      toast.success('Posted!');
      onPostCreated();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userProfile?.avatar_url || undefined} />
            <AvatarFallback>{userProfile?.full_name?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Share something with your classmates..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" disabled>
                <Image className="h-4 w-4 mr-2" />
                Photo
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Post
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

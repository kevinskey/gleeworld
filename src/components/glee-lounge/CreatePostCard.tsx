import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { ImagePlus, MapPin, Send, Loader2, X } from 'lucide-react';

interface CreatePostCardProps {
  userProfile: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  onPostCreated?: () => void;
}

export function CreatePostCard({ userProfile, onPostCreated }: CreatePostCardProps) {
  const [content, setContent] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: 'Please write something',
        description: 'Your post cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('gw_social_posts').insert({
        user_id: user.id,
        content: content.trim(),
        location_tag: locationTag.trim() || null,
        media_urls: mediaUrls,
      });

      if (error) throw error;

      setContent('');
      setLocationTag('');
      setShowLocation(false);
      setMediaUrls([]);
      
      toast({
        title: 'Posted!',
        description: 'Your post is now live in the lounge',
      });
      
      onPostCreated?.();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Failed to post',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('gw-media')
          .upload(`social-posts/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
          });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('gw-media')
          .getPublicUrl(`social-posts/${fileName}`);
        
        uploadedUrls.push(urlData.publicUrl);
      }
      
      setMediaUrls(prev => [...prev, ...uploadedUrls]);
      toast({
        title: 'Media uploaded',
        description: `${files.length} file(s) added`,
      });
    } catch (error) {
      console.error('Error uploading media:', error);
      toast({
        title: 'Upload failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={getAvatarUrl(userProfile?.avatar_url) || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(userProfile?.full_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="What's on your mind? Share updates from your holiday spot..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[80px] resize-none border-0 bg-muted/50 focus-visible:ring-1"
            />
            
            {showLocation && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Add location (e.g., Miami Beach 🌴)"
                  value={locationTag}
                  onChange={(e) => setLocationTag(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setShowLocation(false);
                    setLocationTag('');
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {mediaUrls.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {mediaUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt="Upload"
                      className="h-16 w-16 object-cover rounded-md"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5"
                      onClick={() => setMediaUrls(prev => prev.filter((_, i) => i !== index))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  disabled={isUploading}
                  asChild
                >
                  <label>
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Photo'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      className="hidden"
                      onChange={handleMediaUpload}
                      disabled={isUploading}
                    />
                  </label>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowLocation(!showLocation)}
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Location</span>
                </Button>
              </div>
              
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !content.trim()}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
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

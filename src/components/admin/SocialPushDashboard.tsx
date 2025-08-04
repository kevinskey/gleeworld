import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, ImageIcon, LinkIcon, Sparkles, Send, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface PlatformContent {
  caption: string;
  hashtags: string[];
  notes?: string;
}

interface GeneratedContent {
  facebook: PlatformContent;
  instagram: PlatformContent;
  twitter: PlatformContent;
  linkedin: PlatformContent;
}

export const SocialPushDashboard = () => {
  const { toast } = useToast();
  const [rawContent, setRawContent] = useState('');
  const [tone, setTone] = useState('professional');
  const [platforms, setPlatforms] = useState({
    facebook: false,
    instagram: false,
    twitter: false,
    linkedin: false
  });
  const [eventUrl, setEventUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    fetchSocialPosts();
  }, []);

  const fetchSocialPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_social_media_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSocialPosts(data || []);
    } catch (error) {
      console.error('Error fetching social posts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch social posts",
        variant: "destructive",
      });
    }
  };

  const generateContent = async () => {
    if (!rawContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter content to generate posts",
        variant: "destructive",
      });
      return;
    }

    const selectedPlatformsList = Object.entries(platforms)
      .filter(([_, selected]) => selected)
      .map(([platform, _]) => platform);

    if (selectedPlatformsList.length === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one platform",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-social-media-content', {
        body: {
          rawContent,
          tone,
          platforms: selectedPlatformsList,
          eventType: 'general'
        }
      });

      if (error) throw error;
      
      setGeneratedContent(data);
      setSelectedPlatforms(selectedPlatformsList);
      toast({
        title: "Success",
        description: "Social media content generated successfully!",
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const savePost = async (action: 'draft' | 'schedule' | 'post') => {
    if (!generatedContent) return;

    const scheduledDateTime = scheduledDate && scheduledTime ? 
      new Date(`${format(scheduledDate, 'yyyy-MM-dd')}T${scheduledTime}:00`) : null;

    setIsPosting(true);
    try {
      const { data, error } = await supabase
        .from('gw_social_media_posts')
        .insert({
          raw_content: rawContent,
          caption_facebook: generatedContent.facebook?.caption,
          caption_instagram: generatedContent.instagram?.caption,
          caption_twitter: generatedContent.twitter?.caption,
          caption_linkedin: generatedContent.linkedin?.caption,
          tone,
          image_urls: imageUrls,
          event_url: eventUrl || null,
          scheduled_time: action === 'schedule' ? scheduledDateTime?.toISOString() : null,
          status: action === 'post' ? (requiresApproval ? 'approved' : 'posted') : 
                  action === 'schedule' ? 'scheduled' : 'draft',
          platform_flags: platforms,
          hashtags: selectedPlatforms.reduce((acc: string[], platform) => {
            const content = generatedContent[platform as keyof GeneratedContent];
            if (content?.hashtags) {
              acc.push(...content.hashtags);
            }
            return acc;
          }, [])
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Post ${action === 'draft' ? 'saved as draft' : action === 'schedule' ? 'scheduled' : 'posted'} successfully!`,
      });

      // Reset form
      setRawContent('');
      setGeneratedContent(null);
      setImageUrls([]);
      setEventUrl('');
      setScheduledDate(undefined);
      setPlatforms({ facebook: false, instagram: false, twitter: false, linkedin: false });
      
      fetchSocialPosts();
    } catch (error) {
      console.error(`Error ${action}ing post:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} post. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      approved: 'default',
      scheduled: 'outline',
      posted: 'default',
      failed: 'destructive'
    } as const;

    const icons = {
      draft: <AlertCircle className="w-3 h-3" />,
      approved: <CheckCircle className="w-3 h-3" />,
      scheduled: <Clock className="w-3 h-3" />,
      posted: <CheckCircle className="w-3 h-3" />,
      failed: <AlertCircle className="w-3 h-3" />
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'} className="gap-1">
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Social Push Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Creation Panel */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Create Post
            </CardTitle>
            <CardDescription>
              Generate AI-optimized content for multiple social platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Raw Content Input */}
            <div className="space-y-2">
              <Label htmlFor="raw-content">Content Description</Label>
              <Textarea
                id="raw-content"
                placeholder="Describe your post content, paste event info, or write your message..."
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                rows={4}
                className="min-h-[100px]"
              />
            </div>

            {/* Tone Selector */}
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                  <SelectItem value="fun">Fun</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="gospel">Gospel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platform Toggles */}
            <div className="space-y-3">
              <Label>Platforms</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(platforms).map(([platform, enabled]) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Switch
                      id={platform}
                      checked={enabled}
                      onCheckedChange={(checked) => 
                        setPlatforms(prev => ({ ...prev, [platform]: checked }))
                      }
                    />
                    <Label htmlFor={platform} className="capitalize">
                      {platform === 'linkedin' ? 'LinkedIn' : platform}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="images">Images (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="images"
                  placeholder="Add image URLs..."
                  value={imageUrls.join(', ')}
                  onChange={(e) => setImageUrls(e.target.value.split(',').map(url => url.trim()).filter(Boolean))}
                />
                <Button variant="outline" size="icon">
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Event URL */}
            <div className="space-y-2">
              <Label htmlFor="event-url">Event/Ticket Link (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="event-url"
                  placeholder="https://..."
                  value={eventUrl}
                  onChange={(e) => setEventUrl(e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <LinkIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={generateContent} 
              disabled={isGenerating || !rawContent.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Preview & Schedule</CardTitle>
            <CardDescription>
              Review generated content and schedule your posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <div className="space-y-6">
                {/* Platform Previews */}
                <Tabs defaultValue={selectedPlatforms[0]} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    {selectedPlatforms.map(platform => (
                      <TabsTrigger 
                        key={platform}
                        value={platform}
                        className="capitalize text-xs"
                      >
                        {platform}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {selectedPlatforms.map(platform => {
                    const content = generatedContent[platform as keyof GeneratedContent];
                    return (
                      <TabsContent key={platform} value={platform} className="space-y-3">
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm mb-2">{content?.caption}</p>
                          <div className="flex flex-wrap gap-1">
                            {content?.hashtags?.map((hashtag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {hashtag}
                              </Badge>
                            ))}
                          </div>
                          {content?.notes && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {content.notes}
                            </p>
                          )}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                {/* Scheduling Options */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Schedule Date & Time (Optional)</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "justify-start text-left font-normal flex-1",
                              !scheduledDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={scheduledDate}
                            onSelect={setScheduledDate}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="approval"
                      checked={requiresApproval}
                      onCheckedChange={setRequiresApproval}
                    />
                    <Label htmlFor="approval">Require manual approval</Label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => savePost('draft')} 
                    variant="outline"
                    disabled={isPosting}
                    className="flex-1"
                  >
                    Save Draft
                  </Button>
                  <Button 
                    onClick={() => savePost('schedule')} 
                    variant="outline"
                    disabled={isPosting || !scheduledDate}
                    className="flex-1"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                  <Button 
                    onClick={() => savePost('post')} 
                    disabled={isPosting}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Post Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Generate content to see previews and scheduling options
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Post History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Posts</CardTitle>
          <CardDescription>
            View and manage your social media post history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {socialPosts.length > 0 ? (
              socialPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium truncate max-w-md">
                      {post.raw_content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(post.status)}
                      <Badge variant="outline" className="capitalize">
                        {post.tone}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.entries(post.platform_flags).map(([platform, enabled]) => 
                      enabled && (
                        <Badge key={platform} variant="secondary" className="text-xs">
                          {platform}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No posts yet. Create your first post above!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
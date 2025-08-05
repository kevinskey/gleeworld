import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  Youtube, 
  Calendar, 
  Send, 
  Clock, 
  Image, 
  Video,
  FileText,
  Zap,
  TrendingUp,
  Users,
  Hash
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  scheduledFor: string;
  status: 'draft' | 'scheduled' | 'published';
  engagement?: {
    likes: number;
    shares: number;
    comments: number;
  };
}

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube
};

const mockPosts: SocialPost[] = [
  {
    id: '1',
    platform: 'instagram',
    content: '🎼 Amazing rehearsal tonight! The harmonies are coming together beautifully for our upcoming spring concert. #SpelmanGlee #MusicMagic',
    scheduledFor: '2024-03-20T19:00:00',
    status: 'scheduled'
  },
  {
    id: '2',
    platform: 'facebook',
    content: 'Join us this Friday for an unforgettable evening of music and inspiration. Tickets available now!',
    scheduledFor: '2024-03-18T15:30:00',
    status: 'published',
    engagement: { likes: 124, shares: 18, comments: 32 }
  }
];

export const SocialMediaManager = () => {
  const [posts, setPosts] = useState<SocialPost[]>(mockPosts);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [postContent, setPostContent] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { toast } = useToast();

  const templates = {
    concert_announcement: '🎵 Mark your calendars! The Spelman College Glee Club presents [EVENT_NAME] on [DATE] at [VENUE]. Experience the magic of our voices coming together in perfect harmony. Tickets: [TICKET_LINK] #SpelmanGlee #Concert',
    rehearsal_behind_scenes: '✨ Behind the scenes at rehearsal! Watch our talented singers perfect their craft. The dedication and passion in this room is truly inspiring. #BehindTheScenes #SpelmanGlee #MusicLife',
    achievement_celebration: '🏆 Celebrating our incredible achievement! [ACHIEVEMENT_DETAILS]. We are so proud of our talented singers and the hard work that made this possible. #SpelmanGlee #Achievement #Proud',
    recruitment: '🎤 Do you love to sing? Join the Spelman College Glee Club family! Auditions are open for the [SEMESTER] semester. Info: [CONTACT_INFO] #JoinUs #SpelmanGlee #Auditions'
  };

  const platformHashtags = {
    instagram: ['#SpelmanGlee', '#SpelmanCollege', '#Music', '#Choir', '#Atlanta', '#HBCU'],
    facebook: ['#SpelmanGlee', '#SpelmanCollege', '#CommunityMusic'],
    twitter: ['#SpelmanGlee', '#Music', '#ATL', '#HBCU'],
    youtube: ['#SpelmanGlee', '#ChoirMusic', '#ClassicalMusic']
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    setPostContent(templates[templateKey]);
  };

  const handleSchedulePost = () => {
    if (!postContent.trim() || selectedPlatforms.length === 0) {
      toast({
        title: "Error",
        description: "Please select platforms and enter content",
        variant: "destructive"
      });
      return;
    }

    const newPosts = selectedPlatforms.map(platform => ({
      id: Math.random().toString(36).substr(2, 9),
      platform,
      content: postContent,
      scheduledFor: scheduledTime || new Date(Date.now() + 60000).toISOString(),
      status: 'scheduled' as const
    }));

    setPosts(prev => [...prev, ...newPosts]);
    setPostContent('');
    setSelectedPlatforms([]);
    setScheduledTime('');
    
    toast({
      title: "Success",
      description: `Post scheduled for ${selectedPlatforms.length} platform(s)`,
    });
  };

  const handlePublishNow = () => {
    if (!postContent.trim() || selectedPlatforms.length === 0) {
      toast({
        title: "Error",
        description: "Please select platforms and enter content",
        variant: "destructive"
      });
      return;
    }

    // Simulate immediate publishing
    toast({
      title: "Published!",
      description: `Post published to ${selectedPlatforms.length} platform(s)`,
    });

    setPostContent('');
    setSelectedPlatforms([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Social Media Manager</h2>
        <p className="text-muted-foreground">Create, schedule, and manage social media content across all platforms</p>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">Create Post</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Posts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Post Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Create New Post
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Platform Selection */}
                <div>
                  <Label className="text-base font-medium">Select Platforms</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(platformIcons).map(([platform, Icon]) => (
                      <Button
                        key={platform}
                        variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                        onClick={() => handlePlatformToggle(platform)}
                        className="flex items-center gap-2 justify-start"
                      >
                        <Icon className="h-4 w-4" />
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <Label htmlFor="content" className="text-base font-medium">Post Content</Label>
                  <Textarea
                    id="content"
                    placeholder="What's happening with the Glee Club?"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="min-h-[120px] mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{postContent.length} characters</span>
                    <span>Recommended: 100-150 chars</span>
                  </div>
                </div>

                {/* Schedule Time */}
                <div>
                  <Label htmlFor="schedule" className="text-base font-medium">Schedule (Optional)</Label>
                  <Input
                    id="schedule"
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="mt-2"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={handlePublishNow} className="flex-1">
                    <Zap className="h-4 w-4 mr-2" />
                    Publish Now
                  </Button>
                  <Button onClick={handleSchedulePost} variant="outline" className="flex-1">
                    <Clock className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Quick Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(templates).map(([key, template]) => (
                    <Button
                      key={key}
                      variant="outline"
                      onClick={() => handleTemplateSelect(key)}
                      className="w-full text-left justify-start h-auto p-3"
                    >
                      <div>
                        <div className="font-medium">
                          {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.substring(0, 80)}...
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled & Published Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {posts.map((post) => {
                  const Icon = platformIcons[post.platform];
                  return (
                    <div key={post.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          <span className="font-medium capitalize">{post.platform}</span>
                          <Badge variant="outline" className={`${getStatusColor(post.status)} text-white`}>
                            {post.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(post.scheduledFor)}
                        </span>
                      </div>
                      <p className="text-sm">{post.content}</p>
                      {post.engagement && (
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>❤️ {post.engagement.likes}</span>
                          <span>🔄 {post.engagement.shares}</span>
                          <span>💬 {post.engagement.comments}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Reach</p>
                    <p className="text-2xl font-bold">12.4K</p>
                    <Badge variant="outline" className="text-green-600">+8.2%</Badge>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                    <p className="text-2xl font-bold">4.8%</p>
                    <Badge variant="outline" className="text-blue-600">+0.3%</Badge>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Posts This Week</p>
                    <p className="text-2xl font-bold">8</p>
                    <Badge variant="outline">On target</Badge>
                  </div>
                  <Calendar className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Best Platform</p>
                    <p className="text-2xl font-bold">IG</p>
                    <Badge variant="outline">6.2% rate</Badge>
                  </div>
                  <Instagram className="h-8 w-8 text-pink-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Templates</CardTitle>
              <p className="text-muted-foreground">
                Pre-designed templates for common post types. Use placeholders like [EVENT_NAME], [DATE], [VENUE].
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(templates).map(([key, template]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </h4>
                      <Button size="sm" onClick={() => handleTemplateSelect(key)}>
                        Use Template
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{template}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
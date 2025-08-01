import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { 
  Camera, 
  Instagram, 
  Twitter, 
  Facebook,
  Youtube,
  Megaphone,
  Image,
  Calendar,
  MessageCircle,
  Share2,
  TrendingUp
} from "lucide-react";

const PRCoordinatorServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState("social-media");
  const [eventForm, setEventForm] = useState({
    eventName: "",
    date: "",
    description: "",
    hashtags: ""
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile || !['member', 'alumna', 'admin', 'super-admin'].includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Event promotion request:", eventForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">PR Coordinator Services</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Social media management, event promotion, and public relations
          </p>
          <Badge variant="secondary" className="text-sm">Member Access Only</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">15.2K</div>
              <div className="text-sm text-muted-foreground">Total Followers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Share2 className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">89</div>
              <div className="text-sm text-muted-foreground">Posts This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm text-muted-foreground">Upcoming Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Image className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">234</div>
              <div className="text-sm text-muted-foreground">Photos This Year</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="social-media">Social Media</TabsTrigger>
            <TabsTrigger value="event-promotion">Event Promotion</TabsTrigger>
            <TabsTrigger value="media-requests">Media Requests</TabsTrigger>
            <TabsTrigger value="contact-pr">Contact PR</TabsTrigger>
          </TabsList>

          <TabsContent value="social-media" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Social Media Platforms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { platform: "Instagram", handle: "@spelman_glee", followers: "8.5K", icon: Instagram, color: "text-pink-500" },
                    { platform: "Twitter", handle: "@SpelmanGlee", followers: "3.2K", icon: Twitter, color: "text-blue-500" },
                    { platform: "Facebook", handle: "Spelman College Glee Club", followers: "2.8K", icon: Facebook, color: "text-blue-600" },
                    { platform: "YouTube", handle: "Spelman Glee Club", followers: "695", icon: Youtube, color: "text-red-500" },
                  ].map((social, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <social.icon className={`h-5 w-5 ${social.color}`} />
                        <div>
                          <p className="font-medium">{social.platform}</p>
                          <p className="text-sm text-muted-foreground">{social.handle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{social.followers}</p>
                        <p className="text-xs text-muted-foreground">followers</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Recent Posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { content: "Beautiful rehearsal session preparing for our spring concert! 🎵", platform: "Instagram", engagement: "234 likes" },
                    { content: "Thank you to everyone who attended our holiday concert!", platform: "Facebook", engagement: "89 reactions" },
                    { content: "Behind the scenes: Getting ready for tonight's performance ✨", platform: "Instagram", engagement: "156 likes" },
                  ].map((post, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm mb-2">{post.content}</p>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{post.platform}</span>
                        <span>{post.engagement}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="event-promotion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Request Event Promotion
                </CardTitle>
                <CardDescription>
                  Submit events for social media promotion and marketing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEventSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventName">Event Name</Label>
                      <Input
                        id="eventName"
                        placeholder="Concert, rehearsal, etc."
                        value={eventForm.eventName}
                        onChange={(e) => setEventForm(prev => ({ ...prev, eventName: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Event Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={eventForm.date}
                        onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Event Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the event and key details..."
                      value={eventForm.description}
                      onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hashtags">Suggested Hashtags</Label>
                    <Input
                      id="hashtags"
                      placeholder="#SpelmanGlee #Concert #Atlanta"
                      value={eventForm.hashtags}
                      onChange={(e) => setEventForm(prev => ({ ...prev, hashtags: e.target.value }))}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Submit Promotion Request
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="media-requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Media & Photography Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col" variant="outline">
                    <Camera className="h-6 w-6 mb-2" />
                    Request Event Photography
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Image className="h-6 w-6 mb-2" />
                    Submit Photos/Videos
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Megaphone className="h-6 w-6 mb-2" />
                    Press Release Request
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Share2 className="h-6 w-6 mb-2" />
                    Social Media Content
                  </Button>
                </div>
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Photography Guidelines</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• High-resolution photos preferred (minimum 1080p)</li>
                    <li>• Submit photos within 24 hours of events</li>
                    <li>• Include brief captions and performer names when possible</li>
                    <li>• All photos must be appropriate for public sharing</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact-pr" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Contact PR Coordinator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Current PR Coordinator</h4>
                    <div className="space-y-2">
                      <p className="font-medium">Jasmine Williams</p>
                      <p className="text-sm text-muted-foreground">pr@spelman.edu</p>
                      <p className="text-sm text-muted-foreground">Office Hours: Wed/Fri 2-5 PM</p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm">Social Media</h5>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Instagram className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Twitter className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Facebook className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule PR Meeting
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Direct Message
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Camera className="h-4 w-4 mr-2" />
                        Request Photo Shoot
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Content Guidelines</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h5 className="font-medium mb-2">Photo Submissions</h5>
                      <p className="text-sm text-muted-foreground">
                        High-quality images showcasing Glee Club activities, performances, and behind-the-scenes moments.
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h5 className="font-medium mb-2">Event Promotion</h5>
                      <p className="text-sm text-muted-foreground">
                        Submit promotion requests at least 2 weeks in advance for maximum reach and engagement.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PRCoordinatorServices;
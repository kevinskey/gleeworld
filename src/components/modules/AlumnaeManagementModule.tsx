import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Video, Image, Star, Calendar, Layout, FormInput, Users, Eye, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsletterManager } from "@/components/alumnae/NewsletterManager";
import { InterviewManager } from "@/components/alumnae/InterviewManager";
import { HeroManager } from "@/components/alumnae/HeroManager";
import { SpotlightManager } from "@/components/alumnae/SpotlightManager";
import { AnnouncementManager } from "@/components/alumnae/AnnouncementManager";
import { AlumnaePageBuilder } from "@/components/alumnae/AlumnaePageBuilder";
import { AlumnaeFormBuilder } from "@/components/alumnae/AlumnaeFormBuilder";
import { AlumnaeUserManagement } from "@/components/alumnae/AlumnaeUserManagement";
import { MailchimpStyleCampaigns } from "@/components/alumnae/MailchimpStyleCampaigns";
import { ModuleProps } from "@/types/unified-modules";
export const AlumnaeManagementModule = ({
  user,
  isFullPage = false
}: ModuleProps) => {
  const [alumnaeCount, setAlumnaeCount] = useState(0);
  const [newsletterCount, setNewsletterCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [heroSlideCount, setHeroSlideCount] = useState(0);
  const [spotlightCount, setSpotlightCount] = useState(0);
  useEffect(() => {
    fetchStats();
  }, []);
  const fetchStats = async () => {
    try {
      // Fetch alumnae count
      const [{
        data: roleData
      }, {
        data: profileRoleData
      }] = await Promise.all([supabase.from('user_roles').select('user_id').eq('role', 'alumna'), supabase.from('gw_profiles').select('user_id').eq('role', 'alumna')]);
      const idsFromRoles = (roleData || []).map(r => r.user_id);
      const idsFromProfiles = (profileRoleData || []).map(r => r.user_id);
      const uniqueIds = new Set([...idsFromRoles, ...idsFromProfiles]);
      setAlumnaeCount(uniqueIds.size);

      // Fetch newsletter count
      const {
        count: newsletterCnt
      } = await supabase.from('alumnae_newsletter_announcements').select('*', {
        count: 'exact',
        head: true
      });
      setNewsletterCount(newsletterCnt || 0);

      // Fetch media library counts
      const {
        data: mediaItems
      } = await supabase.from('gw_media_library').select('id, tags');
      if (mediaItems) {
        const interviews = mediaItems.filter(item => item.tags && JSON.stringify(item.tags).toLowerCase().includes('interview'));
        const heroes = mediaItems.filter(item => item.tags && JSON.stringify(item.tags).toLowerCase().includes('hero'));
        const spotlights = mediaItems.filter(item => item.tags && JSON.stringify(item.tags).toLowerCase().includes('spotlight'));
        setInterviewCount(interviews.length);
        setHeroSlideCount(heroes.length);
        setSpotlightCount(spotlights.length);
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };
  return <div className={isFullPage ? "container mx-auto px-4 py-8 space-y-6" : "space-y-6"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {isFullPage ? <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary">Alumnae Page Management</h1>
            <p className="text-lg text-muted-foreground">
              Comprehensive CMS for building and managing the /alumnae page with drag-and-drop page builder, media uploads, forms, and user management
            </p>
          </div> : <div className="space-y-1">
            <h2 className="text-2xl font-bold text-primary">Alumnae Page Management</h2>
            
          </div>}
        <Button onClick={() => window.open('/alumnae', 'alumnaePreview', 'width=1400,height=900,resizable=yes,scrollbars=yes,status=yes,toolbar=yes,menubar=no,location=yes')} variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" />
          View Live Page
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alumnae</p>
                <p className="text-2xl font-bold">{alumnaeCount}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Newsletters</p>
                <p className="text-2xl font-bold">{newsletterCount}</p>
              </div>
              <BookOpen className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interviews</p>
                <p className="text-2xl font-bold">{interviewCount}</p>
              </div>
              <Video className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hero Slides</p>
                <p className="text-2xl font-bold">{heroSlideCount}</p>
              </div>
              <Image className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spotlights</p>
                <p className="text-2xl font-bold">{spotlightCount}</p>
              </div>
              <Star className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Content Management</CardTitle>
          <CardDescription>
            Create and manage all alumnae portal content from one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="page-builder" className="w-full">
            <div className="border-b -mx-6 px-6">
              <TabsList className="w-full h-auto p-0 bg-transparent justify-start gap-0 rounded-none overflow-x-auto">
                <TabsTrigger 
                  value="page-builder" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Layout className="h-4 w-4" />
                  <span className="hidden lg:inline">Page Builder</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="newsletters" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="hidden lg:inline">Newsletters</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="interviews" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Video className="h-4 w-4" />
                  <span className="hidden lg:inline">Interviews</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="hero" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Image className="h-4 w-4" />
                  <span className="hidden lg:inline">Hero</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="spotlights" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Star className="h-4 w-4" />
                  <span className="hidden lg:inline">Spotlights</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="announcements" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="hidden lg:inline">Announce</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="forms" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <FormInput className="h-4 w-4" />
                  <span className="hidden lg:inline">Forms</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="email" 
                  className="flex-shrink-0 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Mail className="h-4 w-4" />
                  <span className="hidden lg:inline">Email</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="newsletters" className="mt-6">
              <NewsletterManager />
            </TabsContent>

            <TabsContent value="interviews" className="mt-6">
              <InterviewManager />
            </TabsContent>

            <TabsContent value="hero" className="mt-6">
              <HeroManager />
            </TabsContent>

            <TabsContent value="spotlights" className="mt-6">
              <SpotlightManager />
            </TabsContent>

            <TabsContent value="announcements" className="mt-6">
              <AnnouncementManager />
            </TabsContent>

            <TabsContent value="page-builder" className="mt-6">
              <AlumnaePageBuilder />
            </TabsContent>

            <TabsContent value="forms" className="mt-6">
              <AlumnaeFormBuilder />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <AlumnaeUserManagement />
            </TabsContent>

            <TabsContent value="email" className="mt-6">
              <MailchimpStyleCampaigns />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};
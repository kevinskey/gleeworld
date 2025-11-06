import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Video, Image, Star, Calendar, TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewsletterManager } from "@/components/alumnae/NewsletterManager";
import { InterviewManager } from "@/components/alumnae/InterviewManager";
import { HeroManager } from "@/components/alumnae/HeroManager";
import { SpotlightManager } from "@/components/alumnae/SpotlightManager";
import { AnnouncementManager } from "@/components/alumnae/AnnouncementManager";
import { useExecutiveBoardAccess } from "@/hooks/useExecutiveBoardAccess";
import { Navigate, useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AlumnaePageBuilder } from "@/components/alumnae/AlumnaePageBuilder";
import { AlumnaeFormBuilder } from "@/components/alumnae/AlumnaeFormBuilder";
import { AlumnaeUserManagement } from "@/components/alumnae/AlumnaeUserManagement";
import { Layout, FormInput, Users, Eye } from "lucide-react";

export default function AlumnaeManagement() {
  const { canAccessAdminModules, loading } = useExecutiveBoardAccess();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!canAccessAdminModules) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          onClick={() => navigate('/admin/alumnae')}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
        <h1 className="text-4xl font-bold text-primary">Alumnae Page Management</h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive CMS for building and managing the /alumnae page with drag-and-drop page builder, media uploads, forms, and user management
        </p>
        <div className="pt-4">
          <Button onClick={() => window.open('/alumnae', '_blank')} variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview Live Page
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Newsletters</p>
                <p className="text-2xl font-bold">12</p>
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
                <p className="text-2xl font-bold">8</p>
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
                <p className="text-2xl font-bold">5</p>
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
                <p className="text-2xl font-bold">6</p>
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
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="page-builder" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                <span className="hidden sm:inline">Page Builder</span>
              </TabsTrigger>
              <TabsTrigger value="newsletters" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Newsletters</span>
              </TabsTrigger>
              <TabsTrigger value="interviews" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Interviews</span>
              </TabsTrigger>
              <TabsTrigger value="hero" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Hero</span>
              </TabsTrigger>
              <TabsTrigger value="spotlights" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Spotlights</span>
              </TabsTrigger>
              <TabsTrigger value="announcements" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Announce</span>
              </TabsTrigger>
              <TabsTrigger value="forms" className="flex items-center gap-2">
                <FormInput className="h-4 w-4" />
                <span className="hidden sm:inline">Forms</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            </TabsList>

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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

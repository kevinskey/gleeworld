import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, EyeOff, Star, Calendar, User, Trophy, Newspaper, Music } from "lucide-react";
import { useSpotlightContent } from "@/hooks/useSpotlightContent";
import { SpotlightContentForm } from "./SpotlightContentForm";
import { SpotlightContentList } from "./SpotlightContentList";
import { SpotlightAnalytics } from "./SpotlightAnalytics";

export const SpotlightManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const { spotlights, loading, error, refetch } = useSpotlightContent();

  const handleEdit = (content: any) => {
    setSelectedContent(content);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedContent(null);
    refetch();
  };

  const spotlightTypes = [
    { key: 'all', label: 'All Content', icon: Star, count: spotlights?.length || 0 },
    { key: 'member', label: 'Members', icon: User, count: spotlights?.filter(s => s.spotlight_type === 'member').length || 0 },
    { key: 'event', label: 'Events', icon: Calendar, count: spotlights?.filter(s => s.spotlight_type === 'event').length || 0 },
    { key: 'achievement', label: 'Achievements', icon: Trophy, count: spotlights?.filter(s => s.spotlight_type === 'achievement').length || 0 },
    { key: 'news', label: 'News', icon: Newspaper, count: spotlights?.filter(s => s.spotlight_type === 'news').length || 0 },
    { key: 'alumni', label: 'Alumni', icon: User, count: spotlights?.filter(s => s.spotlight_type === 'alumni').length || 0 },
    { key: 'performance', label: 'Performances', icon: Music, count: spotlights?.filter(s => s.spotlight_type === 'performance').length || 0 }
  ];

  const activeContent = spotlights?.filter(s => s.is_active).length || 0;
  const featuredContent = spotlights?.filter(s => s.is_featured).length || 0;

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedContent ? 'Edit Spotlight Content' : 'Create Spotlight Content'}
            </h1>
            <p className="text-gray-600">
              {selectedContent ? 'Update existing spotlight content' : 'Add new content to the Glee Club Spotlight'}
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
        </div>

        <SpotlightContentForm
          content={selectedContent}
          onSuccess={handleFormClose}
          onCancel={handleFormClose}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Glee Club Spotlight</h1>
          <p className="text-gray-600">Manage featured content, members, and achievements</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Content
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold text-gray-900">{spotlights?.length || 0}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Content</p>
                <p className="text-2xl font-bold text-green-600">{activeContent}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Featured</p>
                <p className="text-2xl font-bold text-yellow-600">{featuredContent}</p>
              </div>
              <div className="h-8 w-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">
                  {(spotlights?.length || 0) - activeContent}
                </p>
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <EyeOff className="h-4 w-4 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Type Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Content by Type</CardTitle>
          <CardDescription>Distribution of spotlight content across different categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {spotlightTypes.slice(1).map(type => {
              const IconComponent = type.icon;
              return (
                <div key={type.key} className="text-center p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex justify-center mb-2">
                    <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{type.count}</p>
                  <p className="text-xs text-gray-600">{type.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <SpotlightContentList
            spotlights={spotlights || []}
            loading={loading}
            onEdit={handleEdit}
            onRefresh={refetch}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <SpotlightAnalytics spotlights={spotlights || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
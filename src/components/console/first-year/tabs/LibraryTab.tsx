import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Download,
  FileText,
  Video,
  Music,
  Upload
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MediaLibraryItem {
  id: string;
  title: string;
  file_type: string;
  category: string;
  description?: string;
  uploaded_by?: string;
  created_at: string;
  file_size?: number;
  file_url: string;
  uploader_profile?: {
    full_name?: string;
    email?: string;
  };
}

export const LibraryTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [resources, setResources] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('gw_media_library')
          .select(`
            id,
            title,
            file_type,
            category,
            description,
            uploaded_by,
            created_at,
            file_size,
            file_url
          `)
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch uploader profiles separately
        const uploaderIds = [...new Set(data?.map(item => item.uploaded_by).filter(Boolean))];
        let profilesData: any[] = [];
        
        if (uploaderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name, email')
            .in('user_id', uploaderIds);
          profilesData = profiles || [];
        }

        // Combine data with profiles
        const resourcesWithProfiles = data?.map(item => ({
          ...item,
          uploader_profile: profilesData.find(profile => profile.user_id === item.uploaded_by) || null
        })) || [];

        setResources(resourcesWithProfiles);
      } catch (error) {
        console.error('Error fetching resources:', error);
        toast.error('Failed to load resources');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "application/pdf": 
      case "pdf": return <FileText className="h-4 w-4" />;
      case "video/mp4":
      case "video": return <Video className="h-4 w-4" />;
      case "audio/mpeg":
      case "audio": return <Music className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const fileType = type.toLowerCase();
    if (fileType.includes("pdf")) return "default";
    if (fileType.includes("video")) return "secondary";
    if (fileType.includes("audio")) return "outline";
    return "outline";
  };

  const getDisplayType = (type: string) => {
    const fileType = type.toLowerCase();
    if (fileType.includes("pdf")) return "PDF";
    if (fileType.includes("video")) return "Video";
    if (fileType.includes("audio")) return "Audio";
    if (fileType.includes("image")) return "Image";
    return "File";
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (resource.category && resource.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (resource.description && resource.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categories = [...new Set(resources.map(r => r.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resource Library</h2>
          <p className="text-muted-foreground">Manage learning resources, templates, and materials</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Resource
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Resources</p>
                <p className="text-xl font-bold">{loading ? "..." : resources.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl font-bold">{loading ? "..." : categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Videos</p>
                <p className="text-xl font-bold">{loading ? "..." : resources.filter(r => r.file_type.includes('video')).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Audio Files</p>
                <p className="text-xl font-bold">{loading ? "..." : resources.filter(r => r.file_type.includes('audio')).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Resources</TabsTrigger>
          {categories.map(category => (
            <TabsTrigger key={category} value={category.toLowerCase()}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Resources</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-muted rounded-lg" />
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-32" />
                          <div className="h-3 bg-muted rounded w-48" />
                          <div className="h-3 bg-muted rounded w-24" />
                        </div>
                      </div>
                      <div className="w-20 h-8 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : filteredResources.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Resources Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No resources match your search criteria.' : 'No resources have been uploaded yet.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredResources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getTypeIcon(resource.file_type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{resource.title}</h3>
                            <Badge variant={getTypeBadge(resource.file_type)}>
                              {getDisplayType(resource.file_type)}
                            </Badge>
                            {resource.category && (
                              <Badge variant="outline">
                                {resource.category}
                              </Badge>
                            )}
                          </div>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>By {resource.uploader_profile?.full_name || resource.uploader_profile?.email || 'Unknown'}</span>
                            <span>Uploaded {new Date(resource.created_at).toLocaleDateString()}</span>
                            <span>{formatFileSize(resource.file_size)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => window.open(resource.file_url, '_blank')}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {categories.map(category => (
          <TabsContent key={category} value={category.toLowerCase()}>
            <Card>
              <CardHeader>
                <CardTitle>{category} Resources</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-muted rounded-lg" />
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-32" />
                            <div className="h-3 bg-muted rounded w-48" />
                          </div>
                        </div>
                        <div className="w-20 h-8 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredResources
                      .filter(r => r.category === category)
                      .map((resource) => (
                        <div key={resource.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {getTypeIcon(resource.file_type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{resource.title}</h3>
                                <Badge variant={getTypeBadge(resource.file_type)}>
                                  {getDisplayType(resource.file_type)}
                                </Badge>
                              </div>
                              {resource.description && (
                                <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>By {resource.uploader_profile?.full_name || resource.uploader_profile?.email || 'Unknown'}</span>
                                <span>Uploaded {new Date(resource.created_at).toLocaleDateString()}</span>
                                <span>{formatFileSize(resource.file_size)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => window.open(resource.file_url, '_blank')}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
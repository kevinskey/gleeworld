import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ExternalLink, BookOpen, Globe, FileText, Users, 
  Eye, Settings, Video, Music, Database, Loader2,
  Search, ArrowUpDown, SortAsc, SortDesc
} from 'lucide-react';
import { useMus240Resources, type Mus240Resource } from '@/integrations/supabase/hooks/useMus240Resources';
import { ResourceViewer } from '@/components/academy/ResourceViewer';

interface Mus240ResourcesTabProps {
  isAdmin?: boolean;
}

type SortField = 'title' | 'category' | 'created_at' | 'display_order';
type SortOrder = 'asc' | 'desc';

export const Mus240ResourcesTab: React.FC<Mus240ResourcesTabProps> = ({ isAdmin = false }) => {
  const { data: resources, isLoading } = useMus240Resources();
  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    resource: Mus240Resource | null;
  }>({
    isOpen: false,
    resource: null,
  });
  
  // Search and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('display_order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const openViewer = (resource: Mus240Resource) => {
    setViewerState({ isOpen: true, resource });
  };

  const closeViewer = () => {
    setViewerState({ isOpen: false, resource: null });
  };

  const canPreview = (resource: Mus240Resource) => {
    const url = resource.url.toLowerCase();
    const isGoogleSlides = url.includes('docs.google.com/presentation') || url.includes('slides.google.com');
    const isYouTube = url.includes('youtu.be') || url.includes('youtube.com/watch');
    const isWebsite = resource.category === 'website' || url.startsWith('http');
    
    if (isGoogleSlides || isYouTube || isWebsite) {
      return true;
    }
    
    if (!resource.is_file_upload) return false;
    
    const fileName = resource.file_name?.toLowerCase() || '';
    const mimeType = resource.mime_type || '';
    
    return (
      mimeType === 'application/pdf' ||
      fileName.endsWith('.pdf') ||
      mimeType.includes('presentation') ||
      fileName.endsWith('.ppt') ||
      fileName.endsWith('.pptx')
    );
  };

  const getCategoryIcon = (category: Mus240Resource['category']) => {
    switch (category) {
      case 'reading': return BookOpen;
      case 'website': return Globe;
      case 'video': return Video;
      case 'article': return FileText;
      case 'database': return Database;
      case 'audio': return Music;
      default: return FileText;
    }
  };

  const getCategoryColor = (category: Mus240Resource['category']) => {
    switch (category) {
      case 'reading': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'website': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'video': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'article': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'database': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'audio': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    if (!resources) return [];
    const uniqueCategories = [...new Set(resources.map(r => r.category))];
    return uniqueCategories.sort();
  }, [resources]);

  // Filter and sort resources
  const filteredAndSortedResources = useMemo(() => {
    if (!resources) return [];
    
    let filtered = resources.filter(resource => {
      const matchesSearch = searchQuery === '' || 
        resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });

    // Sort resources
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        // Default to display_order
        comparison = (a.display_order || 0) - (b.display_order || 0);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [resources, searchQuery, categoryFilter, sortField, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Course Resources
          {resources && resources.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {filteredAndSortedResources.length} of {resources.length}
            </Badge>
          )}
        </CardTitle>
        {isAdmin && (
          <Link to="/classes/mus240/resources/admin">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </Link>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search and Sort Controls */}
        {resources && resources.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg border border-border">
            {/* Search Field */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Sort Field */}
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="display_order">Default Order</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="created_at">Date Added</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort Order Toggle */}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleSortOrder}
              className="shrink-0"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {!resources || resources.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Resources Yet</h3>
            <p className="text-muted-foreground">Resources will be added throughout the semester</p>
          </div>
        ) : filteredAndSortedResources.length === 0 ? (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Matching Resources</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedResources.map((resource) => {
              const IconComponent = getCategoryIcon(resource.category);
              
              return (
                <Card 
                  key={resource.id} 
                  className="group border hover:shadow-md hover:-translate-y-1 transition-all duration-200 bg-card"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-2 bg-muted rounded-md shrink-0">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Badge className={`text-xs ${getCategoryColor(resource.category)}`}>
                            {resource.category}
                          </Badge>
                          <CardTitle className="text-sm mt-1 truncate">
                            {resource.title}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {resource.description}
                    </p>
                    
                    <div className="flex gap-2">
                      {canPreview(resource) ? (
                        <Button
                          onClick={() => openViewer(resource)}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Preview
                        </Button>
                      ) : (
                        <Button 
                          asChild
                          size="sm" 
                          className="w-full"
                        >
                          <a href={resource.url}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Open
                          </a>
                        </Button>
                      )}
                    </div>
                    
                    {resource.is_file_upload && resource.file_size && (
                      <p className="text-xs text-muted-foreground text-center">
                        {(resource.file_size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      <ResourceViewer
        isOpen={viewerState.isOpen}
        onClose={closeViewer}
        resource={viewerState.resource ? {
          title: viewerState.resource.title,
          url: viewerState.resource.url,
          resource_type: viewerState.resource.category,
          description: viewerState.resource.description
        } : null}
      />
    </Card>
  );
};

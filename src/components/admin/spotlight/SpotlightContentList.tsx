import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  Edit, 
  MoreHorizontal, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  Calendar,
  User,
  Trophy,
  Newspaper,
  Music,
  ExternalLink,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { SpotlightContent, useSpotlightContent } from "@/hooks/useSpotlightContent";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SpotlightContentListProps {
  spotlights: SpotlightContent[];
  loading: boolean;
  onEdit: (content: SpotlightContent) => void;
  onRefresh: () => void;
}

export const SpotlightContentList = ({ spotlights, loading, onEdit, onRefresh }: SpotlightContentListProps) => {
  const { deleteSpotlight, toggleActiveStatus, toggleFeaturedStatus } = useSpotlightContent();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'member': return User;
      case 'event': return Calendar;
      case 'achievement': return Trophy;
      case 'news': return Newspaper;
      case 'alumni': return User;
      case 'performance': return Music;
      default: return Star;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'member': return 'bg-blue-100 text-blue-800';
      case 'event': return 'bg-green-100 text-green-800';
      case 'achievement': return 'bg-yellow-100 text-yellow-800';
      case 'news': return 'bg-purple-100 text-purple-800';
      case 'alumni': return 'bg-indigo-100 text-indigo-800';
      case 'performance': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSpotlight(id);
      onRefresh();
    } catch (err) {
      // Error handling done in hook
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await toggleActiveStatus(id, !currentStatus);
      onRefresh();
    } catch (err) {
      // Error handling done in hook
    }
  };

  const handleToggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      await toggleFeaturedStatus(id, !currentStatus);
      onRefresh();
    } catch (err) {
      // Error handling done in hook
    }
  };

  // Filter spotlights
  const filteredSpotlights = spotlights.filter(spotlight => {
    const matchesSearch = spotlight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         spotlight.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         spotlight.content?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || spotlight.spotlight_type === filterType;
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && spotlight.is_active) ||
                         (filterStatus === 'inactive' && !spotlight.is_active) ||
                         (filterStatus === 'featured' && spotlight.is_featured);

    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" text="Loading spotlight content..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Management</CardTitle>
          <CardDescription>View and manage all spotlight content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="member">Members</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="achievement">Achievements</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="alumni">Alumni</SelectItem>
                <SelectItem value="performance">Performances</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <div className="grid gap-4">
        {filteredSpotlights.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No spotlight content found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredSpotlights.map((spotlight) => {
            const TypeIcon = getTypeIcon(spotlight.spotlight_type);
            return (
              <Card key={spotlight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <TypeIcon className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{spotlight.title}</h3>
                            {spotlight.description && (
                              <p className="text-sm text-gray-600">{spotlight.description}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={getTypeColor(spotlight.spotlight_type)}>
                          {spotlight.spotlight_type}
                        </Badge>
                        {spotlight.is_active ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <Eye className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                        {spotlight.is_featured && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Published: {format(new Date(spotlight.publish_date), 'MMM d, yyyy')}</span>
                        <span>Order: {spotlight.display_order}</span>
                        {spotlight.featured_person && (
                          <span>Person: {spotlight.featured_person.full_name}</span>
                        )}
                        {spotlight.featured_event && (
                          <span>Event: {spotlight.featured_event.title}</span>
                        )}
                        {spotlight.external_link && (
                          <a 
                            href={spotlight.external_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Link
                          </a>
                        )}
                      </div>

                      {spotlight.content && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {spotlight.content}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {spotlight.image_url && (
                        <img
                          src={spotlight.image_url}
                          alt={spotlight.title}
                          className="h-16 w-16 object-cover rounded border"
                        />
                      )}

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={spotlight.is_active}
                            onCheckedChange={() => handleToggleActive(spotlight.id, spotlight.is_active)}
                          />
                          <span className="text-xs text-gray-500">Active</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={spotlight.is_featured}
                            onCheckedChange={() => handleToggleFeatured(spotlight.id, spotlight.is_featured)}
                          />
                          <span className="text-xs text-gray-500">Featured</span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(spotlight)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Spotlight Content</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{spotlight.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(spotlight.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
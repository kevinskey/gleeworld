import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Search, Filter, Eye, Edit, Share, Trash2, Download, FileText, Image, Video, FileImage, Calendar, User } from 'lucide-react';
import { usePressKits, PressKit } from '@/hooks/usePressKits';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { PressKitCreateDialog } from './PressKitCreateDialog';
import { PressKitDetails } from './PressKitDetails';
import { formatDistanceToNow } from 'date-fns';

export const PressKitManager = () => {
  const { pressKits, loading, deletePressKit, updatePressKit } = usePressKits();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPressKit, setSelectedPressKit] = useState<PressKit | null>(null);

  const filteredPressKits = pressKits.filter(kit => {
    const matchesSearch = kit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         kit.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || kit.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
      case 'logo':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'document':
      case 'press_release':
      case 'bio':
      case 'fact_sheet':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileImage className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'draft':
        return 'bg-yellow-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const handleQuickPublish = async (kit: PressKit) => {
    await updatePressKit(kit.id, { status: 'published', is_public: true });
  };

  const handleQuickArchive = async (kit: PressKit) => {
    await updatePressKit(kit.id, { status: 'archived' });
  };

  const handleDelete = async (kitId: string) => {
    if (window.confirm('Are you sure you want to delete this press kit? This action cannot be undone.')) {
      await deletePressKit(kitId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading press kits..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Press Kit Management</h2>
          <p className="text-muted-foreground">
            Create, organize, and distribute press materials for media outreach
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Press Kit
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Kits</p>
                <p className="text-2xl font-bold">{pressKits.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">
                  {pressKits.filter(k => k.status === 'published').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                <Eye className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold">
                  {pressKits.filter(k => k.status === 'draft').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center">
                <Edit className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">
                  {pressKits.reduce((sum, kit) => sum + (kit.items?.length || 0), 0)}
                </p>
              </div>
              <FileImage className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search press kits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('all')}
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('draft')}
              >
                Drafts
              </Button>
              <Button
                variant={selectedStatus === 'published' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('published')}
              >
                Published
              </Button>
              <Button
                variant={selectedStatus === 'archived' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus('archived')}
              >
                Archived
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Press Kits Grid */}
      {filteredPressKits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No press kits found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first press kit to get started'
              }
            </p>
            {!searchQuery && selectedStatus === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Press Kit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPressKits.map((kit) => (
            <Card key={kit.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{kit.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        variant="secondary" 
                        className={`${getStatusColor(kit.status)} text-white`}
                      >
                        {kit.status}
                      </Badge>
                      {kit.is_featured && (
                        <Badge variant="outline">Featured</Badge>
                      )}
                      {kit.is_public && (
                        <Badge variant="outline">Public</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {kit.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {kit.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                {/* Items Preview */}
                {kit.items && kit.items.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium">Items ({kit.items.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {kit.items.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs"
                        >
                          {getItemTypeIcon(item.item_type)}
                          {item.title.length > 15 ? `${item.title.substring(0, 15)}...` : item.title}
                        </div>
                      ))}
                      {kit.items.length > 4 && (
                        <div className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                          +{kit.items.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Updated {formatDistanceToNow(new Date(kit.updated_at), { addSuffix: true })}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Template: {kit.template_type}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedPressKit(kit)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  {kit.status === 'draft' && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleQuickPublish(kit)}
                    >
                      <Share className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                  )}
                  
                  {kit.status === 'published' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickArchive(kit)}
                    >
                      Archive
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(kit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <PressKitCreateDialog
          onClose={() => setShowCreateDialog(false)}
        />
      )}

      {/* Details Dialog */}
      {selectedPressKit && (
        <PressKitDetails
          pressKit={selectedPressKit}
          onClose={() => setSelectedPressKit(null)}
        />
      )}
    </div>
  );
};
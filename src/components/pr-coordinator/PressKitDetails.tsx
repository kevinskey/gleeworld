import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PressKit, usePressKits } from '@/hooks/usePressKits';
import { PressKitItemManager } from './PressKitItemManager';
import { PressKitShare } from './PressKitShare';
import { Edit, Share, Download, Eye, Calendar, User, FileText, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PressKitDetailsProps {
  pressKit: PressKit;
  onClose: () => void;
}

export const PressKitDetails = ({ pressKit, onClose }: PressKitDetailsProps) => {
  const { updatePressKit } = usePressKits();
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleStatusChange = async (newStatus: 'draft' | 'published' | 'archived') => {
    await updatePressKit(pressKit.id, { 
      status: newStatus,
      is_public: newStatus === 'published' ? true : pressKit.is_public
    });
  };

  const handleTogglePublic = async () => {
    await updatePressKit(pressKit.id, { is_public: !pressKit.is_public });
  };

  const handleToggleFeatured = async () => {
    await updatePressKit(pressKit.id, { is_featured: !pressKit.is_featured });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-bold">{pressKit.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="secondary" 
                    className={`${getStatusColor(pressKit.status)} text-white`}
                  >
                    {pressKit.status}
                  </Badge>
                  {pressKit.is_featured && (
                    <Badge variant="outline">Featured</Badge>
                  )}
                  {pressKit.is_public && (
                    <Badge variant="outline">Public</Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Items ({pressKit.items?.length || 0})</TabsTrigger>
            <TabsTrigger value="share">Share & Distribution</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Basic Info */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Press Kit Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pressKit.description && (
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{pressKit.description}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        Created
                      </div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(pressKit.created_at), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        Last Updated
                      </div>
                      <div className="font-medium">
                        {formatDistanceToNow(new Date(pressKit.updated_at), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <User className="h-4 w-4" />
                        Template
                      </div>
                      <div className="font-medium capitalize">
                        {pressKit.template_type.replace('_', ' ')}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <FileText className="h-4 w-4" />
                        Items
                      </div>
                      <div className="font-medium">
                        {pressKit.items?.length || 0} items
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pressKit.status === 'draft' && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleStatusChange('published')}
                    >
                      Publish Press Kit
                    </Button>
                  )}
                  
                  {pressKit.status === 'published' && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleStatusChange('archived')}
                    >
                      Archive Press Kit
                    </Button>
                  )}
                  
                  {pressKit.status === 'archived' && (
                    <Button 
                      className="w-full"
                      onClick={() => handleStatusChange('published')}
                    >
                      Republish Press Kit
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleTogglePublic}
                  >
                    {pressKit.is_public ? 'Make Private' : 'Make Public'}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleToggleFeatured}
                  >
                    {pressKit.is_featured ? 'Remove from Featured' : 'Mark as Featured'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Items Preview */}
            {pressKit.items && pressKit.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pressKit.items.slice(0, 6).map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {item.item_type.replace('_', ' ')}
                          </Badge>
                          {item.is_featured && (
                            <Badge variant="secondary" className="text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {pressKit.items.length > 6 && (
                    <div className="text-center mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('items')}
                      >
                        View All {pressKit.items.length} Items
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="items">
            <PressKitItemManager pressKit={pressKit} />
          </TabsContent>

          <TabsContent value="share">
            <PressKitShare pressKit={pressKit} />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Press Kit Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Settings panel coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
import React, { useState } from 'react';
import { Users, MessageSquare, Heart, Send, Bell, Clock, Calendar, Trash2, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { MemberDirectory } from '@/components/directory/MemberDirectory';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import SendBucketOfLove from '@/components/buckets-of-love/SendBucketOfLove';
import PostItGrid from '@/components/buckets-of-love/PostItGrid';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { format } from 'date-fns';
import NotificationsInterface from '@/components/notifications/NotificationsInterface';
import { QuickActions } from '@/components/community/QuickActions';
export const CommunityHubModule = () => {
  const [activeTab, setActiveTab] = useState('announcements');
  const {
    user
  } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const {
    announcements,
    loading: announcementsLoading,
    deleteAnnouncement
  } = useAnnouncements();
  const handleDeleteAnnouncement = async (announcementId: string) => {
    await deleteAnnouncement(announcementId);
  };
  const handleTabToggle = (tab: string) => {
    if (isMobile) {
      setActiveTab(prev => prev === tab ? '' : tab);
    } else {
      setActiveTab(tab);
    }
  };

  // Mini quick sender state - removed since replaced by NotificationsInterface

  // Buckets of Love tab removed from Community Hub per request
  return <div className="h-full flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Add QuickActions at the top */}
      
      
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        
        {/* Buckets of Love tab intentionally removed */}
        
        <TabsContent value="wellness" className="flex-1 p-4 bg-gradient-to-b from-green-50/50 to-background h-full overflow-y-auto">
          <div className="text-center text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="mb-2 font-medium text-green-700">Wellness & Mental Health</p>
            <p className="text-sm mb-4">Support your well-being and connect with resources</p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300">
                Daily Check-in
              </Button>
              <Button variant="outline" size="sm" className="w-full bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                Wellness Resources
              </Button>
            </div>
          </div>
        </TabsContent>
        
        
        <TabsContent value="buckets" className="flex-1 p-4 bg-gradient-to-b from-pink-50/50 to-background h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Share encouragement with the community</p>
            <SendBucketOfLove trigger={<Button size="sm" variant="default" className="hover-scale"><Send className="h-4 w-4 mr-1" /> Add Bucket</Button>} />
          </div>
          <PostItGrid />
        </TabsContent>
        
        <TabsContent value="notifications" className="flex-1 p-4 w-full overflow-auto">
          <NotificationsInterface />
        </TabsContent>
        
        <TabsContent value="directory" className="flex-1 max-h-[50vh] overflow-auto">
          <MemberDirectory />
        </TabsContent>
      </Tabs>
    </div>;
};
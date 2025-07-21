import React, { useState, useEffect } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bell, Calendar, Users, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type Announcement = Database['public']['Tables']['gw_announcements']['Row'];

const Announcements = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadAnnouncements();
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();
      
      setIsAdmin(profile?.is_admin || profile?.is_super_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading announcements:', error);
        toast.error('Failed to load announcements');
        return;
      }

      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnnouncementTypeColor = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'important':
        return 'bg-orange-100 text-orange-800';
      case 'general':
        return 'bg-blue-100 text-blue-800';
      case 'event':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (expireDate: string | null) => {
    if (!expireDate) return false;
    return new Date(expireDate) < new Date();
  };

  const isPublished = (publishDate: string | null) => {
    if (!publishDate) return true;
    return new Date(publishDate) <= new Date();
  };

  const visibleAnnouncements = announcements.filter(announcement => {
    if (isAdmin) return true; // Admins see all announcements
    return isPublished(announcement.publish_date) && !isExpired(announcement.expire_date);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading announcements..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <PageHeader
          title="Announcements"
          description="Stay updated with the latest news and updates"
          backgroundVariant="gradient"
        >
          {isAdmin && (
            <Button
              onClick={() => navigate('/admin/announcements/new')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          )}
        </PageHeader>

        
        {/* Announcements List */}
        <div className="space-y-6 mt-6">
          {visibleAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No announcements yet</h3>
                <p className="text-gray-500 text-center">
                  Check back later for updates and announcements from the Glee Club.
                </p>
              </CardContent>
            </Card>
          ) : (
            visibleAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <CardTitle className="text-xl">{announcement.title}</CardTitle>
                        {announcement.announcement_type && (
                          <Badge className={getAnnouncementTypeColor(announcement.announcement_type)}>
                            {announcement.announcement_type}
                          </Badge>
                        )}
                        {announcement.is_featured && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Featured
                          </Badge>
                        )}
                        {isAdmin && !isPublished(announcement.publish_date) && (
                          <Badge className="bg-gray-100 text-gray-800">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Draft
                          </Badge>
                        )}
                        {isAdmin && isExpired(announcement.expire_date) && (
                          <Badge className="bg-red-100 text-red-800">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(announcement.created_at || '')}
                        </div>
                        {announcement.target_audience && (
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {announcement.target_audience}
                          </div>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/announcements/${announcement.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
                  </div>
                  {announcement.expire_date && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500">
                        Expires: {formatDate(announcement.expire_date)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;
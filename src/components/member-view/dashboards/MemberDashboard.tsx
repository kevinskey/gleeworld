import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { ExecutiveBoardDirectory } from "@/components/shared/ExecutiveBoardDirectory";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  CheckCircle, 
  Bell, 
  ArrowRight,
  GraduationCap,
  AlertCircle,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Music,
  Heart,
  Edit,
  ExternalLink
} from "lucide-react";

interface MemberDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

export const MemberDashboard = ({ user }: MemberDashboardProps) => {
  const navigate = useNavigate();
  const { events: upcomingEvents, loading: eventsLoading } = usePublicGleeWorldEvents();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({
    total: 0,
    present: 0,
    percentage: 0
  });
  const [contractsData, setContractsData] = useState<any[]>([]);
  const [notificationsData, setNotificationsData] = useState<any[]>([]);

  useEffect(() => {
    fetchUserData();
  }, [user.id]);

  const fetchUserData = async () => {
    try {
      // Fetch complete user profile
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);

      // Fetch attendance data
      const { data: attendance } = await supabase
        .from('gw_event_attendance')
        .select('*, gw_events(title, start_date)')
        .eq('user_id', user.id);

      if (attendance && attendance.length > 0) {
        const total = attendance.length;
        const present = attendance.filter(a => a.attendance_status === 'present').length;
        setAttendanceData({
          total,
          present,
          percentage: Math.round((present / total) * 100)
        });
      }

      // Fetch contract signatures
      const { data: contracts } = await supabase
        .from('contract_signatures_v2')
        .select('*, contracts_v2(title, created_at)')
        .eq('contract_id', user.id);

      setContractsData(contracts || []);

      // Fetch notifications
      const { data: notifications } = await supabase
        .from('gw_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      setNotificationsData(notifications || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalNotifications = () => {
    return contractsData.filter(c => c.status === 'pending_artist_signature').length +
           notificationsData.length;
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* SCGC Handbook Card */}
        <Card 
          className="cursor-pointer hover:shadow-md transition-all duration-200 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10" 
          onClick={() => navigate('/handbook')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-primary">SCGC Handbook</CardTitle>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <ArrowRight className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2024</div>
            <p className="text-sm text-muted-foreground">Official guide & exam</p>
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Attendance</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceData.percentage}%</div>
            <p className="text-sm text-muted-foreground">
              {attendanceData.present} of {attendanceData.total} rehearsals
            </p>
            <Progress value={attendanceData.percentage} className="mt-2" />
          </CardContent>
        </Card>

        {/* Upcoming Events Card */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/calendar')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Upcoming Events</CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="animate-pulse">
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{upcomingEvents.length}</div>
                <p className="text-sm text-muted-foreground">Public events</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Consolidated Notifications & Tasks Card */}
        <Card className="relative overflow-hidden border-orange-200 dark:border-orange-800">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 rounded-bl-full"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base font-bold text-orange-700 dark:text-orange-300">Action Items</CardTitle>
              <p className="text-sm text-muted-foreground">Tasks & notifications</p>
            </div>
            <div className="relative">
              <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              {getTotalNotifications() > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-medium">
                  {getTotalNotifications()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mb-2">
              {getTotalNotifications()}
            </div>
            <p className="text-sm text-muted-foreground mb-3">Items need attention</p>
            
            {getTotalNotifications() > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {/* Pending Contracts */}
                {contractsData.filter(c => c.status === 'pending_artist_signature').map(contract => (
                  <div key={contract.id} className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs">
                    <FileText className="h-3 w-3 text-orange-600" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{contract.contracts_v2?.title || 'Contract'}</span>
                      <span className="text-muted-foreground ml-1">• Pending signature</span>
                    </div>
                  </div>
                ))}
                
                {/* Recent Notifications */}
                {notificationsData.slice(0, 2).map(notification => (
                  <div key={notification.id} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                    <AlertCircle className="h-3 w-3 text-blue-600" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{notification.title}</span>
                      <span className="text-muted-foreground ml-1">• {new Date(notification.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-2 text-muted-foreground">
                <CheckCircle className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">All caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Information Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Member Profile
            </CardTitle>
            <CardDescription>Personal and academic information</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  {userProfile?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{userProfile.phone}</span>
                    </div>
                  )}
                  {userProfile?.academic_major && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{userProfile.academic_major}</span>
                    </div>
                  )}
                  {userProfile?.class_year && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Class of {userProfile.class_year}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {userProfile?.voice_part && (
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">{userProfile.voice_part}</Badge>
                    </div>
                  )}
                  {userProfile?.can_dance && (
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">Can Dance</Badge>
                    </div>
                  )}
                  {userProfile?.home_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{userProfile.home_address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => navigate('/profile')}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Picture & Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback>
                  {user.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="font-semibold">{user.full_name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={() => navigate('/calendar')}
              >
                <Calendar className="h-4 w-4" />
                View Calendar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={() => navigate('/handbook')}
              >
                <FileText className="h-4 w-4" />
                Handbook
              </Button>
              {userProfile?.website_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full gap-2"
                  onClick={() => window.open(userProfile.website_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Website
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Board Directory */}
      <div className="grid grid-cols-1 gap-6 mt-6">
        <ExecutiveBoardDirectory variant="compact" />
      </div>

      {/* Bottom Row - Community Hub */}
      <div className="mt-6">
        <CommunityHubWidget />
      </div>
    </div>
  );
};

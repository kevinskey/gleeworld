
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { 
  Music, 
  Calendar, 
  CheckCircle, 
  DollarSign, 
  Bell, 
  User,
  Clock,
  BookOpen,
  Mic,
  MessageSquare,
  ShoppingBag,
  Star,
  TrendingUp,
  Award,
  Users,
  Volume2,
  Settings
} from "lucide-react";
import { HeroManagement } from "@/components/admin/HeroManagement";
import { DashboardSettings } from "@/components/admin/DashboardSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useDashboardSettings } from "@/hooks/useDashboardSettings";
import { useUserDashboard } from "@/hooks/useUserDashboard";
import { useGleeWorldEvents } from "@/hooks/useGleeWorldEvents";
import { useUserContracts } from "@/hooks/useUserContracts";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useState } from "react";
import { format } from "date-fns";

export const UserDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { getSettingByName } = useDashboardSettings();
  const { dashboardData, payments, notifications, loading: dashboardLoading } = useUserDashboard();
  const { events, loading: eventsLoading, getUpcomingEvents } = useGleeWorldEvents();
  const { contracts, loading: contractsLoading } = useUserContracts();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super-admin';
  const welcomeCardSetting = getSettingByName('welcome_card_background');

  if (!user) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center py-20">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Authentication Required</h3>
                <p className="text-gray-600 mb-4">Please sign in to access your dashboard.</p>
                <Button onClick={() => window.location.href = '/auth'}>
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </UniversalLayout>
    );
  }

  // Show hero management if admin has selected it
  if (selectedModule === 'hero-management' && isAdmin) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-4">
            <Button variant="outline" onClick={() => setSelectedModule(null)}>
              ← Back to Dashboard
            </Button>
          </div>
          <HeroManagement />
        </div>
      </UniversalLayout>
    );
  }

  // Show dashboard settings if admin has selected it
  if (selectedModule === 'dashboard-settings' && isAdmin) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-4">
            <Button variant="outline" onClick={() => setSelectedModule(null)}>
              ← Back to Dashboard
            </Button>
          </div>
          <DashboardSettings />
        </div>
      </UniversalLayout>
    );
  }

  // Get user's actual name from profile, fallback to email username
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Member';
  
  // Get user's role for title display
  const getUserTitle = () => {
    const role = profile?.role;
    switch (role) {
      case 'super-admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  // Get real data
  const upcomingEventsList = getUpcomingEvents(6);
  
  // Create real recent activity from various sources
  const getRecentActivity = () => {
    const activities: Array<{id: string, action: string, time: string, type: string}> = [];
    
    // Add recent payments
    payments?.slice(0, 2).forEach((payment, index) => {
      activities.push({
        id: `payment-${payment.id}`,
        action: `Payment received: $${payment.amount}`,
        time: new Date(payment.created_at).toLocaleDateString(),
        type: 'payment'
      });
    });
    
    // Add recent notifications
    notifications?.slice(0, 2).forEach((notification, index) => {
      activities.push({
        id: `notification-${notification.id}`,
        action: notification.message,
        time: new Date(notification.created_at).toLocaleDateString(),
        type: 'notification'
      });
    });
    
    // Add recent contracts
    contracts?.slice(0, 2).forEach((contract) => {
      activities.push({
        id: `contract-${contract.id}`,
        action: `Contract ${contract.signature_status}: ${contract.title}`,
        time: new Date(contract.created_at).toLocaleDateString(),
        type: 'contract'
      });
    });
    
    return activities.slice(0, 4);
  };

  const recentActivity = getRecentActivity();

  return (
    <UniversalLayout containerized={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-6 space-y-6">
          
          {/* Dashboard Header with Background */}
          <div 
            className="relative bg-white rounded-lg shadow-sm border p-6 overflow-hidden"
            style={{
              backgroundImage: welcomeCardSetting?.image_url ? `url(${welcomeCardSetting.image_url})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Overlay for text readability when background image is present */}
            {welcomeCardSetting?.image_url && (
              <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg" />
            )}
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 ring-2 ring-white/50">
                  <AvatarImage src={profile?.avatar_url || "/placeholder-avatar.jpg"} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className={`text-2xl font-bold ${welcomeCardSetting?.image_url ? 'text-white drop-shadow-lg' : 'text-gray-900'}`}>
                    Welcome back, {displayName}!
                  </h1>
                  <p className={`${welcomeCardSetting?.image_url ? 'text-white/90 drop-shadow' : 'text-gray-600'}`}>
                    Spelman College Glee Club {getUserTitle()}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile?.voice_part && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {profile.voice_part}
                      </Badge>
                    )}
                    <Badge variant="outline" className="bg-white/20 text-white border-white/30">
                      {getUserTitle()}
                    </Badge>
                    <Badge className="bg-green-500/80 text-white border-green-300/30">
                      Active Member
                    </Badge>
                  </div>
                </div>
              </div>
              <div className={`text-right ${welcomeCardSetting?.image_url ? 'text-white' : 'text-gray-900'}`}>
                <p className={`text-sm ${welcomeCardSetting?.image_url ? 'text-white/80' : 'text-gray-600'}`}>
                  Member since
                </p>
                <p className="font-medium">{profile?.created_at ? format(new Date(profile.created_at), 'MMMM yyyy') : 'Recently'}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingEventsList.length}</div>
                <p className="text-xs text-gray-600">
                  {upcomingEventsList.length > 0 ? `Next: ${format(new Date(upcomingEventsList[0].start_date), 'MMM dd')}` : 'No events scheduled'}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contracts</CardTitle>
                <Music className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.total_contracts || 0}</div>
                <p className="text-xs text-green-600">{dashboardData?.signed_contracts || 0} signed</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payments</CardTitle>
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.payments_received || 0}</div>
                <p className="text-xs text-purple-600">${dashboardData?.total_amount_received || 0}</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notifications</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{dashboardData?.unread_notifications || 0}</div>
                <p className="text-xs text-gray-600">Unread</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Access your most-used features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button className="h-20 flex-col space-y-2" variant="outline">
                  <Music className="h-6 w-6" />
                  <span>View Sheet Music</span>
                </Button>
                <Button className="h-20 flex-col space-y-2" variant="outline">
                  <CheckCircle className="h-6 w-6" />
                  <span>Mark Attendance</span>
                </Button>
                <Button className="h-20 flex-col space-y-2" variant="outline">
                  <Clock className="h-6 w-6" />
                  <span>Practice Log</span>
                </Button>
                <Button className="h-20 flex-col space-y-2" variant="outline">
                  <Bell className="h-6 w-6" />
                  <span>Announcements</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Events - Horizontal Carousel */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
                <CardDescription>Your next rehearsals and performances</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEventsList.length > 0 ? (
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-2 md:-ml-4">
                      {upcomingEventsList.map((event) => (
                        <CarouselItem key={event.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg min-w-[280px]">
                            <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{event.title}</h4>
                              <p className="text-sm text-gray-600">{format(new Date(event.start_date), 'PPP')}</p>
                              {event.location && (
                                <p className="text-sm text-gray-500 truncate">{event.location}</p>
                              )}
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                ) : (
                  <p className="text-gray-500 text-center py-4">No upcoming events scheduled</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest actions and updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    {activity.type === 'music' && <Music className="h-5 w-5 text-blue-600" />}
                    {activity.type === 'attendance' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {activity.type === 'practice' && <Clock className="h-5 w-5 text-purple-600" />}
                    {activity.type === 'payment' && <DollarSign className="h-5 w-5 text-emerald-600" />}
                    <div className="flex-1">
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Modules</CardTitle>
              <CardDescription>Access all your Glee Club features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Music Category */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Music className="h-5 w-5 mr-2 text-blue-600" />
                    Music
                  </h3>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <BookOpen className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Sheet Music</div>
                        <div className="text-xs text-gray-500">Access vocal parts</div>
                      </div>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <Volume2 className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Practice Resources</div>
                        <div className="text-xs text-gray-500">Audio guides</div>
                      </div>
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-auto p-3"
                      onClick={() => window.location.href = '/system?tab=soundcloud'}
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>SoundCloud Library</div>
                        <div className="text-xs text-gray-500">Recordings</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Events Category */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-green-600" />
                    Events
                  </h3>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <Calendar className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Calendar</div>
                        <div className="text-xs text-gray-500">View all events</div>
                      </div>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Attendance</div>
                        <div className="text-xs text-gray-500">Track participation</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Account Category */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    <User className="h-5 w-5 mr-2 text-purple-600" />
                    Account
                  </h3>
                  <div className="space-y-2">
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <User className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Profile</div>
                        <div className="text-xs text-gray-500">Manage info</div>
                      </div>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Announcements</div>
                        <div className="text-xs text-gray-500">Stay updated</div>
                      </div>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start h-auto p-3">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      <div className="text-left">
                        <div>Store</div>
                        <div className="text-xs text-gray-500">Merchandise</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Admin Category - Only show for admins */}
                {isAdmin && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2 text-red-600" />
                      Admin
                    </h3>
                    <div className="space-y-2">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start h-auto p-3"
                        onClick={() => setSelectedModule('hero-management')}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div>Hero Management</div>
                          <div className="text-xs text-gray-500">Control landing page hero</div>
                        </div>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start h-auto p-3"
                        onClick={() => setSelectedModule('dashboard-settings')}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div>Dashboard Settings</div>
                          <div className="text-xs text-gray-500">Customize dashboard appearance</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Glee Club Spotlight */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Glee Club Spotlight
              </CardTitle>
              <CardDescription>Member recognition and community updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-3">
                    <Award className="h-8 w-8 text-yellow-600" />
                    <div>
                      <h4 className="font-semibold">Member of the Month</h4>
                      <p className="text-sm text-gray-600">Congratulations to Sarah Johnson for outstanding dedication!</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">Latest Achievement</h4>
                      <p className="text-sm text-gray-600">First place at the Regional Choir Competition!</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UniversalLayout>
  );
};

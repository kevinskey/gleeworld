
import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Users, GraduationCap, Book, Calendar, Mail, MessageSquare, Shield, User } from 'lucide-react';
import { isAdmin } from '@/constants/permissions';

const Dashboard = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { userProfile, loading: profileLoading, displayName, firstName } = useUserProfile(user);

  useEffect(() => {
    document.title = 'Dashboard | Glee Club';
  }, []);

  if (authLoading || profileLoading) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-brand-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!userProfile) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg font-semibold">Welcome!</p>
            <p className="text-muted-foreground">
              We're setting up your profile. Please wait a moment...
            </p>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  const renderDashboardContent = () => {
    // Visitor Dashboard
    if (userProfile.role === 'visitor') {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Welcome, Visitor!</h1>
            <p className="text-muted-foreground">
              Explore our website and learn more about the Glee Club.
            </p>
          </div>

          {/* Call to Action */}
          <Card>
            <CardContent className="text-center">
              <p>Interested in joining?</p>
              <Button asChild>
                <Link to="/auth">Sign Up</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Fan Dashboard
    if (userProfile.role === 'fan') {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Welcome, {firstName}!</h1>
            <p className="text-muted-foreground">
              Thank you for supporting the Glee Club!
            </p>
          </div>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Check back soon for upcoming concerts and events!</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Member Dashboard
    if (userProfile.role === 'member') {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Welcome, {firstName}!</h1>
            <p className="text-muted-foreground">
              Stay connected with the Glee Club community.
            </p>
          </div>

          {/* Member Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Member Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Access important documents, rehearsal schedules, and more.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Alumna Dashboard
    if (userProfile.role === 'alumna') {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
            <p className="text-muted-foreground">
              Reconnect with fellow alumni and stay updated on Glee Club news.
            </p>
          </div>

          {/* Alumni Events */}
          <Card>
            <CardHeader>
              <CardTitle>Alumni Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Find information about upcoming alumni gatherings and reunions.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Executive Dashboard
    if (userProfile.role === 'executive') {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Executive Dashboard</h1>
            <p className="text-muted-foreground">
              Manage Glee Club operations and member activities.
            </p>
          </div>

          {/* Executive Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Executive Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Access administrative tools and resources for managing the Glee Club.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Admin Dashboard
    if (userProfile.is_admin || userProfile.is_super_admin || userProfile.role === 'admin' || userProfile.role === 'super-admin') {
      return (
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-6 w-6 md:h-8 md:w-8 text-brand-500" />
              <h1 className="text-2xl md:text-3xl font-bebas text-brand-800 tracking-wide">Admin Dashboard</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Manage users, roles, permissions, and system settings
            </p>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link to="/user-management">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-4">
                    <Users className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">User Management</div>
                      <div className="text-sm text-muted-foreground">Complete user account management</div>
                    </div>
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-4">
                    <Calendar className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Event Management</div>
                      <div className="text-sm text-muted-foreground">Create and manage Glee Club events</div>
                    </div>
                  </Button>
                </Link>
                <Link to="/mailing-lists">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-4">
                    <Mail className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Mailing Lists</div>
                      <div className="text-sm text-muted-foreground">Manage and send emails to groups</div>
                    </div>
                  </Button>
                </Link>
                <Link to="/forums">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-4">
                    <MessageSquare className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Forum Management</div>
                      <div className="text-sm text-muted-foreground">Moderate forum discussions</div>
                    </div>
                  </Button>
                </Link>
                <Link to="/library">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-4">
                    <Book className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Library Management</div>
                      <div className="text-sm text-muted-foreground">Manage sheet music and resources</div>
                    </div>
                  </Button>
                </Link>
                <Link to="/alumni">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto p-4">
                    <GraduationCap className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Alumni Management</div>
                      <div className="text-sm text-muted-foreground">Maintain alumni records and engagement</div>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p>No recent activity to display.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Default Dashboard
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Welcome, {displayName}!</h1>
          <p className="text-muted-foreground">
            Explore the Glee Club website and discover upcoming events.
          </p>
        </div>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={userProfile.avatar_url} alt={displayName} />
                <AvatarFallback>{displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{displayName}</p>
                <p className="text-muted-foreground">{user.email}</p>
                <Badge variant="secondary">{userProfile.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <UniversalLayout>
      <div className="space-y-4 md:space-y-6 px-4 md:px-0">
        {renderDashboardContent()}
      </div>
    </UniversalLayout>
  );
};

export default Dashboard;

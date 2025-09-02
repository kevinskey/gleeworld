import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecBoardMemberModules } from '@/components/executive/ExecBoardMemberModules';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Crown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface MemberProfile {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  is_exec_board: boolean;
}

export default function ExecutiveBoardMemberDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemberProfile = async () => {
      if (!userId) {
        setError('No user ID provided');
        setLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email, role, is_exec_board')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching member profile:', error);
          setError('Failed to load member profile');
        } else if (!profile) {
          setError('Member not found');
        } else {
          setMemberProfile(profile);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load member profile');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberProfile();
  }, [userId]);

  if (authLoading || roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading member dashboard..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user has permission to view this executive board member's dashboard
  const canView = isAdmin || isSuperAdmin || user.id === userId;
  
  if (!canView) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to view this executive board member's dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !memberProfile) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Crown className="h-5 w-5" />
              Error
            </CardTitle>
            <CardDescription>
              {error || 'Failed to load member profile'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!memberProfile.is_exec_board) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-muted-foreground" />
              Not Executive Board
            </CardTitle>
            <CardDescription>
              {memberProfile.full_name} is not currently a member of the executive board.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8 text-primary" />
              {memberProfile.full_name}
            </h1>
            <p className="text-muted-foreground">Executive Board Member Dashboard</p>
          </div>
        </div>

        {/* Executive Board Member Modules */}
        <ExecBoardMemberModules 
          user={{
            id: memberProfile.user_id,
            email: memberProfile.email,
            full_name: memberProfile.full_name,
            role: memberProfile.role,
            is_exec_board: memberProfile.is_exec_board
          }}
        />
      </div>
    </div>
  );
}
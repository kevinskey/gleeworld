import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, User, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedModulesSimple } from '@/hooks/useUnifiedModulesSimple';
import { UserModuleMatrix } from './UserModuleMatrix';
import { toast } from 'sonner';

export const UsernamePermissionsManager = () => {
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userNotFound, setUserNotFound] = useState<boolean>(false);
  const [profile, setProfile] = useState<any>(null);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUserNotFound(false);
    setUserId(null);
    setProfile(null);

    try {
      // Fetch user profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role, is_active, is_super_admin, is_admin, is_exec_board, exec_board_role')
        .eq('username', username)
        .single();

      if (profileError) {
        if (profileError.message.includes('No rows found')) {
          setUserNotFound(true);
          return;
        }
        throw profileError;
      }

      setProfile(profileData);
      setUserId(profileData.user_id);
    } catch (e: any) {
      console.error('Failed to fetch user', e);
      setError(e.message || 'Failed to fetch user');
      toast.error('Failed to fetch user');
    } finally {
      setLoading(false);
    }
  }, [username]);

  const handleClear = () => {
    setUsername('');
    setUserId(null);
    setError(null);
    setLoading(false);
    setUserNotFound(false);
    setProfile(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User-Specific Permissions</CardTitle>
        <CardDescription>
          Search for a user by username to manage their individual module permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
          <Button type="button" variant="secondary" onClick={handleClear} disabled={loading}>
            Clear
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {userNotFound && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>User not found. Please check the username.</AlertDescription>
          </Alert>
        )}

        {profile && (
          <div className="border rounded-md p-4 bg-muted">
            <div className="flex items-center space-x-3 mb-2">
              <User className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">{profile.full_name}</h3>
              <Badge variant="secondary">{profile.role}</Badge>
              {profile.is_super_admin && <Badge>Super Admin</Badge>}
              {profile.is_admin && <Badge>Admin</Badge>}
              {profile.is_exec_board && <Badge>Exec Board</Badge>}
            </div>
            <p className="text-sm text-gray-500">
              <strong>Username:</strong> {username}
              <br />
              <strong>Email:</strong> {profile.email}
            </p>
          </div>
        )}

        {userId && !loading && !error && !userNotFound && (
          <UserModuleMatrix userId={userId} />
        )}
      </CardContent>
    </Card>
  );
};

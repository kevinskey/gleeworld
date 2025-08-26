import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Users, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { PermissionsGrid } from './PermissionsGrid';
import { EXECUTIVE_POSITIONS, useExecutivePermissions } from '@/hooks/useExecutivePermissions';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import type { Database } from '@/integrations/supabase/types';

type ExecutivePositionType = Database['public']['Enums']['executive_position'];

export const ExecutiveBoardPermissionPanel = () => {
  const [selectedPosition, setSelectedPosition] = useState<ExecutivePositionType>('tour_manager');
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    permissionsSet: 0,
    hasAdminAccess: false
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const { appFunctions, loading: functionsLoading } = useExecutivePermissions();
  
  console.log('ExecutiveBoardPermissionPanel component loading...');
  
  const selectedPositionData = EXECUTIVE_POSITIONS.find(pos => pos.value === selectedPosition);
  
  useEffect(() => {
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        // Get total executive board members for this position
        const { data: members, error: membersError } = await supabase
          .from('gw_executive_board_members')
          .select('*')
          .eq('position', selectedPosition);

        if (membersError) throw membersError;

        // Get permission count for this position
        const { data: permissions, error: permissionsError } = await supabase
          .from('gw_executive_position_functions')
          .select('*')
          .eq('position', selectedPosition);

        if (permissionsError) throw permissionsError;

        const totalMembers = members?.length || 0;
        const activeMembers = members?.filter(m => m.is_active)?.length || 0;
        const permissionsSet = permissions?.length || 0;
        const hasAdminAccess = permissions?.some(p => p.can_manage) || false;

        setStats({
          totalMembers,
          activeMembers,
          permissionsSet,
          hasAdminAccess
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (selectedPosition) {
      fetchStats();
    }
  }, [selectedPosition]);
  
  if (!selectedPositionData) {
    return (
      <UniversalLayout>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">Position Not Found</h3>
            <p className="text-muted-foreground">The selected executive position could not be found.</p>
          </div>
        </div>
      </UniversalLayout>
    );
  }
  
  return (
    <UniversalLayout>
      <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedPositionData.label} position{stats.totalMembers !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.activeMembers}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions Set</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.permissionsSet}</div>
                <p className="text-xs text-muted-foreground">Function permissions</p>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Management Access</CardTitle>
            <Crown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats.hasAdminAccess ? '✓' : '✗'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.hasAdminAccess ? 'Has management permissions' : 'No management access'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Position Selection and Permission Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Executive Board Permission Management
          </CardTitle>
          <CardDescription>
            Select an executive position to manage their module permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <label htmlFor="position-select" className="text-sm font-medium">
                Select Executive Position:
              </label>
              <Select value={selectedPosition} onValueChange={(value) => setSelectedPosition(value as ExecutivePositionType)}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Choose an executive position" />
                </SelectTrigger>
                <SelectContent>
                  {EXECUTIVE_POSITIONS.map((position) => (
                    <SelectItem key={position.value} value={position.value}>
                      {position.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedPositionData && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">
                  Managing permissions for: {selectedPositionData.label}
                </h4>
                <p className="text-sm text-blue-700">
                  Use the checkboxes below to grant or revoke access and management permissions for each module.
                  <br />
                  <strong>Access</strong> = can view the module, <strong>Manage</strong> = can modify data in the module
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Grid */}
      {selectedPositionData && (
        <PermissionsGrid selectedPosition={selectedPositionData} />
      )}
      </div>
    </UniversalLayout>
  );
};
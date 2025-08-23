// Executive Board Monitor Page - Fixed routing
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Eye, Users, Shield, Settings, AlertCircle } from 'lucide-react';
import { useExecutiveBoardMembers } from '@/hooks/useExecutiveBoardMembers';
import { ExecBoardMemberModules } from '@/components/executive/ExecBoardMemberModules';
import { useAuth } from '@/contexts/AuthContext';

export function ExecutiveBoardMonitor() {
  const { user, loading: authLoading } = useAuth();
  const { members, loading } = useExecutiveBoardMembers();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [demoMode, setDemoMode] = useState(false);

  const selectedMember = members.find(m => m.user_id === selectedMemberId);

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Executive Board Monitor</h1>
              <p className="text-muted-foreground">Monitor executive board member dashboards and access</p>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication required or demo mode option if not authenticated
  if (!user && !demoMode) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Executive Board Monitor</h1>
              <p className="text-muted-foreground">Monitor executive board member dashboards and access</p>
            </div>
          </div>
          
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                <CardTitle>Authentication Required</CardTitle>
              </div>
              <CardDescription>
                This feature requires super admin access to monitor executive board member dashboards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To access the Executive Board Monitor, you need to be logged in as a super admin.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => window.location.href = '/'}>
                  Go to Login
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setDemoMode(true)}
                  className="text-sm"
                >
                  View Demo Mode
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Executive Board Monitor</h1>
              <p className="text-muted-foreground">Monitor executive board member dashboards and access</p>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading executive board members...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Eye className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Executive Board Monitor</h1>
            <p className="text-muted-foreground">Monitor executive board member dashboards and access</p>
          </div>
          {demoMode && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Demo Mode
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executive Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter(m => m.position && m.position !== 'unassigned').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Module Access</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter(m => m.user_id).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monitoring Status</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
            </CardContent>
          </Card>
        </div>

        {/* Member Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Executive Board Member</CardTitle>
            <CardDescription>
              Choose a board member to view their dashboard modules and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an executive board member..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.user_id || member.position} value={member.user_id || ''}>
                      <div className="flex items-center gap-2">
                        <span>{member.full_name || 'No user assigned'}</span>
                        <Badge variant="outline">{member.position}</Badge>
                        {member.email && (
                          <span className="text-sm text-muted-foreground">({member.email})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedMember && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Selected Member Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Name:</span> {selectedMember.full_name || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Position:</span> {selectedMember.position}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedMember.email || 'N/A'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Member Dashboard View */}
        {selectedMember && selectedMember.user_id && (
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Modules for {selectedMember.full_name}</CardTitle>
              <CardDescription>
                Viewing the executive board modules that this member has access to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExecBoardMemberModules 
                user={{
                  id: selectedMember.user_id,
                  email: selectedMember.email,
                  full_name: selectedMember.full_name,
                  role: 'member',
                  exec_board_role: selectedMember.position,
                  is_exec_board: true,
                  is_admin: false,
                  is_super_admin: false
                }}
              />
            </CardContent>
          </Card>
        )}

        {selectedMemberId && !selectedMember?.user_id && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No User Assigned</h3>
                <p>This executive position does not have a user assigned to it yet.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
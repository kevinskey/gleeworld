import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, Users, Shield, CheckCircle } from 'lucide-react';
import { PermissionsGrid } from './PermissionsGrid';
import { EXECUTIVE_POSITIONS } from '@/hooks/useExecutivePermissions';

export const ExecutiveBoardPermissionPanel = () => {
  const [selectedPosition, setSelectedPosition] = useState<string>('tour_manager');
  console.log('ExecutiveBoardPermissionPanel component loading...');
  
  const selectedPositionData = EXECUTIVE_POSITIONS.find(pos => pos.value === selectedPosition);
  
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Onnesty as Tour Manager</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions Set</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">Tour management permissions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Access</CardTitle>
            <Crown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">✓</div>
            <p className="text-xs text-muted-foreground">Full tour management</p>
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
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
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
  );
};
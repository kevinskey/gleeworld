import React, { useState } from 'react';
import { Users, Plus, UserCheck, UserX, Calendar } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModuleProps } from '@/types/unified-modules';
import { useServiceProviderAssignments, useAssignServiceProvider, useUnassignServiceProvider } from '@/hooks/useServiceProviderAssignments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export const ServiceProviderManagementModule = ({ user, isFullPage = false }: ModuleProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [providerName, setProviderName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: assignments = [], isLoading } = useServiceProviderAssignments();
  const assignMutation = useAssignServiceProvider();
  const unassignMutation = useUnassignServiceProvider();

  // Fetch all users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role')
        .order('full_name');
      
      if (error) throw error;
      return data.map(profile => ({
        id: profile.user_id,
        full_name: profile.full_name || 'Unknown',
        email: profile.email || '',
        role: profile.role || 'member'
      })) as User[];
    }
  });

  const availableServices = [
    'Voice Lessons',
    'Music Theory Tutoring',
    'Performance Coaching',
    'Audition Preparation',
    'Sight Reading Help',
    'Accompaniment',
    'Recording Session',
    'General Consultation'
  ];

  const handleAssign = async () => {
    if (!selectedUserId || !providerName || !email || selectedServices.length === 0) {
      return;
    }

    try {
      await assignMutation.mutateAsync({
        userId: selectedUserId,
        providerName,
        email,
        servicesOffered: selectedServices
      });
      
      // Reset form
      setSelectedUserId('');
      setProviderName('');
      setEmail('');
      setSelectedServices([]);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to assign service provider:', error);
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    try {
      await unassignMutation.mutateAsync(assignmentId);
    } catch (error) {
      console.error('Failed to unassign service provider:', error);
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setProviderName(selectedUser.full_name);
      setEmail(selectedUser.email);
    }
  };

  if (isFullPage) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Service Provider Management</h1>
            <p className="text-muted-foreground">Assign users as service providers for the appointment system</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Service Provider</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user-select">Select User</Label>
                  <Select value={selectedUserId} onValueChange={handleUserSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="provider-name">Provider Name</Label>
                  <Input
                    id="provider-name"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="Display name for appointments"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Contact email for clients"
                  />
                </div>

                <div>
                  <Label>Services Offered</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableServices.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={service}
                          checked={selectedServices.includes(service)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServices([...selectedServices, service]);
                            } else {
                              setSelectedServices(selectedServices.filter(s => s !== service));
                            }
                          }}
                        />
                        <Label htmlFor={service} className="text-sm">
                          {service}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleAssign} 
                  className="w-full"
                  disabled={!selectedUserId || !providerName || !email || selectedServices.length === 0}
                >
                  Assign Provider
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
              <p className="text-xs text-muted-foreground">assigned service providers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignments.filter(a => a.is_active).length}
              </div>
              <p className="text-xs text-muted-foreground">currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Service Types</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Array.from(new Set(assignments.flatMap(a => a.services_offered))).length}
              </div>
              <p className="text-xs text-muted-foreground">unique services</p>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        <Card>
          <CardHeader>
            <CardTitle>Service Provider Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading assignments...</p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Providers Assigned</h3>
                <p className="text-muted-foreground">Start by assigning users as service providers.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{assignment.provider_name}</span>
                          </div>
                          <Badge variant={assignment.is_active ? "default" : "secondary"}>
                            {assignment.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <p>Email: {assignment.email}</p>
                          <p>Assigned: {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {assignment.services_offered.map((service) => (
                            <Badge key={service} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {assignment.is_active ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleUnassign(assignment.id)}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Inactive
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ModuleWrapper
      id="service-provider-management"
      title="Service Provider Management"
      description="Assign and manage service providers for the appointment system"
      icon={Users}
      iconColor="blue"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">{assignments.filter(a => a.is_active).length}</span> active providers
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Assign
          </Button>
        </div>

        <div className="space-y-2">
          {assignments.slice(0, 3).map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <div>
                <div className="font-medium text-sm">{assignment.provider_name}</div>
                <div className="text-xs text-muted-foreground">
                  {assignment.services_offered.slice(0, 2).join(', ')}
                  {assignment.services_offered.length > 2 && ` +${assignment.services_offered.length - 2} more`}
                </div>
              </div>
              <Badge variant={assignment.is_active ? "default" : "secondary"}>
                {assignment.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          ))}
          
          {assignments.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No service providers assigned
            </div>
          )}
        </div>

        <Button 
          className="w-full" 
          onClick={() => window.location.href = '/dashboard?module=service-provider-management'}
        >
          Manage All Providers
        </Button>
      </div>
      
      {/* Dialog for assignment */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Service Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="provider-name">Provider Name</Label>
              <Input
                id="provider-name"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="Display name for appointments"
              />
            </div>

            <div>
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contact email for clients"
              />
            </div>

            <div>
              <Label>Services Offered</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {availableServices.slice(0, 4).map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={service}
                      checked={selectedServices.includes(service)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedServices([...selectedServices, service]);
                        } else {
                          setSelectedServices(selectedServices.filter(s => s !== service));
                        }
                      }}
                    />
                    <Label htmlFor={service} className="text-xs">
                      {service}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={handleAssign} 
              className="w-full"
              disabled={!selectedUserId || !providerName || !email || selectedServices.length === 0}
            >
              Assign Provider
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModuleWrapper>
  );
};
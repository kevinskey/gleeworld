import React, { useState } from 'react';
import { Users, Plus, UserCheck, Settings, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUsers } from '@/hooks/useUsers';
import { useServiceProviders } from '@/hooks/useServiceProviders';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const DEFAULT_SERVICES = [
  'Counseling',
  'Career Guidance', 
  'Academic Support',
  'Mental Health',
  'Spiritual Guidance',
  'Music Therapy',
  'Voice Coaching',
  'Performance Coaching'
];

export const ProviderManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    bio: '',
    phone: '',
    services_offered: [] as string[],
    is_active: true
  });

  const { users = [], loading } = useUsers();
  const { data: providers = [] } = useServiceProviders();
  const queryClient = useQueryClient();

  // Filter users who are not yet providers
  const nonProviderUsers = users.filter(user => 
    !providers.some(provider => provider.user_id === user.id)
  );

  // Get providers with user data
  const providersWithUsers = providers.map(provider => {
    const user = users.find(u => u.id === provider.user_id);
    return {
      ...provider,
      user
    };
  });

  const filteredProviders = providersWithUsers.filter(provider =>
    provider.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      title: '',
      department: '',
      bio: '',
      phone: '',
      services_offered: [],
      is_active: true
    });
    setSelectedUser(null);
  };

  const handleCreateProvider = async () => {
    if (!selectedUser) {
      toast.error('Please select a user');
      return;
    }

    if (!formData.title || formData.services_offered.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('gw_service_providers')
        .insert({
          user_id: selectedUser.id,
          provider_name: selectedUser.full_name || selectedUser.email,
          email: selectedUser.email,
          title: formData.title,
          department: formData.department,
          bio: formData.bio,
          phone: formData.phone,
          services_offered: formData.services_offered,
          is_active: formData.is_active
        });

      if (error) throw error;

      toast.success('Provider created successfully!');
      setIsCreateDialogOpen(false);
      resetForm();
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
    } catch (error) {
      console.error('Error creating provider:', error);
      toast.error('Failed to create provider');
    }
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(service)
        ? prev.services_offered.filter(s => s !== service)
        : [...prev.services_offered, service]
    }));
  };

  const handleToggleProviderStatus = async (providerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gw_service_providers')
        .update({ is_active: !currentStatus })
        .eq('id', providerId);

      if (error) throw error;

      toast.success(`Provider ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['service-providers'] });
    } catch (error) {
      console.error('Error updating provider status:', error);
      toast.error('Failed to update provider status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Provider Management</h2>
          <p className="text-muted-foreground">Manage service providers and assign users as providers</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Provider</DialogTitle>
              <DialogDescription>
                Convert a user into a service provider by assigning them provider details.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* User Selection */}
              <div>
                <Label>Select User *</Label>
                <Select 
                  value={selectedUser?.id || ''} 
                  onValueChange={(value) => {
                    const user = nonProviderUsers.find(u => u.id === value);
                    setSelectedUser(user);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a user to make a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonProviderUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm"><strong>Selected User:</strong> {selectedUser.full_name || selectedUser.email}</p>
                    <p className="text-sm text-muted-foreground">Email: {selectedUser.email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Title/Position *</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Dr., Professor, Counselor, etc."
                      />
                    </div>
                    
                    <div>
                      <Label>Department</Label>
                      <Input
                        value={formData.department}
                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Psychology, Music, etc."
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label>Bio</Label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Brief bio and qualifications..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Services Offered *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {DEFAULT_SERVICES.map(service => (
                        <label key={service} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.services_offered.includes(service)}
                            onChange={() => handleServiceToggle(service)}
                            className="rounded"
                          />
                          <span className="text-sm">{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProvider} disabled={!selectedUser}>
                Create Provider
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search providers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Providers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map(provider => (
          <Card key={provider.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {provider.profile_image_url ? (
                    <img 
                      src={provider.profile_image_url} 
                      alt={provider.provider_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{provider.title} {provider.provider_name}</CardTitle>
                    <CardDescription>{provider.department}</CardDescription>
                  </div>
                </div>
                <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                  {provider.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm"><strong>Email:</strong> {provider.email}</p>
                  {provider.phone && <p className="text-sm"><strong>Phone:</strong> {provider.phone}</p>}
                  {provider.user && (
                    <p className="text-sm"><strong>User:</strong> {provider.user.full_name || provider.user.email}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-1">Services:</p>
                  <div className="flex flex-wrap gap-1">
                    {provider.services_offered.slice(0, 3).map(service => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {provider.services_offered.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{provider.services_offered.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={provider.is_active ? "outline" : "default"}
                    onClick={() => handleToggleProviderStatus(provider.id, provider.is_active)}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    {provider.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No providers found</p>
            <p className="text-muted-foreground">Create your first provider to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
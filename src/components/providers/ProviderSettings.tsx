import React, { useState } from 'react';
import { Save, User, Mail, Phone, Building, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ServiceProvider, useUpdateProviderProfile } from '@/hooks/useServiceProviders';
import { ProviderServiceManager } from './ProviderServiceManager';

interface ProviderSettingsProps {
  provider: ServiceProvider;
}

export const ProviderSettings: React.FC<ProviderSettingsProps> = ({
  provider
}) => {
  const { toast } = useToast();
  const updateMutation = useUpdateProviderProfile();

  const [formData, setFormData] = useState({
    provider_name: provider.provider_name,
    email: provider.email,
    phone: provider.phone || '',
    title: provider.title || '',
    department: provider.department || '',
    bio: provider.bio || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        id: provider.id,
        ...formData,
      });

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Provider Settings</h2>
        <p className="text-muted-foreground">Manage your profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your basic profile information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Dr., Prof., etc."
                />
              </div>
              <div>
                <Label htmlFor="provider_name">Full Name</Label>
                <Input
                  id="provider_name"
                  value={formData.provider_name}
                  onChange={(e) => handleInputChange('provider_name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="Music Department, Psychology, etc."
              />
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell clients about yourself, your experience, and expertise..."
                rows={4}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services Offered</CardTitle>
          <CardDescription>
            The types of appointments you can provide
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {provider.services_offered?.map(service => (
              <div key={service} className="flex items-center gap-2 p-2 bg-muted rounded">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="capitalize">{service.replace('-', ' ')}</span>
              </div>
            ))}
            {(!provider.services_offered || provider.services_offered.length === 0) && (
              <p className="text-muted-foreground">No services configured. Contact an administrator to set up your services.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Provider ID:</span>
              <span className="text-sm font-mono">{provider.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <span className={`text-sm px-2 py-1 rounded ${provider.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {provider.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Member Since:</span>
              <span className="text-sm">{new Date(provider.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Management */}
      <ProviderServiceManager provider={provider} />
    </div>
  );
};
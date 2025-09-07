import React, { useState } from 'react';
import { User, Settings, Clock, Calendar, Plus, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentProvider, useUpdateProviderProfile } from '@/hooks/useServiceProviders';
import { useRealAppointments } from '@/hooks/useRealAppointments';
import { ProviderAvailabilityManager } from '@/components/providers/ProviderAvailabilityManager';
import { ProviderServiceManager } from '@/components/providers/ProviderServiceManager';
import { supabase } from '@/integrations/supabase/client';

const providerProfileSchema = z.object({
  provider_name: z.string().min(1, 'Name is required'),
  title: z.string().optional(),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().optional()
});

type ProviderProfileForm = z.infer<typeof providerProfileSchema>;

export const ProviderProfileSelector = () => {
  const { user } = useAuth();
  const { data: currentProvider, isLoading } = useCurrentProvider();
  const { data: appointments = [] } = useRealAppointments();
  const updateProviderMutation = useUpdateProviderProfile();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'appointments' | 'availability' | 'services'>('profile');

  const form = useForm<ProviderProfileForm>({
    resolver: zodResolver(providerProfileSchema),
    defaultValues: {
      provider_name: currentProvider?.provider_name || '',
      title: currentProvider?.title || '',
      email: currentProvider?.email || user?.email || '',
      phone: currentProvider?.phone || '',
      department: currentProvider?.department || '',
      bio: currentProvider?.bio || ''
    }
  });

  // Update form when provider data loads
  React.useEffect(() => {
    if (currentProvider) {
      form.reset({
        provider_name: currentProvider.provider_name,
        title: currentProvider.title || '',
        email: currentProvider.email,
        phone: currentProvider.phone || '',
        department: currentProvider.department || '',
        bio: currentProvider.bio || ''
      });
    }
  }, [currentProvider, form]);

  const handleCreateProviderProfile = async (data: ProviderProfileForm) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('gw_service_providers')
        .insert({
          user_id: user.id,
          provider_name: data.provider_name,
          title: data.title || null,
          email: data.email,
          phone: data.phone || null,
          department: data.department || null,
          bio: data.bio || null,
          is_active: true,
          services_offered: []
        });

      if (error) throw error;

      toast.success('Provider profile created successfully!');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating provider profile:', error);
      toast.error('Failed to create provider profile');
    }
  };

  const handleUpdateProfile = async (data: ProviderProfileForm) => {
    if (!currentProvider) return;

    try {
      await updateProviderMutation.mutateAsync({
        id: currentProvider.id,
        ...data
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  // Filter appointments for current provider
  const myAppointments = appointments.filter(apt => {
    if (!currentProvider) return false;
    
    console.log('🔍 Filtering appointment:', apt.title, 'Provider:', currentProvider.provider_name);
    console.log('🔍 Appointment service:', apt.service, 'Provider ID:', currentProvider.id);
    
    // For now, show all appointments since provider_id assignment needs to be implemented
    // TODO: Implement proper provider assignment in appointment creation
    return true;
  }).slice(0, 5); // Show only next 5 appointments

  console.log('🔍 Current provider:', currentProvider?.provider_name);
  console.log('🔍 All appointments:', appointments.length);
  console.log('🔍 My filtered appointments:', myAppointments.length);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your provider profile...</p>
        </div>
      </div>
    );
  }

  if (!currentProvider) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <User className="w-6 h-6" />
            Provider Profile Setup
          </CardTitle>
          <CardDescription>
            Set up your provider profile to manage appointments and availability
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-muted p-6 rounded-lg">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">No Provider Profile Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have a provider profile yet. Create one to start managing your appointments and availability.
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create Provider Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Provider Profile</DialogTitle>
                <DialogDescription>
                  Set up your provider profile to manage appointments and availability
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateProviderProfile)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select title" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Dr.">Dr.</SelectItem>
                                <SelectItem value="Prof.">Prof.</SelectItem>
                                <SelectItem value="Mr.">Mr.</SelectItem>
                                <SelectItem value="Ms.">Ms.</SelectItem>
                                <SelectItem value="Mrs.">Mrs.</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="provider_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="your.email@domain.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Music Department" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell us about yourself and your expertise..." 
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Profile
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Provider Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            {currentProvider.profile_image_url ? (
              <img 
                src={currentProvider.profile_image_url} 
                alt={currentProvider.provider_name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {currentProvider.title} {currentProvider.provider_name}
              </CardTitle>
              <CardDescription className="text-base">
                {currentProvider.department && (
                  <span>{currentProvider.department} • </span>
                )}
                <Badge variant={currentProvider.is_active ? "default" : "secondary"}>
                  {currentProvider.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('profile')}
          className="rounded-b-none"
        >
          <Settings className="w-4 h-4 mr-2" />
          Profile
        </Button>
        <Button
          variant={activeTab === 'appointments' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('appointments')}
          className="rounded-b-none"
        >
          <Calendar className="w-4 h-4 mr-2" />
          My Appointments
        </Button>
        <Button
          variant={activeTab === 'availability' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('availability')}
          className="rounded-b-none"
        >
          <Clock className="w-4 h-4 mr-2" />
          Availability
        </Button>
        <Button
          variant={activeTab === 'services' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('services')}
          className="rounded-b-none"
        >
          <User className="w-4 h-4 mr-2" />
          Services
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your profile information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateProfile)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select title" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Dr.">Dr.</SelectItem>
                              <SelectItem value="Prof.">Prof.</SelectItem>
                              <SelectItem value="Mr.">Mr.</SelectItem>
                              <SelectItem value="Ms.">Ms.</SelectItem>
                              <SelectItem value="Mrs.">Mrs.</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="provider_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your.email@domain.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Music Department" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about yourself and your expertise..." 
                          className="resize-none"
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateProviderMutation.isPending}>
                    {updateProviderMutation.isPending ? 'Updating...' : 'Update Profile'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'appointments' && (
        <Card>
          <CardHeader>
            <CardTitle>My Upcoming Appointments</CardTitle>
            <CardDescription>
              View and manage your scheduled appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">No Upcoming Appointments</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have any appointments scheduled yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{appointment.title}</h4>
                      <p className="text-sm text-muted-foreground">{appointment.clientName}</p>
                      <p className="text-sm text-muted-foreground">{appointment.clientEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{appointment.date.toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">{appointment.time}</p>
                      <Badge variant={
                        appointment.status === 'confirmed' ? 'default' :
                        appointment.status === 'pending' ? 'secondary' :
                        appointment.status === 'cancelled' ? 'destructive' : 'outline'
                      }>
                        {appointment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {appointments.length > 5 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" size="sm">
                      View All Appointments
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'availability' && (
        <ProviderAvailabilityManager provider={currentProvider} />
      )}

      {activeTab === 'services' && (
        <ProviderServiceManager provider={currentProvider} />
      )}

      {/* Add Recurring Payment Management for customers */}
      {currentProvider?.email && (
        <div className="mt-6">
          <RecurringPaymentManager 
            customerEmail={currentProvider.email} 
            appointments={myAppointments}
          />
        </div>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { Plus, X, Users, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  useProviderServices, 
  useAvailableServices, 
  useAssignServiceToProvider, 
  useRemoveServiceFromProvider 
} from '@/hooks/useProviderServices';
import type { ServiceProvider } from '@/hooks/useServiceProviders';

interface ProviderServiceManagerProps {
  provider: ServiceProvider;
}

export const ProviderServiceManager = ({ provider }: ProviderServiceManagerProps) => {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const { data: providerServices = [], isLoading } = useProviderServices(provider.id);
  const { data: availableServices = [] } = useAvailableServices(provider.id);
  const assignServiceMutation = useAssignServiceToProvider();
  const removeServiceMutation = useRemoveServiceFromProvider();

  const handleAssignService = async () => {
    if (!selectedServiceId) {
      toast.error('Please select a service');
      return;
    }

    try {
      await assignServiceMutation.mutateAsync({
        providerId: provider.id,
        serviceId: selectedServiceId
      });
      
      toast.success('Service assigned successfully!');
      setIsAssignDialogOpen(false);
      setSelectedServiceId('');
    } catch (error) {
      console.error('Error assigning service:', error);
      toast.error('Failed to assign service');
    }
  };

  const handleRemoveService = async (serviceId: string) => {
    try {
      await removeServiceMutation.mutateAsync({
        providerId: provider.id,
        serviceId
      });
      
      toast.success('Service removed successfully!');
    } catch (error) {
      console.error('Error removing service:', error);
      toast.error('Failed to remove service');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Services for {provider.title} {provider.provider_name}
            </CardTitle>
            <CardDescription>
              Manage which services this provider offers
            </CardDescription>
          </div>
          
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Assign Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Service to Provider</DialogTitle>
                <DialogDescription>
                  Select a service to assign to {provider.provider_name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Available Services</label>
                  <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - {service.price_display} ({service.duration_minutes}min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAssignDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignService}
                  disabled={!selectedServiceId || assignServiceMutation.isPending}
                >
                  {assignServiceMutation.isPending ? 'Assigning...' : 'Assign Service'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {providerServices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No services assigned to this provider</p>
            <p className="text-sm">Assign services to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {providerServices.map(providerService => (
              <div 
                key={providerService.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{providerService.service?.name}</h4>
                    <Badge variant="outline">{providerService.service?.category}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {providerService.service?.price_display} • {providerService.service?.duration_minutes} minutes
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemoveService(providerService.service_id)}
                  disabled={removeServiceMutation.isPending}
                  className="ml-3"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {availableServices.length === 0 && providerServices.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-center text-sm text-muted-foreground">
            All available services have been assigned to this provider
          </div>
        )}
      </CardContent>
    </Card>
  );
};
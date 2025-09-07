import React from 'react';
import { Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceProviders, type ServiceProvider } from '@/hooks/useServiceProviders';
import { useProviderServices } from '@/hooks/useProviderServices';

interface ProviderSelectorProps {
  selectedProviderId?: string;
  onProviderSelect: (provider: ServiceProvider) => void;
  serviceId?: string; // Filter providers by a specific service
}

export const ProviderSelector = ({ 
  selectedProviderId, 
  onProviderSelect, 
  serviceId 
}: ProviderSelectorProps) => {
  const { data: providers = [], isLoading } = useServiceProviders();

  // Filter providers by service if specified
  const filteredProviders = React.useMemo(() => {
    if (!serviceId) return providers.filter(provider => provider.is_active);
    
    // This would require additional filtering based on provider-service associations
    // For now, return all active providers
    return providers.filter(provider => provider.is_active);
  }, [providers, serviceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (filteredProviders.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No providers available {serviceId ? 'for this service' : ''}</p>
      </div>
    );
  }

  const selectedProvider = filteredProviders.find(p => p.id === selectedProviderId);

  return (
    <div className="space-y-2">
      <Select
        value={selectedProviderId || ''}
        onValueChange={(value) => {
          const provider = filteredProviders.find(p => p.id === value);
          if (provider) {
            onProviderSelect(provider);
          }
        }}
      >
        <SelectTrigger className="w-full h-12 bg-background border-2 focus:border-primary">
          <SelectValue placeholder="Select a provider...">
            {selectedProvider && (
              <div className="flex items-center gap-3">
                {selectedProvider.profile_image_url ? (
                  <img 
                    src={selectedProvider.profile_image_url} 
                    alt={selectedProvider.provider_name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-3 h-3 text-primary" />
                  </div>
                )}
                <span className="font-medium">
                  {selectedProvider.title} {selectedProvider.provider_name}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-60 overflow-y-auto bg-background border shadow-lg z-50">
          {filteredProviders.map(provider => (
            <SelectItem 
              key={provider.id} 
              value={provider.id}
              className="cursor-pointer hover:bg-muted focus:bg-muted"
            >
              <div className="flex items-center gap-3 py-2">
                {provider.profile_image_url ? (
                  <img 
                    src={provider.profile_image_url} 
                    alt={provider.provider_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {provider.title} {provider.provider_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {provider.department}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
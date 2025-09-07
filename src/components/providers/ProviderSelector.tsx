import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceProviders, type ServiceProvider } from '@/hooks/useServiceProviders';
import { useProviderServices } from '@/hooks/useProviderServices';

interface ProviderSelectorProps {
  selectedProviderId?: string;
  onProviderSelect: (provider: ServiceProvider) => void;
  serviceId?: string; // Filter providers by a specific service
}

const ProviderCard = ({ 
  provider, 
  isSelected, 
  onSelect 
}: { 
  provider: ServiceProvider; 
  isSelected: boolean; 
  onSelect: () => void;
}) => {
  const { data: providerServices = [] } = useProviderServices(provider.id);

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-primary border-primary' 
          : 'hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
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
          <div className="flex-1">
            <h4 className="font-medium">{provider.title} {provider.provider_name}</h4>
            <p className="text-sm text-muted-foreground">{provider.department}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {providerServices.slice(0, 3).map(ps => (
                <Badge 
                  key={ps.id}
                  variant="outline"
                  className="text-xs"
                >
                  {ps.service?.name}
                </Badge>
              ))}
              {providerServices.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{providerServices.length - 3} more
                </Badge>
              )}
              {providerServices.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  No services assigned
                </span>
              )}
            </div>
          </div>
        </div>
        {provider.bio && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {provider.bio}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select a Provider</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProviders.map(provider => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            isSelected={selectedProviderId === provider.id}
            onSelect={() => onProviderSelect(provider)}
          />
        ))}
      </div>
    </div>
  );
};
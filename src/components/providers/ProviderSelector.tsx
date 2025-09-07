import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useServiceProviders, type ServiceProvider } from '@/hooks/useServiceProviders';

interface ProviderSelectorProps {
  selectedProviderId?: string;
  onProviderSelect: (provider: ServiceProvider) => void;
  serviceType?: string;
}

export const ProviderSelector = ({ 
  selectedProviderId, 
  onProviderSelect, 
  serviceType 
}: ProviderSelectorProps) => {
  const { data: providers = [], isLoading } = useServiceProviders();

  // Filter providers by service type if specified
  const filteredProviders = serviceType 
    ? providers.filter(provider => 
        provider.services_offered.some(service => 
          service.toLowerCase().includes(serviceType.toLowerCase())
        )
      )
    : providers;

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
        <p>No providers available for this service</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select a Provider</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProviders.map(provider => (
          <Card 
            key={provider.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedProviderId === provider.id 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onProviderSelect(provider)}
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
                  <div className="flex flex-wrap gap-1 mt-1">
                    {provider.services_offered.slice(0, 2).map(service => (
                      <span 
                        key={service}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                    {provider.services_offered.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{provider.services_offered.length - 2} more
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
        ))}
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { ArrowLeft, Search, Music, Clock, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServices } from '@/hooks/useServices';
import { useServiceProviders } from '@/hooks/useProviderServices';
import { useServiceProviders as useProviders } from '@/hooks/useServiceProviders';


export default function ServiceSelection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const { data: services = [], isLoading: servicesLoading } = useServices();
  const { data: providers = [], isLoading: providersLoading } = useProviders();
  const { data: serviceProviders = [] } = useServiceProviders(selectedService || undefined);

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get available providers for selected service
  const availableProviders = selectedService 
    ? serviceProviders.map(sp => sp.provider).filter(Boolean)
    : [];

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setSelectedProvider(null); // Reset provider when service changes
  };

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
  };

  const handleContinue = () => {
    if (!selectedService) return;
    const params = new URLSearchParams();
    params.set('service', selectedService);
    if (selectedProvider) {
      params.set('provider', selectedProvider);
    }
    window.location.href = `/booking/datetime?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-primary">
      {/* Navigation Header */}
      <div className="border-b border-white/20 bg-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="text-primary-foreground font-bold text-xl">GleeWorld</div>
              <nav className="hidden md:flex space-x-6">
                <a href="/scheduling" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Services</a>
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Instructors</a>
                <a href="#" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Locations</a>
                <a href="#" className="text-secondary font-semibold border-b-2 border-secondary">Book Now</a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-primary-foreground/80 text-sm">🇺🇸 English</span>
              <Button variant="outline" className="border-white/30 text-primary-foreground hover:bg-white/10">
                Log In
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Selection */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="flex items-center mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary-foreground hover:bg-white/10 mr-4"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold text-primary-foreground">Choose Service</h1>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
              <Input
                placeholder="Search services"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-white/10 border-white/30 text-primary-foreground placeholder:text-white/60 rounded-full"
              />
            </div>

            {/* Service Categories */}
            <div className="space-y-6">
              {/* Voice Lessons Category */}
              <div>
                <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Music className="h-5 w-5 text-secondary" />
                        <div>
                          <h3 className="text-lg font-semibold text-primary-foreground">Services</h3>
                          <p className="text-sm text-primary-foreground/70">{filteredServices.length} Options</p>
                        </div>
                      </div>
                    </div>

                    {/* Service Cards */}
                    <div className="space-y-4">
                      {servicesLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                          <p className="text-primary-foreground/70 mt-2">Loading services...</p>
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-primary-foreground/70">No services found</p>
                        </div>
                      ) : (
                        filteredServices.map((service) => (
                          <Card 
                            key={service.id} 
                            className={`bg-white/5 border-white/20 hover:bg-white/10 transition-all cursor-pointer ${
                              selectedService === service.id ? 'ring-2 ring-secondary' : ''
                            }`}
                            onClick={() => handleServiceSelect(service.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
                                  <Music className="w-8 h-8 text-primary-foreground" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <div className="flex items-center space-x-2 mb-1">
                                        {service.badge_text && (
                                          <Badge className="bg-blue-500 text-white text-xs">
                                            {service.badge_text}
                                          </Badge>
                                        )}
                                        <h4 className="text-primary-foreground font-semibold">{service.name}</h4>
                                      </div>
                                      <div className="flex items-center space-x-4 text-sm text-primary-foreground/70 mb-2">
                                        <span>Duration: {service.duration_minutes}min</span>
                                        <span>Category: {service.category}</span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-primary-foreground mb-2">{service.price_display}</div>
                                      <Button 
                                        className={`${selectedService === service.id ? 'bg-secondary hover:bg-secondary/90' : 'bg-blue-400 hover:bg-blue-500'} text-white`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleServiceSelect(service.id);
                                        }}
                                      >
                                        {selectedService === service.id ? 'Selected' : 'Choose'}
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-primary-foreground/80 mb-3">{service.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>

                    {/* Provider Selection */}
                    {selectedService && availableProviders.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-white/20">
                        <h3 className="text-lg font-semibold text-primary-foreground mb-4">Select Provider</h3>
                        <div className="space-y-3">
                          {availableProviders.map((provider) => (
                            <Card 
                              key={provider.id} 
                              className={`bg-white/5 border-white/20 hover:bg-white/10 transition-all cursor-pointer ${
                                selectedProvider === provider.id ? 'ring-2 ring-secondary' : ''
                              }`}
                              onClick={() => handleProviderSelect(provider.id)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-primary-foreground font-semibold">
                                      {provider.title} {provider.provider_name}
                                    </h4>
                                    {provider.department && (
                                      <p className="text-sm text-primary-foreground/70">{provider.department}</p>
                                    )}
                                  </div>
                                  <Button 
                                    size="sm"
                                    className={`${selectedProvider === provider.id ? 'bg-secondary hover:bg-secondary/90' : 'bg-blue-400 hover:bg-blue-500'} text-white`}
                                  >
                                    {selectedProvider === provider.id ? 'Selected' : 'Select'}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>

          {/* Right Column - Booking Details */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm sticky top-8">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-primary-foreground mb-6">Booking Details</h2>
                
                <div className="space-y-6">
                  {/* Service */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Music className="h-4 w-4 mr-2" />
                      Service
                    </label>
                    <div className="p-3 bg-white/5 border border-white/20 rounded-lg">
                      {selectedService ? (
                        <span className="text-primary-foreground text-sm">
                          {services.find(s => s.id === selectedService)?.name || 'Selected Service'}
                        </span>
                      ) : (
                        <span className="text-primary-foreground/60 text-sm">Choose a service</span>
                      )}
                    </div>
                  </div>

                  {/* Provider */}
                  {selectedService && availableProviders.length > 0 && (
                    <div>
                      <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                        <Users className="h-4 w-4 mr-2" />
                        Provider
                      </label>
                      <div className="p-3 bg-white/5 border border-white/20 rounded-lg">
                        {selectedProvider ? (
                          <span className="text-primary-foreground text-sm">
                            {availableProviders.find(p => p.id === selectedProvider)?.provider_name || 'Selected Provider'}
                          </span>
                        ) : (
                          <span className="text-primary-foreground/60 text-sm">Choose a provider</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date & Time */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Clock className="h-4 w-4 mr-2" />
                      Date & Time
                    </label>
                    <div className="h-12 bg-white/5 border border-white/20 rounded-lg"></div>
                  </div>

                  {/* Continue Button */}
                  <div className="pt-4">
                    <Button 
                      className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
                      disabled={!selectedService}
                      onClick={handleContinue}
                    >
                      Continue to Date & Time
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-primary-foreground/60 mb-4">Talented musicians are training here!</p>
          <div className="text-right text-primary-foreground/60">
            <p className="font-semibold">Spelman Glee Club</p>
            <p>350 Spelman Lane SW, Atlanta, GA</p>
            <p>+1(404)270-5555</p>
            <p>https://gleeworld.org/</p>
          </div>
        </div>
      </div>
    </div>
  );
}
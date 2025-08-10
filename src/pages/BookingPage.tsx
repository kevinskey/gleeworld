import React, { useState } from 'react';
import { ChevronDown, Calendar, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PublicLayout } from '@/components/layout/PublicLayout';

interface ServiceCategory {
  id: string;
  name: string;
  serviceCount: number;
  services: string[];
  expanded: boolean;
}

interface BookingDetails {
  service: string;
  name: string;
  email: string;
  phone: string;
  dateTime: string;
}

export default function BookingPage() {
  // Search removed
  const [categories, setCategories] = useState<ServiceCategory[]>([
    {
      id: 'office-hours',
      name: 'Office Hours',
      serviceCount: 3,
      services: ['Faculty Office Hours', 'Director Office Hours', 'Advising / Q&A'],
      expanded: false
    },
    {
      id: 'lessons',
      name: 'Lessons',
      serviceCount: 3,
      services: ['Individual Voice Lesson', 'Group Lesson', 'Sectional Coaching'],
      expanded: false
    },
    {
      id: 'auditions',
      name: 'Auditions',
      serviceCount: 3,
      services: ['New Member Audition', 'Callback Audition', 'Placement Hearing'],
      expanded: false
    }
  ]);

  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    service: '',
    name: '',
    email: '',
    phone: '',
    dateTime: ''
  });

  const toggleCategory = (categoryId: string) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, expanded: !cat.expanded }
          : cat
      )
    );
  };

  const selectService = (service: string) => {
    setBookingDetails(prev => ({ ...prev, service }));
  };

  const filteredCategories = categories;

  return (
    <PublicLayout>
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/lovable-uploads/d7a22fe1-819c-428c-a1db-eea68a217639.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background/50 via-background/35 to-background/25" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Service Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground mb-6">Choose Service</h1>
              

              {/* Service Categories */}
              <div className="space-y-4">
                {filteredCategories.map((category) => (
                  <Card key={category.id} className="bg-white/10 border-white/20 backdrop-blur-sm">
                    <CardContent className="p-0">
                      <button
                        onClick={() => toggleCategory(category.id)}
                        className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Music className="h-5 w-5 text-secondary" />
                          <div>
                            <h3 className="text-lg font-semibold text-primary-foreground">{category.name}</h3>
                            <p className="text-sm text-primary-foreground/70">{category.serviceCount} Services</p>
                          </div>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-primary-foreground/70 transform transition-transform ${
                            category.expanded ? 'rotate-180' : ''
                          }`} 
                        />
                      </button>

                      {category.expanded && (
                        <div className="px-6 pb-6 space-y-3">
                          {category.services.map((service, index) => (
                            <div
                              key={index}
                              onClick={() => selectService(service)}
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                bookingDetails.service === service
                                  ? 'bg-secondary/20 border-secondary text-primary-foreground'
                                  : 'bg-white/5 border-white/20 text-primary-foreground/80 hover:bg-white/10 hover:border-white/30'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{service}</span>
                                {bookingDetails.service === service && (
                                  <Badge className="bg-secondary text-secondary-foreground">Selected</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
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
                    <div className="p-3 bg-white/5 border border-white/20 rounded-lg text-primary-foreground">
                      {bookingDetails.service || 'No service selected'}
                    </div>
                  </div>

                  {/* Your Name */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      Your Name
                    </label>
                    <Input
                      placeholder="Full name"
                      className="bg-white/5 border-white/20 text-primary-foreground"
                      value={bookingDetails.name}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="bg-white/5 border-white/20 text-primary-foreground"
                      value={bookingDetails.email}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      Phone
                    </label>
                    <Input
                      placeholder="(201) 555-0123"
                      className="bg-white/5 border-white/20 text-primary-foreground"
                      value={bookingDetails.phone}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>

                  {/* Date & Time */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Date & Time
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="date"
                        className="bg-white/5 border-white/20 text-primary-foreground"
                        onChange={(e) => setBookingDetails(prev => ({ 
                          ...prev, 
                          dateTime: e.target.value + (prev.dateTime.includes(' ') ? ' ' + prev.dateTime.split(' ')[1] : '')
                        }))}
                      />
                      <Input
                        type="time"
                        className="bg-white/5 border-white/20 text-primary-foreground"
                        onChange={(e) => setBookingDetails(prev => ({ 
                          ...prev, 
                          dateTime: (prev.dateTime.split(' ')[0] || '') + ' ' + e.target.value
                        }))}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 space-y-3">
                    <Button 
                      className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-3"
                      disabled={!bookingDetails.service}
                      onClick={() => window.location.href = '/booking/service-selection'}
                    >
                      Continue to Payment
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-white/30 text-primary-foreground hover:bg-white/10"
                    >
                      Save as Draft
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </PublicLayout>
  );
}
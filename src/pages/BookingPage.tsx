import React, { useState } from 'react';
import { Search, ChevronDown, Calendar, Clock, MapPin, Users, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ServiceCategory {
  id: string;
  name: string;
  serviceCount: number;
  services: string[];
  expanded: boolean;
}

interface BookingDetails {
  service: string;
  numberOfPeople: string;
  instructor: string;
  location: string;
  dateTime: string;
}

export default function BookingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<ServiceCategory[]>([
    {
      id: '1',
      name: 'Voice Lessons',
      serviceCount: 4,
      services: ['Individual Voice Coaching', 'Group Voice Training', 'Performance Coaching', 'Breathing Techniques'],
      expanded: false
    },
    {
      id: '2',
      name: 'Rehearsals',
      serviceCount: 3,
      services: ['Section Rehearsal', 'Full Ensemble', 'Sight-Reading Practice'],
      expanded: false
    },
    {
      id: '3',
      name: 'Music Theory',
      serviceCount: 2,
      services: ['Music Theory Fundamentals', 'Advanced Harmony'],
      expanded: false
    },
    {
      id: '4',
      name: 'Performance Prep',
      serviceCount: 3,
      services: ['Audition Preparation', 'Solo Performance', 'Stage Presence'],
      expanded: false
    }
  ]);

  const [bookingDetails, setBookingDetails] = useState<BookingDetails>({
    service: '',
    numberOfPeople: '',
    instructor: '',
    location: '',
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

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.services.some(service => 
      service.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground mb-6">Choose Service</h1>
              
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

                  {/* Number of People */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Users className="h-4 w-4 mr-2" />
                      Number of People
                    </label>
                    <Select value={bookingDetails.numberOfPeople} onValueChange={(value) => 
                      setBookingDetails(prev => ({ ...prev, numberOfPeople: value }))
                    }>
                      <SelectTrigger className="bg-white/5 border-white/20 text-primary-foreground">
                        <SelectValue placeholder="Select number" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Person</SelectItem>
                        <SelectItem value="2-4">2-4 People</SelectItem>
                        <SelectItem value="5-10">5-10 People</SelectItem>
                        <SelectItem value="group">Full Section</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Instructor */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Users className="h-4 w-4 mr-2" />
                      Instructor
                    </label>
                    <Select value={bookingDetails.instructor} onValueChange={(value) => 
                      setBookingDetails(prev => ({ ...prev, instructor: value }))
                    }>
                      <SelectTrigger className="bg-white/5 border-white/20 text-primary-foreground">
                        <SelectValue placeholder="Select instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dr-johnson">Dr. Johnson</SelectItem>
                        <SelectItem value="ms-williams">Ms. Williams</SelectItem>
                        <SelectItem value="section-leader">Section Leader</SelectItem>
                        <SelectItem value="piano-faculty">Piano Faculty</SelectItem>
                        <SelectItem value="theory-instructor">Theory Instructor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location
                    </label>
                    <Select value={bookingDetails.location} onValueChange={(value) => 
                      setBookingDetails(prev => ({ ...prev, location: value }))
                    }>
                      <SelectTrigger className="bg-white/5 border-white/20 text-primary-foreground">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="music-room-a">Music Room A</SelectItem>
                        <SelectItem value="music-room-b">Music Room B</SelectItem>
                        <SelectItem value="rehearsal-hall">Rehearsal Hall</SelectItem>
                        <SelectItem value="main-concert-hall">Main Concert Hall</SelectItem>
                        <SelectItem value="practice-room-1">Practice Room 1</SelectItem>
                      </SelectContent>
                    </Select>
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
  );
}
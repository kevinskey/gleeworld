import React, { useState } from 'react';
import { ArrowLeft, Search, Music, Clock, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Service {
  id: string;
  name: string;
  image: string;
  duration: string;
  capacity: string;
  price: string;
  description: string;
  location: string;
  instructor: string;
  badge?: 'Your Choice' | 'Premium' | 'Most Popular';
  badgeColor?: string;
}

const services: Service[] = [
  {
    id: '1',
    name: 'Voice Coaching',
    image: '/lovable-uploads/8fb52a1d-ae81-4f4e-bda6-87fcee73d57e.png',
    duration: '45min',
    capacity: '1-1',
    price: '$75',
    description: 'Our voice coaching service isn\'t just a trim - it\'s a transformation. Our skilled instructors specialize in crafting vocal techniques that look refined and professional.',
    location: 'Music Room A',
    instructor: 'Dr. Johnson',
    badge: 'Your Choice',
    badgeColor: 'bg-green-500'
  },
  {
    id: '2',
    name: 'Section Rehearsal',
    image: '/lovable-uploads/8fb52a1d-ae81-4f4e-bda6-87fcee73d57e.png',
    duration: '1h 45min',
    capacity: '1-4',
    price: '$30',
    description: 'Indulge in the ultimate vocal grooming experience with our Section Rehearsal. Step into a world of luxurious vocal training where every note is perfected.',
    location: 'Rehearsal Hall',
    instructor: 'Section Leader',
    badge: 'Premium',
    badgeColor: 'bg-yellow-500'
  },
  {
    id: '3',
    name: 'Audition Prep',
    image: '/lovable-uploads/8fb52a1d-ae81-4f4e-bda6-87fcee73d57e.png',
    duration: '1h',
    capacity: '1-4',
    price: '$45',
    description: 'WE WILL FIX YOUR AUDITION TECHNIQUE!',
    location: 'Practice Room 3',
    instructor: 'Ms. Williams',
    badge: 'Most Popular',
    badgeColor: 'bg-blue-500'
  },
  {
    id: '4',
    name: 'Music Theory',
    image: '/lovable-uploads/8fb52a1d-ae81-4f4e-bda6-87fcee73d57e.png',
    duration: '30min',
    capacity: '1-2',
    price: '$45',
    description: 'Experience the epitome of musical luxury with our expert Music Theory service. Our skilled instructors are dedicated to providing you with a refined understanding.',
    location: 'Classroom 101',
    instructor: 'Theory Faculty'
  },
  {
    id: '5',
    name: 'Piano Accompaniment',
    image: '/lovable-uploads/8fb52a1d-ae81-4f4e-bda6-87fcee73d57e.png',
    duration: '40min',
    capacity: '1-4',
    price: '$55',
    description: 'As if born from a musical mother!',
    location: 'Music Room B',
    instructor: 'Piano Faculty',
    badge: 'Premium',
    badgeColor: 'bg-yellow-500'
  },
  {
    id: '6',
    name: 'Ensemble Practice',
    image: '/lovable-uploads/8fb52a1d-ae81-4f4e-bda6-87fcee73d57e.png',
    duration: '1h',
    capacity: '1-4',
    price: '$60',
    description: 'Refine your ensemble skills with our Ensemble Practice service, where precision meets personal style. Our skilled instructors are dedicated to crafting perfect harmonies.',
    location: 'Main Concert Hall',
    instructor: 'Director'
  }
];

const categories = [
  { id: 'voice-lessons', name: 'Voice Lessons', count: 6 },
  { id: 'rehearsals', name: 'Rehearsals', count: 3 }
];

export default function ServiceSelection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    // Navigate to next step
    window.location.href = `/booking/datetime?service=${serviceId}`;
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
                          <h3 className="text-lg font-semibold text-primary-foreground">Voice Lessons</h3>
                          <p className="text-sm text-primary-foreground/70">6 Services</p>
                        </div>
                      </div>
                    </div>

                    {/* Service Cards */}
                    <div className="space-y-4">
                      {filteredServices.map((service) => (
                        <Card key={service.id} className="bg-white/5 border-white/20 hover:bg-white/10 transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-4">
                              <img 
                                src={service.image} 
                                alt={service.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                      {service.badge && (
                                        <Badge className={`${service.badgeColor} text-white text-xs`}>
                                          {service.badge}
                                        </Badge>
                                      )}
                                      <h4 className="text-primary-foreground font-semibold">{service.name}</h4>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-primary-foreground/70 mb-2">
                                      <span>Duration: {service.duration}</span>
                                      <span>Capacity: {service.capacity}</span>
                                    </div>
                                    <p className="text-sm text-primary-foreground/80 mb-2">No reviews yet</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-primary-foreground mb-2">{service.price}</div>
                                    <Button 
                                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                                      onClick={() => handleServiceSelect(service.id)}
                                    >
                                      Choose
                                    </Button>
                                  </div>
                                </div>
                                <p className="text-sm text-primary-foreground/80 mb-3">{service.description}</p>
                                <button className="text-secondary text-sm hover:underline">read more</button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rehearsals Category */}
              <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Music className="h-5 w-5 text-secondary" />
                      <div>
                        <h3 className="text-lg font-semibold text-primary-foreground">Rehearsals</h3>
                        <p className="text-sm text-primary-foreground/70">3 Services</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                    <div className="h-12 bg-white/5 border border-white/20 rounded-lg"></div>
                  </div>

                  {/* Number of People */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Users className="h-4 w-4 mr-2" />
                      Number of People
                    </label>
                    <div className="h-12 bg-white/5 border border-white/20 rounded-lg"></div>
                  </div>

                  {/* Instructor */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Users className="h-4 w-4 mr-2" />
                      Instructor
                    </label>
                    <div className="h-12 bg-white/5 border border-white/20 rounded-lg"></div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <MapPin className="h-4 w-4 mr-2" />
                      Location
                    </label>
                    <div className="h-12 bg-white/5 border border-white/20 rounded-lg"></div>
                  </div>

                  {/* Date & Time */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Clock className="h-4 w-4 mr-2" />
                      Date & Time
                    </label>
                    <div className="h-12 bg-white/5 border border-white/20 rounded-lg"></div>
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
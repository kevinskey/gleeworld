import React, { useState } from 'react';
import { Search, MapPin, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  badge?: 'Popular' | 'Premium' | 'New';
  badgeColor?: string;
}

const services: Service[] = [
  {
    id: '1',
    name: 'Voice Coaching',
    image: '/src/assets/voice-coaching.jpg',
    duration: '45min',
    capacity: '1-1',
    price: '$75',
    description: 'Individual voice coaching session',
    location: 'Music Room A',
    instructor: 'Dr. Johnson',
    badge: 'Popular',
    badgeColor: 'bg-blue-500'
  },
  {
    id: '2',
    name: 'Section Rehearsal',
    image: '/src/assets/section-rehearsal.jpg',
    duration: '1h 30min',
    capacity: '8-12',
    price: 'Free',
    description: 'Soprano section practice',
    location: 'Rehearsal Hall',
    instructor: 'Section Leader',
    badge: 'Premium',
    badgeColor: 'bg-yellow-500'
  },
  {
    id: '3',
    name: 'Audition Prep',
    image: '/src/assets/audition-prep.jpg',
    duration: '1h',
    capacity: '1-4',
    price: '$45',
    description: 'Prepare for upcoming auditions',
    location: 'Practice Room 3',
    instructor: 'Ms. Williams'
  },
  {
    id: '4',
    name: 'Piano Accompaniment',
    image: '/src/assets/piano-accompaniment.jpg',
    duration: '30min',
    capacity: '1-2',
    price: '$40',
    description: 'Piano accompaniment session',
    location: 'Music Room B',
    instructor: 'Piano Faculty',
    badge: 'New',
    badgeColor: 'bg-green-500'
  },
  {
    id: '5',
    name: 'Music Theory',
    image: '/src/assets/music-theory.jpg',
    duration: '45min',
    capacity: '1-6',
    price: '$50',
    description: 'Music theory fundamentals',
    location: 'Classroom 101',
    instructor: 'Theory Instructor'
  },
  {
    id: '6',
    name: 'Ensemble Rehearsal',
    image: '/src/assets/ensemble-rehearsal.jpg',
    duration: '2h',
    capacity: '40-60',
    price: 'Free',
    description: 'Full Glee Club rehearsal',
    location: 'Main Concert Hall',
    instructor: 'Director',
    badge: 'Popular',
    badgeColor: 'bg-blue-500'
  }
];

export default function SchedulingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesInstructor = !selectedInstructor || selectedInstructor === 'all' || service.instructor === selectedInstructor;
    const matchesLocation = !selectedLocation || selectedLocation === 'all' || service.location === selectedLocation;
    return matchesSearch && matchesInstructor && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-repeat" 
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
             }}>
        </div>
      </div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="text-center py-16 px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            Glee World Scheduler
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-3xl mx-auto mb-8">
            Experience the ease of scheduling rehearsals, lessons, and coaching sessions with just a few clicks. 
            No matter which service you select, we guarantee to help you reach your musical potential!
          </p>
          <Button 
            size="lg" 
            className="bg-blue-400 hover:bg-blue-500 text-white px-8 py-3 rounded-md font-semibold"
            onClick={() => window.location.href = '/booking'}
          >
            Book Now
          </Button>
        </div>

        {/* Services Section */}
        <div className="px-4 pb-16">
          <div className="max-w-7xl mx-auto">
            {/* Filters Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
              <h2 className="text-2xl font-bold text-primary-foreground mb-4 lg:mb-0">Services</h2>
              <div className="flex items-center gap-2">
                <span className="text-primary-foreground/80 text-sm">Sort by</span>
                <Select defaultValue="popular">
                  <SelectTrigger className="w-32 bg-card border-border text-card-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="price">Price</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search services"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-card border-border text-card-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
                <SelectTrigger className="lg:w-48 bg-card border-border text-card-foreground">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Instructors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Instructors</SelectItem>
                  <SelectItem value="Dr. Johnson">Dr. Johnson</SelectItem>
                  <SelectItem value="Ms. Williams">Ms. Williams</SelectItem>
                  <SelectItem value="Section Leader">Section Leader</SelectItem>
                  <SelectItem value="Piano Faculty">Piano Faculty</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="lg:w-48 bg-card border-border text-card-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="Music Room A">Music Room A</SelectItem>
                  <SelectItem value="Music Room B">Music Room B</SelectItem>
                  <SelectItem value="Rehearsal Hall">Rehearsal Hall</SelectItem>
                  <SelectItem value="Main Concert Hall">Main Concert Hall</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant={selectedCategory === 'All categories' ? 'default' : 'outline'}
                className="lg:w-48 bg-blue-400 hover:bg-blue-500 text-white border-blue-400"
              >
                {selectedCategory}
              </Button>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <Card key={service.id} className="bg-card border-border overflow-hidden hover:bg-card/90 transition-colors depth-hover">
                  <div className="relative">
                    <img 
                      src={service.image} 
                      alt={service.name}
                      className="w-full h-48 object-cover"
                    />
                    {service.badge && (
                      <Badge className={`absolute top-3 left-3 ${service.badgeColor} text-white`}>
                        {service.badge}
                      </Badge>
                    )}
                    <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-sm font-semibold">
                      {service.price}
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <h3 className="text-card-foreground font-semibold text-lg mb-2">{service.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {service.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>Capacity: {service.capacity}</span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-muted-foreground">No reviews yet</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{service.location}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{service.instructor}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-border text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        Learn more
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-blue-400 hover:bg-blue-500 text-white"
                        onClick={() => window.location.href = '/booking'}
                      >
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
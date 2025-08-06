import React from 'react';
import { Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BookingConfirmation() {
  const handleAddToCalendar = () => {
    // Add calendar integration logic here
    console.log('Adding to calendar...');
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
          {/* Left Column - Confirmation */}
          <div className="lg:col-span-2">
            {/* Success Message */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              
              {/* Success Image */}
              <div className="mb-6">
                <img 
                  src="/lovable-uploads/8fb52a1d-ae81-4f4e-bda6-87fcee73d57e.png" 
                  alt="Glee Club practice room"
                  className="w-80 h-48 object-cover rounded-lg mx-auto"
                />
              </div>

              <h1 className="text-3xl font-bold text-primary-foreground mb-4">
                Thank you and come again!
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8">
                ...because every talented musician is training at this location!
              </p>
            </div>

            {/* Calendar Integration */}
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-primary-foreground mb-4">Add booking to calendar</h2>
              
              <div className="space-y-4">
                <Select defaultValue="google-calendar">
                  <SelectTrigger className="bg-white/10 border-white/30 text-primary-foreground">
                    <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google-calendar">Google Calendar</SelectItem>
                    <SelectItem value="outlook">Outlook Calendar</SelectItem>
                    <SelectItem value="apple">Apple Calendar</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  className="w-full bg-blue-400 hover:bg-blue-500 text-white py-3"
                  onClick={handleAddToCalendar}
                >
                  Add to calendar
                </Button>
              </div>
            </div>

            {/* Additional Actions */}
            <div className="flex justify-center space-x-4 mt-8">
              <Button 
                variant="outline" 
                className="border-white/30 text-primary-foreground hover:bg-white/10"
                onClick={() => window.location.href = '/scheduling'}
              >
                Book Another Session
              </Button>
              <Button 
                variant="outline" 
                className="border-white/30 text-primary-foreground hover:bg-white/10"
                onClick={() => window.location.href = '/dashboard'}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>

          {/* Right Column - Booking Details */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-primary-foreground mb-6">Booking Details</h2>
                
                <div className="space-y-6">
                  {/* Service */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Service
                    </label>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-primary-foreground font-medium">Voice Coaching</div>
                          <div className="text-sm text-primary-foreground/70">1h 45min</div>
                        </div>
                        <div className="text-lg font-bold text-primary-foreground">$30</div>
                      </div>
                    </div>
                  </div>

                  {/* Number of People */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Number of People
                    </label>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                      <div className="text-primary-foreground">1</div>
                    </div>
                  </div>

                  {/* Instructor */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Instructor
                    </label>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                      <div>
                        <div className="text-primary-foreground font-medium">Dr. Johnson</div>
                        <div className="text-sm text-primary-foreground/70">Expert for voices</div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Location
                    </label>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                      <div>
                        <div className="text-primary-foreground font-medium">Music Building Room A</div>
                        <div className="text-sm text-primary-foreground/70">350 Spelman Lane SW, Atlanta, GA</div>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Date & Time
                    </label>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                      <div className="text-primary-foreground">06 August 2025 5:45 am</div>
                    </div>
                  </div>

                  {/* Total Price */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Total Price
                    </label>
                    <div className="text-2xl font-bold text-primary-foreground">$30 / $30</div>
                  </div>

                  {/* Booking Confirmation */}
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mt-6">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div>
                        <div className="text-green-400 font-medium">Booking Confirmed</div>
                        <div className="text-green-300 text-sm">Confirmation #GW2025-001</div>
                      </div>
                    </div>
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
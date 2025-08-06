import React, { useState } from 'react';
import { ArrowLeft, Plus, Minus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function RecurringOptions() {
  const [recurringType, setRecurringType] = useState<'Daily' | 'Weekly'>('Daily');
  const [repeatEvery, setRepeatEvery] = useState(1);
  const [endAfter, setEndAfter] = useState(1);

  const handleContinue = () => {
    window.location.href = '/booking/customer-info';
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
          {/* Left Column - Recurring Options */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="flex items-center mb-8">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-primary-foreground hover:bg-white/10 mr-4"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold text-primary-foreground">Recurring</h1>
            </div>

            {/* Recurring Type Selection */}
            <div className="flex space-x-2 mb-8">
              <Button
                variant={recurringType === 'Daily' ? 'default' : 'outline'}
                className={recurringType === 'Daily' ? 'bg-secondary text-secondary-foreground' : 'border-white/30 text-primary-foreground hover:bg-white/10'}
                onClick={() => setRecurringType('Daily')}
              >
                Daily
              </Button>
              <Button
                variant={recurringType === 'Weekly' ? 'default' : 'outline'}
                className={recurringType === 'Weekly' ? 'bg-secondary text-secondary-foreground' : 'border-white/30 text-primary-foreground hover:bg-white/10'}
                onClick={() => setRecurringType('Weekly')}
              >
                Weekly
              </Button>
            </div>

            {/* Recurring Settings */}
            <div className="space-y-8">
              {/* Repeat Every */}
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <span className="text-primary-foreground font-medium">Repeat every</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0 border-white/30 text-primary-foreground hover:bg-white/10"
                      onClick={() => setRepeatEvery(Math.max(1, repeatEvery - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-12 h-8 bg-white/10 border border-white/30 rounded flex items-center justify-center text-primary-foreground">
                      {repeatEvery}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0 border-white/30 text-primary-foreground hover:bg-white/10"
                      onClick={() => setRepeatEvery(repeatEvery + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-primary-foreground">day</span>
                </div>
              </div>

              {/* End After */}
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <span className="text-primary-foreground font-medium">End after</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0 border-white/30 text-primary-foreground hover:bg-white/10"
                      onClick={() => setEndAfter(Math.max(1, endAfter - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-12 h-8 bg-white/10 border border-white/30 rounded flex items-center justify-center text-primary-foreground">
                      {endAfter}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0 border-white/30 text-primary-foreground hover:bg-white/10"
                      onClick={() => setEndAfter(endAfter + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-primary-foreground">occurrence</span>
                </div>
              </div>

              {/* Recurring Limit */}
              <div className="bg-white/5 border border-white/20 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <span className="text-primary-foreground font-medium">Recurring occurrences limit</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-primary-foreground/70 text-sm">MIN</span>
                      <div className="w-8 h-8 bg-white/10 border border-white/30 rounded flex items-center justify-center text-primary-foreground text-sm">
                        1
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-primary-foreground/70 text-sm">MAX</span>
                      <div className="w-12 h-8 bg-white/10 border border-white/30 rounded flex items-center justify-center text-primary-foreground text-sm">
                        10
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Service Preview */}
            <div className="mt-12 flex items-center space-x-4">
              <img 
                src="/lovable-uploads/8fb52a1d-ae81-4f4e-bda6-87fcee73d57e.png" 
                alt="Voice Coaching"
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <h3 className="text-primary-foreground font-semibold text-lg">Voice Coaching</h3>
              </div>
              <div className="ml-auto">
                <Button 
                  className="bg-secondary hover:bg-secondary/90 text-secondary-foreground px-8"
                  onClick={handleContinue}
                >
                  Continue
                </Button>
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

                  {/* Recurring */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Recurring
                    </label>
                    <div className="bg-white/5 border border-white/20 rounded-lg p-3">
                      <div className="text-primary-foreground">Daily</div>
                    </div>
                  </div>

                  {/* Total Price */}
                  <div>
                    <label className="flex items-center text-sm font-medium text-primary-foreground/80 mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Total Price
                    </label>
                    <div className="text-2xl font-bold text-primary-foreground">$30</div>
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
import React, { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DateTimeSelection() {
  const [selectedDate, setSelectedDate] = useState<number | null>(6);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'Week' | 'Month'>('Week');

  const timeSlots = [
    '5:00 am - 6:45 am', '5:15 am - 7:00 am', '5:30 am - 7:15 am', '5:45 am - 7:30 am',
    '6:00 am - 7:45 am', '6:15 am - 8:00 am', '9:00 am - 10:45 am', '9:15 am - 11:00 am',
    '9:30 am - 11:15 am', '9:45 am - 11:30 am', '10:00 am - 11:45 am', '10:15 am - 12:00 pm',
    '10:30 am - 12:15 pm', '10:45 am - 12:30 pm', '11:00 am - 12:45 pm', '11:15 am - 1:00 pm',
    '11:30 am - 1:15 pm', '11:45 am - 1:30 pm', '12:00 pm - 1:45 pm', '12:15 pm - 2:00 pm'
  ];

  const dates = [
    { day: 'Wed', date: 6, available: true },
    { day: 'Thu', date: 7, available: true },
    { day: 'Fri', date: 8, available: true },
    { day: 'Sat', date: 9, available: true },
    { day: 'Sun', date: 10, available: false },
    { day: 'Mon', date: 11, available: true },
    { day: 'Tue', date: 12, available: true }
  ];

  const serviceParam = new URLSearchParams(window.location.search).get('service') || '';
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    const params = new URLSearchParams(window.location.search);
    params.set('service', serviceParam);
    params.set('date', String(selectedDate ?? ''));
    params.set('time', time);
    window.location.href = `/booking/recurring?${params.toString()}`;
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
          {/* Left Column - Date & Time Selection */}
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
              <h1 className="text-3xl font-bold text-primary-foreground">Choose Date & Time</h1>
            </div>

            {/* Date Selection Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-2">
              <Button
                variant={viewMode === 'Week' ? 'default' : 'outline'}
                className={viewMode === 'Week' ? 'bg-blue-400 text-white' : 'border-white/30 text-primary-foreground hover:bg-white/10'}
                onClick={() => setViewMode('Week')}
              >
                  Week
                </Button>
              <Button
                variant={viewMode === 'Month' ? 'default' : 'outline'}
                className={viewMode === 'Month' ? 'bg-blue-400 text-white' : 'border-white/30 text-primary-foreground hover:bg-white/10'}
                onClick={() => setViewMode('Month')}
              >
                  Month
                </Button>
              </div>

              <div className="flex items-center space-x-4 text-primary-foreground">
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">Aug 6, 2025 - Aug 12, 2025</span>
                <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-7 gap-4 mb-8">
              {dates.map((dateInfo) => (
                <div key={dateInfo.date} className="text-center">
                  <div className="text-sm text-primary-foreground/70 mb-2">{dateInfo.day}</div>
                  <Button
                    variant={selectedDate === dateInfo.date ? 'default' : 'outline'}
                    className={`w-full h-16 text-lg ${
                      selectedDate === dateInfo.date 
                        ? 'bg-blue-400 text-white' 
                        : dateInfo.available 
                          ? 'border-white/30 text-primary-foreground hover:bg-white/10' 
                          : 'border-white/20 text-primary-foreground/40 cursor-not-allowed'
                    }`}
                    onClick={() => dateInfo.available && setSelectedDate(dateInfo.date)}
                    disabled={!dateInfo.available}
                  >
                    {dateInfo.date}
                  </Button>
                </div>
              ))}
            </div>

            {/* Time Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-primary-foreground">Choose Time</h2>
                <Select defaultValue="new-york">
                  <SelectTrigger className="w-40 bg-white/10 border-white/30 text-primary-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-york">New York</SelectItem>
                    <SelectItem value="atlanta">Atlanta</SelectItem>
                    <SelectItem value="chicago">Chicago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Slots Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    className={`h-12 text-sm ${
                      selectedTime === time 
                        ? 'bg-blue-400 text-white' 
                        : 'border-white/30 text-primary-foreground hover:bg-white/10'
                    }`}
                    onClick={() => handleTimeSelect(time)}
                  >
                    {time}
                  </Button>
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
                      <div className="text-primary-foreground">06 August 2025</div>
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
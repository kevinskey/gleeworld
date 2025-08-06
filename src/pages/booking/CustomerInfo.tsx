import React, { useState } from 'react';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CustomerInfo() {
  const [activeTab, setActiveTab] = useState<'CUSTOMER INFO' | 'EXISTING ACCOUNT'>('CUSTOMER INFO');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    allergies: '',
    createAccount: false,
    acceptTerms: false
  });

  const handleContinue = () => {
    window.location.href = '/booking/confirmation';
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
          {/* Left Column - Customer Info Form */}
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
              <h1 className="text-3xl font-bold text-primary-foreground">Customer Info</h1>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-white/20 mb-8">
              <button
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'CUSTOMER INFO'
                    ? 'text-secondary border-b-2 border-secondary'
                    : 'text-primary-foreground/70 hover:text-primary-foreground'
                }`}
                onClick={() => setActiveTab('CUSTOMER INFO')}
              >
                CUSTOMER INFO
              </button>
              <button
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'EXISTING ACCOUNT'
                    ? 'text-secondary border-b-2 border-secondary'
                    : 'text-primary-foreground/70 hover:text-primary-foreground'
                }`}
                onClick={() => setActiveTab('EXISTING ACCOUNT')}
              >
                EXISTING ACCOUNT
              </button>
            </div>

            {/* Customer Info Form */}
            {activeTab === 'CUSTOMER INFO' && (
              <div className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-2">
                      * First Name
                    </label>
                    <Input
                      placeholder="Enter first name"
                      value={formData.firstName}
                      onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      className="bg-white/10 border-white/30 text-primary-foreground placeholder:text-white/60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-2">
                      * Last Name
                    </label>
                    <Input
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      className="bg-white/10 border-white/30 text-primary-foreground placeholder:text-white/60"
                    />
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="Enter email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-white/10 border-white/30 text-primary-foreground placeholder:text-white/60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-2">
                      Phone
                    </label>
                    <div className="flex">
                      <Select defaultValue="+1">
                        <SelectTrigger className="w-20 bg-white/10 border-white/30 text-primary-foreground mr-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+1">+1</SelectItem>
                          <SelectItem value="+44">+44</SelectItem>
                          <SelectItem value="+33">+33</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Example (201) 555-0123"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="flex-1 bg-white/10 border-white/30 text-primary-foreground placeholder:text-white/60"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Creation Option */}
                <div className="bg-white/5 border border-white/20 rounded-lg p-4">
                  <h3 className="text-primary-foreground font-medium mb-3">Save your information (Optional)</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.createAccount}
                      onCheckedChange={(checked) => setFormData({...formData, createAccount: !!checked})}
                      className="border-white/30"
                    />
                    <span className="text-primary-foreground/80 text-sm">
                      Create an account and make your next booking easier
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-2">
                      We are coming to your address!
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-foreground/60 h-4 w-4" />
                      <Input
                        placeholder="Enter your address here"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="pl-10 bg-white/10 border-white/30 text-primary-foreground placeholder:text-white/60"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-2">
                      Which vocal care method would you like us to bring along?
                    </label>
                    <Select>
                      <SelectTrigger className="bg-white/10 border-white/30 text-primary-foreground">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warm-ups">Vocal Warm-ups</SelectItem>
                        <SelectItem value="breathing">Breathing Exercises</SelectItem>
                        <SelectItem value="scales">Scale Practice</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Terms and Allergies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-2">
                      Confirm terms and conditions
                    </label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={formData.acceptTerms}
                        onCheckedChange={(checked) => setFormData({...formData, acceptTerms: !!checked})}
                        className="border-white/30"
                      />
                      <span className="text-primary-foreground/80 text-sm">
                        https://yourtermsandcondition.com
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-foreground mb-2">
                      * Allergies
                    </label>
                    <Textarea
                      placeholder="Do you have any allergies?"
                      value={formData.allergies}
                      onChange={(e) => setFormData({...formData, allergies: e.target.value})}
                      className="bg-white/10 border-white/30 text-primary-foreground placeholder:text-white/60 resize-none h-20"
                    />
                  </div>
                </div>
              </div>
            )}

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
                  className="bg-blue-400 hover:bg-blue-500 text-white px-8"
                  onClick={handleContinue}
                  disabled={!formData.firstName || !formData.lastName || !formData.acceptTerms}
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
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import LandingPage from '@/pages/LandingPage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, Music, Calendar, Shirt, DollarSign, Users } from 'lucide-react';
import { ModuleDisplay } from '@/components/dashboard/ModuleDisplay';

const mockMessages = [
  { id: 1, color: 'bg-red-500', text: 'Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum' },
  { id: 2, color: 'bg-blue-500', text: 'Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum' },
  { id: 3, color: 'bg-pink-500', text: 'Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum' },
  { id: 4, color: 'bg-green-500', text: 'Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum' },
  { id: 5, color: 'bg-yellow-500', text: 'Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum Lorem ipsum' },
];

const moduleOptions = [
  { id: 'email', name: 'EMAIL', icon: Mail },
  { id: 'music-library', name: 'MUSIC LIBRARY', icon: Music },
  { id: 'calendar', name: 'CALENDAR', icon: Calendar },
  { id: 'wardrobe', name: 'WARDROBE', icon: Shirt },
  { id: 'finances', name: 'FINANCES', icon: DollarSign },
  { id: 'attendance', name: 'ATTENDANCE', icon: Users },
];

export const HomeRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  const [selectedModule, setSelectedModule] = useState<string>('email');

  // Show loading while auth is being determined for logged in users
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading GleeWorld..." />
      </div>
    );
  }

  // For authenticated users, show the mockup design
  if (user) {
    const getUserDisplayName = () => {
      return userProfile?.full_name || user?.email?.split('@')[0] || 'User';
    };

    const getUserRole = () => {
      if (userProfile?.is_super_admin) return 'Super Admin';
      if (userProfile?.is_admin) return 'Admin';
      return userProfile?.role || 'Member';
    };

    const getUserInitials = () => {
      const name = getUserDisplayName();
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border bg-muted/20 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Logo */}
            <div className="flex items-center space-x-3">
              <div className="text-xs font-bold">
                <div>SPELMAN</div>
                <div>COLLEGE</div>
                <div>GLEE</div>
                <div>CLUB</div>
              </div>
              <div className="text-2xl font-bold">GLEE WORLD</div>
              <div className="text-sm text-muted-foreground">SPELMAN COLLEGE GLEE CLUB</div>
            </div>
            
            {/* Center */}
            <div className="text-4xl font-bold">HEADER</div>
            
            {/* Right - User Info */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold">{getUserDisplayName()}</div>
                <div className="text-sm text-muted-foreground">{getUserRole()}</div>
              </div>
              <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {getUserInitials()}
              </div>
              <div className="text-6xl font-bold text-muted-foreground/20">S1</div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6 p-6">
          {/* Left Column - Messages */}
          <Card className="border-2 border-black">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                MESSAGES
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockMessages.map((message) => (
                <div key={message.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                  <div className={`w-4 h-4 ${message.color} rounded`}></div>
                  <span className="text-sm">{message.text}</span>
                </div>
              ))}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-bold italic">Old Messages</h3>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Module Selector */}
          <Card className="border-2 border-black">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold italic">Module Selector</CardTitle>
              <p className="text-sm text-muted-foreground italic">This element scrolls to show modules</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {moduleOptions.map((module) => (
                <Button
                  key={module.id}
                  onClick={() => setSelectedModule(module.id)}
                  variant={selectedModule === module.id ? "default" : "secondary"}
                  className={`w-full justify-start text-left font-bold ${
                    selectedModule === module.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {module.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Full Width Bottom Section - Selected Module */}
        <div className="px-6 pb-6">
          <Card className="border-2 border-black bg-muted/30 min-h-96">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-6xl font-bold mb-4">FULL MODULE HERE</h2>
                <h3 className="text-4xl font-bold mb-6">WHEN SELECTED ABOVE</h3>
                <p className="text-xl text-red-600 font-bold">
                  THIS MODULE VARIES IN LENGTH<br />
                  DEPENDING ON THE NEEDS<br />
                  OF THE MODEL ELEMENTS
                </p>
              </div>
              
              {/* Actual Module Content */}
              <div className="mt-8">
                <ModuleDisplay selectedModule={selectedModule} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="bg-muted/50 border-t border-border py-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold">FOOTER</h2>
          </div>
        </div>
      </div>
    );
  }

  // For public users, show the public landing page
  return <LandingPage />;
};
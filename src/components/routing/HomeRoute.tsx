import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mail, Music, Calendar, Shirt, DollarSign, Users, Send, X } from 'lucide-react';
import { ModuleDisplay } from '@/components/dashboard/ModuleDisplay';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { UserHero } from '@/components/dashboard/UserHero';
import { supabase } from '@/integrations/supabase/client';

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
  const [showMessageCompose, setShowMessageCompose] = useState(false);
  const [selectedRecipientType, setSelectedRecipientType] = useState<string>('');
  const [selectedIndividual, setSelectedIndividual] = useState<string>('');
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch real members from database
  useEffect(() => {
    const fetchMembers = async () => {
      if (!user) return;
      
      setLoadingMembers(true);
      try {
        const { data, error } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, email, role, voice_part, exec_board_role')
          .not('full_name', 'is', null)
          .order('full_name');

        if (error) {
          console.error('Error fetching members:', error);
          return;
        }

        setMembers(data || []);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    if (user && showMessageCompose && selectedRecipientType === 'individual') {
      fetchMembers();
    }
  }, [user, showMessageCompose, selectedRecipientType]);

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
        <UniversalHeader />
        
        {/* User Hero Section */}
        <UserHero />

        {/* Two Column Layout - stacks on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Left Column - Messages */}
          <Card className="border-2 border-black">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-full bg-black hover:bg-black/80 p-0"
                  onClick={() => setShowMessageCompose(!showMessageCompose)}
                >
                  {showMessageCompose ? (
                    <X className="h-4 w-4 text-white" />
                  ) : (
                    <Plus className="h-4 w-4 text-white" />
                  )}
                </Button>
                MESSAGES
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {showMessageCompose ? (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Send To:</label>
                    <Select value={selectedRecipientType} onValueChange={(value) => {
                      setSelectedRecipientType(value);
                      if (value !== 'individual') {
                        setSelectedIndividual(''); // Clear individual selection when changing recipient type
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipients..." />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-background border shadow-lg">
                        <SelectItem value="all-members">All Members</SelectItem>
                        <SelectItem value="executive-board">Executive Board</SelectItem>
                        <SelectItem value="section-leaders">Section Leaders</SelectItem>
                        <SelectItem value="alumnae">Alumnae</SelectItem>
                        <SelectItem value="individual">Individual Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Individual Member Selector - only show when "individual" is selected */}
                  {selectedRecipientType === 'individual' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Member:</label>
                      <Select value={selectedIndividual} onValueChange={setSelectedIndividual}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a member..." />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-background border shadow-lg">
                          {loadingMembers ? (
                            <SelectItem value="" disabled>Loading members...</SelectItem>
                          ) : members.length > 0 ? (
                            members.map((member) => {
                              const displayText = `${member.full_name}${member.voice_part ? ` (${member.voice_part})` : ''}${member.exec_board_role ? ` - ${member.exec_board_role}` : ''}`;
                              return (
                                <SelectItem key={member.user_id} value={member.user_id}>
                                  {displayText}
                                </SelectItem>
                              );
                            })
                          ) : (
                            <SelectItem value="" disabled>No members found</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message Type:</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select message type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sms">SMS Text Message</SelectItem>
                        <SelectItem value="internal">Internal Message</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject:</label>
                    <Input placeholder="Enter subject..." />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message:</label>
                    <Textarea 
                      placeholder="Type your message here..." 
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button className="flex-1" size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setShowMessageCompose(false);
                      setSelectedRecipientType('');
                      setSelectedIndividual('');
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {mockMessages.map((message) => (
                    <div key={message.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                      <div className={`w-4 h-4 ${message.color} rounded`}></div>
                      <span className="text-sm">{message.text}</span>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-bold italic">Old Messages</h3>
                  </div>
                </>
              )}
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

  // For public users, show the Glee World landing page with audition card
  return <GleeWorldLanding />;
};
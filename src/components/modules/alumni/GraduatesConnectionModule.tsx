import { useState, useEffect } from 'react';
import { ModuleWrapper } from '@/components/modules/ModuleWrapper';
import { GraduationCap, MessageSquare, Mail, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { ModuleProps } from '@/types/unified-modules';
import { toast } from 'sonner';

interface Graduate {
  id: string;
  full_name: string;
  profile_image_url?: string;
  major?: string;
  voice_part?: string;
  graduation_year?: number;
}

export function GraduatesConnectionModule({ user, isFullPage }: ModuleProps) {
  const [graduates, setGraduates] = useState<Graduate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraduates();
  }, []);

  const fetchGraduates = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('id, full_name, major, voice_part, graduation_year')
        .eq('role', 'member')
        .gte('graduation_year', currentYear)
        .lte('graduation_year', currentYear + 1)
        .order('full_name');

      if (error) throw error;
      setGraduates(data || []);
    } catch (error) {
      console.error('Error fetching graduates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (graduateName: string) => {
    toast.success(`Connection request sent to ${graduateName}!`);
  };

  const mentorshipOpportunities = [
    { title: 'Career Guidance', description: 'Share your professional experience and advice' },
    { title: 'Grad School Tips', description: 'Help with applications and school selection' },
    { title: 'Industry Networking', description: 'Connect seniors with professionals in their field' },
    { title: 'Life After Spelman', description: 'General mentorship on post-graduation life' }
  ];

  return (
    <ModuleWrapper
      title="Connect with Graduates"
      icon={GraduationCap}
    >
      <div className="space-y-6">
        {/* Mentorship Call-to-Action */}
        <Card className="bg-gradient-to-r from-indigo-500/20 via-purple-500/10 to-background border-indigo-500/30">
          <CardHeader>
            <CardTitle>Become a Mentor</CardTitle>
            <CardDescription>
              Support our graduating seniors as they transition into the next chapter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {mentorshipOpportunities.map((opp) => (
                <div key={opp.title} className="p-3 rounded-lg border bg-card/50 text-center">
                  <p className="font-semibold text-sm">{opp.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opp.description}</p>
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full sm:w-auto">
              Sign Up as a Mentor
            </Button>
          </CardContent>
        </Card>

        {/* Current Seniors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Class of {new Date().getFullYear()} Seniors
            </h3>
            <Badge variant="secondary">{graduates.length} members</Badge>
          </div>

          {graduates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {graduates.map((graduate) => (
                <Card key={graduate.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={graduate.profile_image_url || undefined} />
                        <AvatarFallback>
                          {graduate.full_name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{graduate.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{graduate.major || 'Major TBD'}</p>
                        {graduate.voice_part && (
                          <Badge variant="outline" className="mt-1 text-xs">{graduate.voice_part}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => handleConnect(graduate.full_name)}>
                        <MessageSquare className="h-3 w-3" />
                        Connect
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1">
                        <Mail className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No current seniors found in the system.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Senior Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Senior Send-Off Celebration</p>
                  <p className="text-sm text-muted-foreground">April 28, 2025</p>
                </div>
                <Button size="sm">RSVP</Button>
              </li>
              <li className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Alumni-Senior Networking Mixer</p>
                  <p className="text-sm text-muted-foreground">May 5, 2025</p>
                </div>
                <Button size="sm">RSVP</Button>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ModuleWrapper>
  );
}

export default GraduatesConnectionModule;

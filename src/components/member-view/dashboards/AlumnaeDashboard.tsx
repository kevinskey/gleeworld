import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Bell, 
  Music, 
  BookOpen,
  Clock,
  Award,
  Users,
  Heart,
  MapPin,
  GraduationCap,
  Star
} from "lucide-react";

interface AlumnaeDashboardProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at: string;
  };
}

export const AlumnaeDashboard = ({ user }: AlumnaeDashboardProps) => {
  // Mock data for alumnae dashboard
  const alumnaeData = {
    membershipYears: {
      start: '2015',
      end: '2019',
      total: 4
    },
    performances: [
      {
        id: '1',
        title: 'Spring Concert 2019',
        date: '2019-04-15',
        role: 'Alto Section Leader'
      },
      {
        id: '2',
        title: 'Holiday Concert 2018',
        date: '2018-12-10',
        role: 'Soloist'
      }
    ],
    achievements: [
      {
        id: '1',
        title: 'Outstanding Leadership Award',
        year: '2019',
        description: 'Exceptional leadership as Alto Section Leader'
      },
      {
        id: '2',
        title: 'Perfect Attendance Award',
        year: '2018',
        description: 'Attended all rehearsals and performances'
      }
    ],
    upcomingAlumnaeEvents: [
      {
        id: '1',
        title: 'Annual Alumnae Reunion',
        date: '2024-03-15',
        time: '2:00 PM',
        location: 'Spelman Campus'
      },
      {
        id: '2',
        title: 'Spring Concert Alumni Performance',
        date: '2024-04-20',
        time: '7:00 PM',
        location: 'Auditorium'
      }
    ],
    currentEvents: [
      {
        id: '1',
        title: 'Spring Concert 2024',
        date: '2024-01-25',
        time: '7:00 PM',
        location: 'Auditorium'
      }
    ],
    networkingOpportunities: [
      {
        id: '1',
        title: 'Professional Networking Mixer',
        date: '2024-02-10',
        type: 'networking'
      },
      {
        id: '2',
        title: 'Career Mentorship Program',
        date: 'Ongoing',
        type: 'mentorship'
      }
    ]
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Membership Overview Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Membership History</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{alumnaeData.membershipYears.total} Years</div>
          <p className="text-xs text-muted-foreground">
            {alumnaeData.membershipYears.start} - {alumnaeData.membershipYears.end}
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Alumnae Member
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Achievements</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{alumnaeData.achievements.length}</div>
          <p className="text-xs text-muted-foreground">Awards received</p>
          <div className="mt-2 space-y-1">
            {alumnaeData.achievements.map((achievement) => (
              <div key={achievement.id} className="text-xs">
                <div className="font-medium">{achievement.title}</div>
                <div className="text-muted-foreground">{achievement.year}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alumnae Events Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alumnae Events</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{alumnaeData.upcomingAlumnaeEvents.length}</div>
          <p className="text-xs text-muted-foreground">Upcoming events</p>
          <div className="mt-2 space-y-1">
            {alumnaeData.upcomingAlumnaeEvents.map((event) => (
              <div key={event.id} className="text-xs">
                <div className="font-medium">{event.title}</div>
                <div className="text-muted-foreground">{event.date}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Glee Club Events Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Events</CardTitle>
          <Music className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{alumnaeData.currentEvents.length}</div>
          <p className="text-xs text-muted-foreground">Available to attend</p>
          <div className="mt-2 space-y-1">
            {alumnaeData.currentEvents.map((event) => (
              <div key={event.id} className="text-xs">
                <div className="font-medium">{event.title}</div>
                <div className="text-muted-foreground">{event.date} at {event.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Networking Opportunities Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Networking</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{alumnaeData.networkingOpportunities.length}</div>
          <p className="text-xs text-muted-foreground">Opportunities available</p>
          <div className="mt-2 space-y-1">
            {alumnaeData.networkingOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="text-xs">
                <div className="font-medium">{opportunity.title}</div>
                <Badge variant="outline" className="text-xs mt-1">
                  {opportunity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legacy Connection Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Legacy Connection</CardTitle>
          <Heart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Mentorship Status</span>
              <Badge variant="outline">Active Mentor</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Alumni Network</span>
              <Badge variant="outline">Connected</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Annual Giving</span>
              <Badge variant="outline">Contributor</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance History Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
          <CardDescription>Notable performances during membership</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alumnaeData.performances.map((performance) => (
              <div key={performance.id} className="flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{performance.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {performance.role} • {performance.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alumnae Resources Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alumnae Resources</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Directory Access</span>
              <Badge variant="outline">Available</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Event Archives</span>
              <Badge variant="outline">View Only</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Photo Library</span>
              <Badge variant="outline">Access</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
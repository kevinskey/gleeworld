import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SpiritualReflectionsCard } from "../SpiritualReflectionsCard";
import { usePublicGleeWorldEvents } from "@/hooks/usePublicGleeWorldEvents";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { 
  Calendar, 
  CheckCircle, 
  DollarSign, 
  Bell, 
  Music, 
  BookOpen,
  Clock,
  Award,
  ArrowRight,
  MapPin,
  GraduationCap
} from "lucide-react";

interface MemberDashboardProps {
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

export const MemberDashboard = ({ user }: MemberDashboardProps) => {
  const navigate = useNavigate();
  const { events: upcomingEvents, loading: eventsLoading } = usePublicGleeWorldEvents();
  
  // Real data - to be connected to actual data sources
  const memberData = {
    attendance: {
      total: 0,
      present: 0,
      percentage: 0
    },
    contracts: [],
    payments: [],
    announcements: []
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* SCGC Handbook Card */}
      <Card 
        className="cursor-pointer hover:shadow-md transition-all duration-200 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10" 
        onClick={() => navigate('/handbook')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base md:text-lg font-semibold text-primary">SCGC Handbook</CardTitle>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold text-primary">2024</div>
          <p className="text-sm md:text-base text-muted-foreground">Official member guide</p>
          <div className="mt-3 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-primary/10">
            <div className="text-sm font-medium text-foreground mb-1">Quick Access</div>
            <div className="text-xs text-muted-foreground">
              • Requirements & policies<br/>
              • Traditions & history<br/>
              • Take handbook exam
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base md:text-lg font-semibold">Attendance</CardTitle>
          <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl md:text-4xl font-bold">{memberData.attendance.percentage}%</div>
          <p className="text-sm md:text-base text-muted-foreground">
            {memberData.attendance.present} of {memberData.attendance.total} rehearsals
          </p>
          <Progress value={memberData.attendance.percentage} className="mt-2" />
        </CardContent>
      </Card>

      {/* Upcoming Events Card */}
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/calendar')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base md:text-lg font-semibold">Upcoming Events</CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="text-3xl md:text-4xl font-bold">{upcomingEvents.length}</div>
              <p className="text-sm md:text-base text-muted-foreground">Public events</p>
              <ScrollArea className="mt-3 h-20">
                <div className="space-y-2 pr-4">
                  {upcomingEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="text-sm md:text-base border-l-2 border-primary/30 pl-3">
                      <div className="font-semibold line-clamp-1">{event.title}</div>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_date), 'MMM dd, h:mm a')}
                        {event.location && (
                          <>
                            <MapPin className="h-3 w-3 ml-1" />
                            <span className="line-clamp-1">{event.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {upcomingEvents.length === 0 && (
                    <div className="text-center py-2 text-muted-foreground">
                      <Calendar className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">No upcoming events</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contracts Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contracts</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{memberData.contracts.length}</div>
          <p className="text-xs text-muted-foreground">Active contracts</p>
          <div className="mt-2 space-y-1">
            {memberData.contracts.map((contract) => (
              <div key={contract.id} className="flex items-center justify-between text-xs">
                <span className="font-medium truncate">{contract.title}</span>
                <Badge variant="outline" className="text-xs">
                  {contract.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payments</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${memberData.payments.reduce((sum, p) => sum + p.amount, 0)}</div>
          <p className="text-xs text-muted-foreground">Total pending</p>
          <div className="mt-2 space-y-1">
            {memberData.payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between text-xs">
                <span className="font-medium">${payment.amount}</span>
                <Badge variant="outline" className="text-xs">
                  {payment.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Attended Weekly Rehearsal</p>
                <p className="text-xs text-muted-foreground">January 18, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Signed Spring Concert Contract</p>
                <p className="text-xs text-muted-foreground">January 15, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Music className="h-5 w-5 text-purple-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Accessed Sheet Music Library</p>
                <p className="text-xs text-muted-foreground">January 14, 2024</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Card - Redesigned */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-bl-full"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-lg font-bold text-primary">Latest News</CardTitle>
            <p className="text-sm text-muted-foreground">Club announcements</p>
          </div>
          <div className="relative">
            <Bell className="h-6 w-6 text-primary" />
            {memberData.announcements.length > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white text-[10px]">
                {memberData.announcements.length}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {memberData.announcements.length > 0 ? (
            memberData.announcements.map((announcement) => (
              <div key={announcement.id} className="p-3 bg-gradient-to-r from-primary/5 to-transparent rounded-lg border-l-3 border-primary">
                <div className="font-semibold text-foreground mb-1">{announcement.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-2 mb-2">{announcement.content}</div>
                <div className="text-xs text-primary font-medium">{announcement.date}</div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No announcements yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spiritual Reflections Card */}
      <SpiritualReflectionsCard />
    </div>
  );
};
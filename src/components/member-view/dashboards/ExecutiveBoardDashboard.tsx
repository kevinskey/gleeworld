import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  CheckCircle, 
  DollarSign, 
  Bell, 
  Music, 
  BookOpen,
  Clock,
  Award,
  Users,
  TrendingUp,
  Settings,
  Star
} from "lucide-react";

interface ExecutiveBoardDashboardProps {
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

export const ExecutiveBoardDashboard = ({ user }: ExecutiveBoardDashboardProps) => {
  // Mock data for executive board dashboard
  const execData = {
    attendance: {
      total: 24,
      present: 23,
      percentage: 96
    },
    teamMetrics: {
      totalMembers: 45,
      activeMembers: 42,
      attendanceRate: 89
    },
    upcomingEvents: [
      {
        id: '1',
        title: 'Executive Board Meeting',
        date: '2024-01-19',
        time: '4:00 PM',
        location: 'Conference Room'
      },
      {
        id: '2',
        title: 'Weekly Rehearsal',
        date: '2024-01-20',
        time: '5:00 PM',
        location: 'Music Hall'
      },
      {
        id: '3',
        title: 'Spring Concert',
        date: '2024-01-25',
        time: '7:00 PM',
        location: 'Auditorium'
      }
    ],
    managementTasks: [
      {
        id: '1',
        title: 'Review Concert Program',
        priority: 'high',
        dueDate: '2024-01-22'
      },
      {
        id: '2',
        title: 'Approve Budget Request',
        priority: 'medium',
        dueDate: '2024-01-24'
      }
    ],
    budgetOverview: {
      allocated: 5000,
      spent: 3200,
      remaining: 1800
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Personal Attendance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Attendance</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{execData.attendance.percentage}%</div>
          <p className="text-xs text-muted-foreground">
            {execData.attendance.present} of {execData.attendance.total} events
          </p>
          <Progress value={execData.attendance.percentage} className="mt-2" />
        </CardContent>
      </Card>

      {/* Team Overview Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team Overview</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{execData.teamMetrics.activeMembers}</div>
          <p className="text-xs text-muted-foreground">
            Active members ({execData.teamMetrics.attendanceRate}% attendance)
          </p>
          <Progress value={execData.teamMetrics.attendanceRate} className="mt-2" />
        </CardContent>
      </Card>

      {/* Management Tasks Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Management Tasks</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{execData.managementTasks.length}</div>
          <p className="text-xs text-muted-foreground">Pending tasks</p>
          <div className="mt-2 space-y-2">
            {execData.managementTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between text-xs">
                <span className="font-medium truncate">{task.title}</span>
                <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                  {task.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budget Overview Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Overview</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${execData.budgetOverview.remaining}</div>
          <p className="text-xs text-muted-foreground">Remaining budget</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Allocated</span>
              <span>${execData.budgetOverview.allocated}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Spent</span>
              <span>${execData.budgetOverview.spent}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{execData.upcomingEvents.length}</div>
          <p className="text-xs text-muted-foreground">Next 7 days</p>
          <div className="mt-2 space-y-1">
            {execData.upcomingEvents.slice(0, 2).map((event) => (
              <div key={event.id} className="text-xs">
                <div className="font-medium">{event.title}</div>
                <div className="text-muted-foreground">{event.date} at {event.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leadership Tools Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Leadership Tools</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Member Directory</span>
              <Badge variant="outline">Access</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Event Planning</span>
              <Badge variant="outline">Manage</Badge>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Performance Reports</span>
              <Badge variant="outline">View</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Board Activity Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Executive Board Activity</CardTitle>
          <CardDescription>Recent leadership actions and updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Approved Spring Concert Budget</p>
                <p className="text-xs text-muted-foreground">January 18, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Conducted Member Performance Review</p>
                <p className="text-xs text-muted-foreground">January 17, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">Scheduled Board Meeting</p>
                <p className="text-xs text-muted-foreground">January 16, 2024</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-Specific Metrics Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{user.exec_board_role} Metrics</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Tasks Completed</span>
              <span className="font-medium">15/18</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Team Satisfaction</span>
              <span className="font-medium">94%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Project Progress</span>
              <span className="font-medium">87%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
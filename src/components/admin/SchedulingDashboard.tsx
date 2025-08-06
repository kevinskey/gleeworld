import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Settings,
  MapPin,
  Phone,
  Star,
  Bell
} from "lucide-react";

interface Appointment {
  id: string;
  date: string;
  time: string;
  service: string;
  client: string;
  status: 'approved' | 'pending' | 'cancelled';
  avatar?: string;
}

const mockAppointments: Appointment[] = [
  {
    id: '1',
    date: 'August 7, 2025',
    time: '10:30 AM',
    service: 'THE STANDARD GENTLEMAN HAIRCUT',
    client: 'Korey Collins',
    status: 'approved'
  },
  {
    id: '2',
    date: 'August 16, 2025',
    time: '8:30 AM',
    service: 'LITTLE KINGS (BOYS & TODDLERS) HAIRCUT',
    client: 'Rai Tubbs',
    status: 'approved'
  },
  {
    id: '3',
    date: 'August 6, 2025',
    time: '1:00 PM',
    service: 'MENS SENIORS CITIZEN 60 YEARS AND UP',
    client: 'Eldridge Edgecombe',
    status: 'approved'
  },
  {
    id: '4',
    date: 'August 6, 2025',
    time: '11:00 AM',
    service: 'MENS SENIORS CITIZEN 60 YEARS AND UP',
    client: 'Johnathan Bowens',
    status: 'approved'
  }
];

export const SchedulingDashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('Current Week');

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              ← Back to Agency Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-destructive rounded-full"></div>
              <span className="text-sm font-medium">Well-Launched</span>
            </div>
            <Button size="sm" className="bg-primary text-primary-foreground">
              <Bell className="h-4 w-4 mr-1" />
              Share Booking
            </Button>
            <div className="relative">
              <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                379
              </div>
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-16 bg-primary text-primary-foreground flex flex-col items-center py-4 space-y-6">
          <div className="w-8 h-8 bg-primary-foreground/20 rounded-lg flex items-center justify-center">
            <Calendar className="h-4 w-4" />
          </div>
          <nav className="flex flex-col space-y-4">
            <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-2">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-2">
              <Clock className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-2">
              <Users className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-2">
              <Users className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-2">
              <MapPin className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-2">
              <DollarSign className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-2">
              <Star className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 p-2">
              <Settings className="h-5 w-5" />
            </Button>
          </nav>
        </div>

        {/* Main Dashboard */}
        <div className="flex-1 p-6">
          {/* Welcome Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Hello, Admin.</h1>
            <p className="text-muted-foreground">Welcome to your GleeWorld scheduling dashboard.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* New Customers */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-sm text-muted-foreground">New Customers</CardDescription>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">2</CardTitle>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Current Week</div>
                    <div className="flex items-center text-xs text-destructive">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      66.67% Decrease
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-16 flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <path
                      d="M5,35 Q25,10 45,20 T85,15"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-sm text-muted-foreground">Revenue</CardDescription>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">$1,170.00</CardTitle>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Current Week</div>
                    <div className="flex items-center text-xs text-destructive">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      $1,000.00 Decrease
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-16 flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <path
                      d="M5,20 Q25,30 45,25 T85,35"
                      stroke="hsl(var(--destructive))"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Occupancy */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-sm text-muted-foreground">Occupancy</CardDescription>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">66.7%</CardTitle>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Current Week</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      ─ Stable
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-16 flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <path
                      d="M5,25 L95,25"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Appointments */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-sm text-muted-foreground">Appointments</CardDescription>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">80</CardTitle>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Current Week</div>
                    <div className="flex items-center text-xs text-green-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      73.9% Increase
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-sm text-muted-foreground">Appointments booked</CardDescription>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">80</CardTitle>
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    73.9% Increase
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardDescription className="text-sm text-muted-foreground">Canceled appointments</CardDescription>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">3</CardTitle>
                  <div className="flex items-center text-xs text-green-600">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    200% Increase
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Chart Section */}
          <Card className="bg-card border-border mb-8">
            <CardContent className="p-6">
              <div className="h-64 flex items-end justify-center">
                <svg className="w-full h-full" viewBox="0 0 400 200">
                  <path
                    d="M20,180 Q40,120 60,150 T100,140 Q120,100 140,120 T180,110 Q200,80 220,100 T260,95 Q280,70 300,80 T340,75 L380,180"
                    stroke="hsl(var(--destructive))"
                    strokeWidth="3"
                    fill="rgba(239, 68, 68, 0.1)"
                  />
                </svg>
              </div>
              <div className="flex justify-center mt-4 space-x-8 text-xs text-muted-foreground">
                {['S', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <span key={index}>{day}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">New Customers</div>
                <div className="text-2xl font-bold">3 <span className="text-sm text-destructive">4.5%</span></div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Returning Customers</div>
                <div className="text-2xl font-bold">64 <span className="text-sm text-green-600">95.5%</span></div>
              </div>
            </div>
          </div>

          {/* Last Booked Appointments */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Last booked appointments</CardTitle>
                <Button variant="outline" size="sm">
                  All Statuses
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-muted-foreground w-32">
                        {appointment.date} {appointment.time}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium">{appointment.service}</span>
                      </div>
                      <span className="text-muted-foreground">{appointment.client}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={appointment.status === 'approved' ? 'default' : 'secondary'}
                        className={appointment.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                      >
                        Approved
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {appointment.client.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
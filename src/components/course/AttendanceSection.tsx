import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { UserCheck, Calendar, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AttendanceSectionProps {
  courseId: string;
}

// MUS 070 Fall 2025 attendance data from spreadsheet
const mus070AttendanceData: Record<string, { rehearsalAbsences: number; performanceAbsences: number; tardies: number }> = {
  "Aaliyah Berryman": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Ajah Warren": { rehearsalAbsences: 2, performanceAbsences: 0, tardies: 2 },
  "Akayla Moore": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Alexa Turner": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Alexis Brown": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Alexis Parks": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Alicia Amoah": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Amara Abdur-Rahman": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Amaya Weddington": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 3 },
  "Amelia Paxton": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Amira Johnson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Andrea Mills": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Angel Johnson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Aria Lewis": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Ariyanna Johnson": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Ashton Jackson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Brielle Thompson": { rehearsalAbsences: 3, performanceAbsences: 0, tardies: 2 },
  "Camille Gibson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Candace Wells": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Cara McClendon": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Chelsea Ofori": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Christionna Thomas": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 1 },
  "Ciara Brown": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Ciara Wynn": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Courtney Powell": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Cyra Miller": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Daija Ballard": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Daisha Wright": { rehearsalAbsences: 2, performanceAbsences: 0, tardies: 0 },
  "Danielle Roberson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "De'Ja Mitchell": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Deja Wortham": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Destiny McClendon": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Diamond Harrington": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 1 },
  "Emani Evans": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Emoni Evans": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Erykah Truitt": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 1 },
  "Faith Cunningham": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Gionna Harris": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Imani Banks": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Imani McFadden": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "India Tate": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Isis Turner": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Iyanna Holmes": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 1 },
  "Jade Richardson": { rehearsalAbsences: 2, performanceAbsences: 0, tardies: 1 },
  "Jadyn Swinton": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Jaida Lucas": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Janai Fleming": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Jasmine Hall": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Jaya Martin": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Jayda Barnes": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 2 },
  "Jennifer Okocha": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Jillian Scott": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Jordan Green": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Jordan Wells": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Jordyn Carter": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Journee Cook": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Kaila Ferguson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Kailyn Davis": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Kamryn Riley": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Karina Mitchell": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Karrington Williams": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 1 },
  "Kennedy Adams": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Kennedi Thomas": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Kia Parker": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Kiara Jones": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Kiss Turner": { rehearsalAbsences: 6, performanceAbsences: 0, tardies: 3 },
  "Kyra Washington": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Laila Thompson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Lauren Edwards": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Leah Wilson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Legacy Brown": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "London Harris": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Madison Morgan": { rehearsalAbsences: 7, performanceAbsences: 1, tardies: 4 },
  "Makayla Foster": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Makenzie Robinson": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Malaysia Coleman": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Mariah Young": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Maya Anderson": { rehearsalAbsences: 2, performanceAbsences: 0, tardies: 1 },
  "Mia Jackson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Milan White": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Morgan James": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Nadia Lewis": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Nia Patterson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Nicole Wright": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Nyla Jenkins": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Olivia Moore": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Paris King": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Reign Alexander": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Saniya Cooper": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 1 },
  "Sydney Howard": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Taylor Ross": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Trinity Gray": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
};

export const AttendanceSection: React.FC<AttendanceSectionProps> = ({ courseId }) => {
  const { user } = useAuth();
  
  // For MUS 070, use the imported attendance data
  const isMus070 = courseId === 'mus-070';
  const userName = user?.user_metadata?.full_name || '';
  
  // Get user's attendance data if they're in MUS 070
  const userAttendance = isMus070 ? mus070AttendanceData[userName] : null;
  
  // Calculate effective absences per handbook rules
  const calculateEffectiveAbsences = (data: { rehearsalAbsences: number; performanceAbsences: number; tardies: number }) => {
    const performancePenalty = data.performanceAbsences * 2;
    const tardyPenalty = Math.max(0, Math.floor((data.tardies - 3) / 2));
    return data.rehearsalAbsences + performancePenalty + tardyPenalty;
  };
  
  const effectiveAbsences = userAttendance ? calculateEffectiveAbsences(userAttendance) : 0;
  const isDropped = effectiveAbsences >= 6;
  
  // Calculate attendance rate (assuming 30 total rehearsals in semester)
  const totalRehearsals = 30;
  const attendedRehearsals = userAttendance ? totalRehearsals - userAttendance.rehearsalAbsences : totalRehearsals;
  const attendanceRate = Math.round((attendedRehearsals / totalRehearsals) * 100);

  // If not MUS 070 or user not found in data, show generic view
  if (!isMus070 || !userAttendance) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No attendance records available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Attendance</h2>
        {isDropped ? (
          <Badge variant="destructive" className="text-lg">DROPPED</Badge>
        ) : (
          <Badge variant="outline" className="text-lg">{attendanceRate}%</Badge>
        )}
      </div>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Your Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDropped && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded-md mb-4">
              <p className="text-destructive font-semibold">
                Status: DROPPED - You have exceeded the maximum allowed absences (6+)
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Attendance Rate</span>
              <span className="font-semibold text-foreground">{attendanceRate}%</span>
            </div>
            <Progress value={attendanceRate} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{userAttendance.rehearsalAbsences}</p>
              <p className="text-sm text-muted-foreground">Rehearsal Absences</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-2">
                <AlertCircle className="h-6 w-6 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{userAttendance.performanceAbsences}</p>
              <p className="text-sm text-muted-foreground">Performance Absences</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{userAttendance.tardies}</p>
              <p className="text-sm text-muted-foreground">Tardies</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center mb-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{effectiveAbsences}</p>
              <p className="text-sm text-muted-foreground">Effective Absences</p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-semibold text-foreground">Attendance Policy:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>3 unexcused absences allowed without penalty</li>
              <li>Each additional absence: -7% from final grade</li>
              <li>Missing a performance = 2 absences</li>
              <li>Every 2 tardies beyond 3 = 1 absence</li>
              <li>6+ effective absences = DROPPED from course</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

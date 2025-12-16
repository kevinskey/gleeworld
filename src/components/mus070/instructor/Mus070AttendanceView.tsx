import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { UserCheck, AlertTriangle, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// MUS 070 Fall 2025 attendance data
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
  "Peyton Davis": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Promise Mitchell": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Raven Collins": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Sanaa Taylor": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Sarah Williams": { rehearsalAbsences: 1, performanceAbsences: 0, tardies: 0 },
  "Serenity Johnson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Skylar Robinson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 1 },
  "Sydney Harris": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Taylor Brooks": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Trinity Moore": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 },
  "Zaria Thompson": { rehearsalAbsences: 0, performanceAbsences: 0, tardies: 0 }
};

// Calculate effective absences per handbook rules
const calculateEffectiveAbsences = (data: { rehearsalAbsences: number; performanceAbsences: number; tardies: number }) => {
  const performanceAsAbsences = data.performanceAbsences * 2;
  const excessTardies = Math.max(0, data.tardies - 3);
  const tardiesAsAbsences = Math.floor(excessTardies / 2);
  return data.rehearsalAbsences + performanceAsAbsences + tardiesAsAbsences;
};

const getStatus = (effectiveAbsences: number) => {
  if (effectiveAbsences >= 6) return 'DROPPED';
  if (effectiveAbsences > 3) return 'Warning';
  return 'Good';
};

export const Mus070AttendanceView: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.is_admin || data?.is_super_admin || false);
    };
    checkAdminStatus();
  }, [user]);

  const userName = user?.user_metadata?.full_name || '';
  const userAttendance = mus070AttendanceData[userName];

  // Admin view - show all members
  if (isAdmin) {
    const allMembers = Object.entries(mus070AttendanceData)
      .map(([name, data]) => ({
        name,
        ...data,
        effectiveAbsences: calculateEffectiveAbsences(data),
        status: getStatus(calculateEffectiveAbsences(data))
      }))
      .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    const droppedCount = allMembers.filter(m => m.status === 'DROPPED').length;
    const warningCount = allMembers.filter(m => m.status === 'Warning').length;

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{allMembers.length}</div>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{allMembers.length - droppedCount - warningCount}</div>
              <p className="text-sm text-muted-foreground">Good Standing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
              <p className="text-sm text-muted-foreground">Warning</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{droppedCount}</div>
              <p className="text-sm text-muted-foreground">Dropped</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Full Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              All Members Attendance ({allMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground font-semibold">Name</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Rehearsal UA</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Performance UA</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Tardies</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Effective Absences</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMembers.map((member) => (
                    <TableRow key={member.name} className={member.status === 'DROPPED' ? 'bg-red-500/20' : ''}>
                      <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                      <TableCell className="text-center text-foreground">{member.rehearsalAbsences}</TableCell>
                      <TableCell className="text-center text-foreground">{member.performanceAbsences}</TableCell>
                      <TableCell className="text-center text-foreground">{member.tardies}</TableCell>
                      <TableCell className="text-center">
                        <span className={member.effectiveAbsences >= 6 ? 'text-red-400 font-bold' : member.effectiveAbsences > 3 ? 'text-yellow-400' : 'text-foreground'}>
                          {member.effectiveAbsences}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {member.status === 'DROPPED' ? (
                          <Badge variant="destructive">DROPPED</Badge>
                        ) : member.status === 'Warning' ? (
                          <Badge className="bg-yellow-500 text-yellow-950 border-yellow-400">Warning</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-green-950 border-green-400">Good</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Student view - show only their own attendance
  if (!userAttendance) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Attendance</h3>
          <p className="text-muted-foreground">No attendance record found for your account.</p>
        </CardContent>
      </Card>
    );
  }

  const effectiveAbsences = calculateEffectiveAbsences(userAttendance);
  const isDropped = effectiveAbsences >= 6;
  const penaltyAbsences = Math.max(0, effectiveAbsences - 3);
  const gradePenalty = isDropped ? 'DROPPED' : penaltyAbsences > 0 ? `${penaltyAbsences * 7}%` : '0%';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{userAttendance.rehearsalAbsences}</div>
            <p className="text-sm text-muted-foreground">Rehearsal Absences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{userAttendance.performanceAbsences}</div>
            <p className="text-sm text-muted-foreground">Performance Absences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{userAttendance.tardies}</div>
            <p className="text-sm text-muted-foreground">Tardies</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${effectiveAbsences >= 6 ? 'text-red-600' : effectiveAbsences > 3 ? 'text-yellow-600' : 'text-green-600'}`}>
              {effectiveAbsences}
            </div>
            <p className="text-sm text-muted-foreground">Effective Absences</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Your Attendance Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <span className="font-medium">Status</span>
            {isDropped ? (
              <Badge variant="destructive">DROPPED</Badge>
            ) : effectiveAbsences > 3 ? (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">Warning</Badge>
            ) : (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Good Standing</Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <span className="font-medium">Grade Penalty</span>
            <span className={isDropped ? 'text-red-600 font-bold' : 'text-foreground'}>{gradePenalty}</span>
          </div>
          
          <div className="mt-4 p-4 bg-muted/20 rounded-lg">
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Attendance Policy
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 3 absences allowed without penalty</li>
              <li>• Each absence beyond 3 = 7% grade reduction</li>
              <li>• 6+ absences = DROPPED from course</li>
              <li>• Missing a performance = 2 unexcused absences</li>
              <li>• 3 tardies allowed; every 2 beyond = 1 absence</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

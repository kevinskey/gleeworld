import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { UserCheck, AlertTriangle, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// MUS 070 Fall 2025 attendance data from spreadsheet
// Columns: EA-Rehearsal, UA-Rehearsal, Tardies, EA-Performance, UA-Performance
const mus070AttendanceData: Record<string, { 
  eaRehearsal: number; 
  uaRehearsal: number; 
  tardies: number; 
  eaPerformance: number; 
  uaPerformance: number;
  dropped?: boolean;
}> = {
  "Aaliyah Deere": { eaRehearsal: 11, uaRehearsal: 3, tardies: 0, eaPerformance: 4, uaPerformance: 0 },
  "Adrianna Highgate": { eaRehearsal: 7, uaRehearsal: 0, tardies: 0, eaPerformance: 0, uaPerformance: 1 },
  "Afia Amoako-Boateng": { eaRehearsal: 5, uaRehearsal: 1, tardies: 1, eaPerformance: 1, uaPerformance: 0 },
  "Ahbri Graves": { eaRehearsal: 4, uaRehearsal: 0, tardies: 2, eaPerformance: 1, uaPerformance: 1 },
  "Ainka-Amara Wiliams": { eaRehearsal: 3, uaRehearsal: 2, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Akua Peprah": { eaRehearsal: 1, uaRehearsal: 3, tardies: 10, eaPerformance: 1, uaPerformance: 0 },
  "Alejandra Adeleman": { eaRehearsal: 1, uaRehearsal: 0, tardies: 1, eaPerformance: 0, uaPerformance: 1 },
  "Alexandra (Allie) Williams": { eaRehearsal: 4, uaRehearsal: 2, tardies: 0, eaPerformance: 1, uaPerformance: 0 },
  "Allana Walker": { eaRehearsal: 2, uaRehearsal: 0, tardies: 0, eaPerformance: 3, uaPerformance: 0 },
  "Ariana Singleton": { eaRehearsal: 5, uaRehearsal: 1, tardies: 2, eaPerformance: 1, uaPerformance: 0 },
  "Ariana Swindell": { eaRehearsal: 7, uaRehearsal: 0, tardies: 1, eaPerformance: 1, uaPerformance: 0 },
  "Ashlyn White": { eaRehearsal: 2, uaRehearsal: 9, tardies: 3, eaPerformance: 0, uaPerformance: 3 },
  "Autumn Brooks": { eaRehearsal: 8, uaRehearsal: 2, tardies: 7, eaPerformance: 4, uaPerformance: 0 },
  "Ava Challenger": { eaRehearsal: 7, uaRehearsal: 1, tardies: 3, eaPerformance: 1, uaPerformance: 0 },
  "Ava Russell": { eaRehearsal: 5, uaRehearsal: 4, tardies: 1, eaPerformance: 0, uaPerformance: 0 },
  "Caitlyn Oppong": { eaRehearsal: 5, uaRehearsal: 0, tardies: 1, eaPerformance: 2, uaPerformance: 0 },
  "Cameron Tolliver": { eaRehearsal: 0, uaRehearsal: 2, tardies: 1, eaPerformance: 0, uaPerformance: 0 },
  "Camryn Williams": { eaRehearsal: 7, uaRehearsal: 4, tardies: 8, eaPerformance: 2, uaPerformance: 1 },
  "Carrington Wash": { eaRehearsal: 10, uaRehearsal: 0, tardies: 6, eaPerformance: 2, uaPerformance: 0 },
  "Carson Smedley": { eaRehearsal: 7, uaRehearsal: 1, tardies: 0, eaPerformance: 1, uaPerformance: 1 },
  "Charity Dent": { eaRehearsal: 11, uaRehearsal: 1, tardies: 3, eaPerformance: 2, uaPerformance: 0 },
  "Chloe Bennett": { eaRehearsal: 4, uaRehearsal: 2, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Dana Thompson": { eaRehearsal: 3, uaRehearsal: 1, tardies: 5, eaPerformance: 0, uaPerformance: 0 },
  "Drew Roberts": { eaRehearsal: 1, uaRehearsal: 1, tardies: 2, eaPerformance: 0, uaPerformance: 0 },
  "Elissa Jefferson": { eaRehearsal: 6, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Gabrielle Magee": { eaRehearsal: 3, uaRehearsal: 2, tardies: 0, eaPerformance: 1, uaPerformance: 0 },
  "Hannah Hunter": { eaRehearsal: 0, uaRehearsal: 1, tardies: 1, eaPerformance: 0, uaPerformance: 0 },
  "Hayley Ponds": { eaRehearsal: 3, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Imani Obuhoro": { eaRehearsal: 3, uaRehearsal: 0, tardies: 0, eaPerformance: 0, uaPerformance: 1 },
  "Isabella Vesprini": { eaRehearsal: 13, uaRehearsal: 3, tardies: 2, eaPerformance: 1, uaPerformance: 1 },
  "Jada Elyse Jones": { eaRehearsal: 4, uaRehearsal: 3, tardies: 1, eaPerformance: 0, uaPerformance: 0 },
  "Jade Washington": { eaRehearsal: 17, uaRehearsal: 6, tardies: 3, eaPerformance: 3, uaPerformance: 0 },
  "Jailah Shepherd": { eaRehearsal: 7, uaRehearsal: 0, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Jamaya Grant": { eaRehearsal: 2, uaRehearsal: 2, tardies: 6, eaPerformance: 1, uaPerformance: 1 },
  "Janiah Collier": { eaRehearsal: 4, uaRehearsal: 1, tardies: 0, eaPerformance: 2, uaPerformance: 0 },
  "Jaylin Harvey": { eaRehearsal: 1, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Jeneva Preval": { eaRehearsal: 9, uaRehearsal: 0, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Jessica Obi": { eaRehearsal: 9, uaRehearsal: 0, tardies: 1, eaPerformance: 2, uaPerformance: 0 },
  "Jewel Walker": { eaRehearsal: 4, uaRehearsal: 3, tardies: 1, eaPerformance: 1, uaPerformance: 0 },
  "Jillian (Jill) Collier": { eaRehearsal: 10, uaRehearsal: 5, tardies: 5, eaPerformance: 0, uaPerformance: 2 },
  "Jordan Lawrence": { eaRehearsal: 16, uaRehearsal: 0, tardies: 2, eaPerformance: 0, uaPerformance: 1 },
  "Jordan Marshall": { eaRehearsal: 6, uaRehearsal: 7, tardies: 8, eaPerformance: 2, uaPerformance: 0 },
  "Jordyn O'Neal": { eaRehearsal: 5, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Judy McClure-Anim": { eaRehearsal: 10, uaRehearsal: 3, tardies: 10, eaPerformance: 1, uaPerformance: 0 },
  "Julienne Angu": { eaRehearsal: 11, uaRehearsal: 4, tardies: 5, eaPerformance: 3, uaPerformance: 0 },
  "Kathryn Tucker": { eaRehearsal: 1, uaRehearsal: 3, tardies: 5, eaPerformance: 2, uaPerformance: 0 },
  "Kayla Dock": { eaRehearsal: 4, uaRehearsal: 0, tardies: 1, eaPerformance: 1, uaPerformance: 0 },
  "Kaylana Barnes": { eaRehearsal: 5, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Kaylen Coleman": { eaRehearsal: 5, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Kelsey (Kels) Korondo": { eaRehearsal: 7, uaRehearsal: 1, tardies: 1, eaPerformance: 1, uaPerformance: 2 },
  "Kendall Felton": { eaRehearsal: 5, uaRehearsal: 4, tardies: 5, eaPerformance: 1, uaPerformance: 0 },
  "Kennedi Henderson": { eaRehearsal: 5, uaRehearsal: 6, tardies: 4, eaPerformance: 0, uaPerformance: 1 },
  "Kennedy Benion": { eaRehearsal: 8, uaRehearsal: 1, tardies: 4, eaPerformance: 0, uaPerformance: 1 },
  "Kennedy Rogers": { eaRehearsal: 6, uaRehearsal: 2, tardies: 8, eaPerformance: 1, uaPerformance: 0 },
  "Kennidy Troupe": { eaRehearsal: 2, uaRehearsal: 4, tardies: 1, eaPerformance: 1, uaPerformance: 0 },
  "Kiss Turner": { eaRehearsal: 1, uaRehearsal: 4, tardies: 1, eaPerformance: 0, uaPerformance: 0, dropped: true },
  "Kyerra Shields": { eaRehearsal: 3, uaRehearsal: 0, tardies: 0, eaPerformance: 2, uaPerformance: 0 },
  "Lake Hawkins": { eaRehearsal: 3, uaRehearsal: 0, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Lauryn White": { eaRehearsal: 3, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Madison (Mattie) Morgan": { eaRehearsal: 17, uaRehearsal: 8, tardies: 0, eaPerformance: 2, uaPerformance: 1, dropped: true },
  "Madisyn Washington": { eaRehearsal: 2, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Malia Walker": { eaRehearsal: 5, uaRehearsal: 6, tardies: 0, eaPerformance: 1, uaPerformance: 0 },
  "Mia Awai-Gibbs": { eaRehearsal: 3, uaRehearsal: 6, tardies: 2, eaPerformance: 1, uaPerformance: 1 },
  "Michelle (Abigail) Johnson": { eaRehearsal: 6, uaRehearsal: 3, tardies: 3, eaPerformance: 0, uaPerformance: 0 },
  "Mikala Calhoun": { eaRehearsal: 6, uaRehearsal: 2, tardies: 7, eaPerformance: 0, uaPerformance: 0 },
  "Morgan Miller": { eaRehearsal: 4, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Mya Jones": { eaRehearsal: 0, uaRehearsal: 0, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Myah Crawford": { eaRehearsal: 3, uaRehearsal: 0, tardies: 1, eaPerformance: 2, uaPerformance: 0 },
  "Nia Ragin": { eaRehearsal: 2, uaRehearsal: 2, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Nzinga Jean": { eaRehearsal: 6, uaRehearsal: 9, tardies: 4, eaPerformance: 2, uaPerformance: 1 },
  "Olivia James": { eaRehearsal: 9, uaRehearsal: 1, tardies: 0, eaPerformance: 1, uaPerformance: 0 },
  "Onnesty Peele": { eaRehearsal: 2, uaRehearsal: 1, tardies: 2, eaPerformance: 0, uaPerformance: 0 },
  "Phoenix King": { eaRehearsal: 2, uaRehearsal: 0, tardies: 1, eaPerformance: 1, uaPerformance: 1 },
  "Rayne Stewart": { eaRehearsal: 5, uaRehearsal: 4, tardies: 3, eaPerformance: 3, uaPerformance: 0 },
  "Reagan McMichael": { eaRehearsal: 1, uaRehearsal: 4, tardies: 0, eaPerformance: 0, uaPerformance: 1 },
  "Reed Smith": { eaRehearsal: 4, uaRehearsal: 0, tardies: 1, eaPerformance: 1, uaPerformance: 0 },
  "Ryan Bates": { eaRehearsal: 7, uaRehearsal: 0, tardies: 3, eaPerformance: 0, uaPerformance: 1 },
  "Ryan Ellis": { eaRehearsal: 3, uaRehearsal: 0, tardies: 2, eaPerformance: 0, uaPerformance: 0 },
  "Samarah Currie": { eaRehearsal: 5, uaRehearsal: 1, tardies: 5, eaPerformance: 1, uaPerformance: 0 },
  "Samia Kirton": { eaRehearsal: 1, uaRehearsal: 0, tardies: 0, eaPerformance: 2, uaPerformance: 0 },
  "Samirah Mungin": { eaRehearsal: 4, uaRehearsal: 0, tardies: 8, eaPerformance: 2, uaPerformance: 1 },
  "Sanaia Harrison": { eaRehearsal: 3, uaRehearsal: 0, tardies: 2, eaPerformance: 0, uaPerformance: 0 },
  "Sara Scherlinder": { eaRehearsal: 8, uaRehearsal: 2, tardies: 7, eaPerformance: 3, uaPerformance: 1 },
  "Shelby Nashe": { eaRehearsal: 4, uaRehearsal: 3, tardies: 13, eaPerformance: 2, uaPerformance: 0 },
  "Soleil Vailes": { eaRehearsal: 1, uaRehearsal: 4, tardies: 2, eaPerformance: 0, uaPerformance: 0 },
  "Tyara Petty": { eaRehearsal: 4, uaRehearsal: 3, tardies: 2, eaPerformance: 1, uaPerformance: 0 },
  "Taylor Wells": { eaRehearsal: 3, uaRehearsal: 4, tardies: 0, eaPerformance: 0, uaPerformance: 0 },
  "Tiyanna Dudley": { eaRehearsal: 13, uaRehearsal: 5, tardies: 0, eaPerformance: 0, uaPerformance: 1 },
  "Trennedy Wade": { eaRehearsal: 16, uaRehearsal: 3, tardies: 2, eaPerformance: 3, uaPerformance: 0 },
  "Wambui Kennedy": { eaRehearsal: 2, uaRehearsal: 1, tardies: 0, eaPerformance: 0, uaPerformance: 2 },
  "Yaa Opong": { eaRehearsal: 5, uaRehearsal: 1, tardies: 2, eaPerformance: 1, uaPerformance: 0 },
  "Yazmere Bose": { eaRehearsal: 6, uaRehearsal: 4, tardies: 2, eaPerformance: 0, uaPerformance: 0 },
  "Zoe Champion": { eaRehearsal: 13, uaRehearsal: 2, tardies: 0, eaPerformance: 2, uaPerformance: 1 }
};

// Calculate effective absences per handbook rules
// Only UA (unexcused) counts toward penalties
const calculateEffectiveAbsences = (data: typeof mus070AttendanceData[string]) => {
  // Missing a performance (UA) = 2 absences
  const performanceAsAbsences = data.uaPerformance * 2;
  // Every 2 tardies beyond 3 = 1 absence
  const excessTardies = Math.max(0, data.tardies - 3);
  const tardiesAsAbsences = Math.floor(excessTardies / 2);
  
  return data.uaRehearsal + performanceAsAbsences + tardiesAsAbsences;
};

const getStatus = (data: typeof mus070AttendanceData[string]) => {
  if (data.dropped) return 'DROPPED';
  const effectiveAbsences = calculateEffectiveAbsences(data);
  if (effectiveAbsences >= 6) return 'At Risk';
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
        status: getStatus(data)
      }))
      .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    const droppedCount = allMembers.filter(m => m.status === 'DROPPED').length;
    const warningCount = allMembers.filter(m => m.status === 'Warning' || m.status === 'At Risk').length;

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
              <div className="text-3xl font-bold text-green-500">{allMembers.length - droppedCount - warningCount}</div>
              <p className="text-sm text-muted-foreground">Good Standing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-yellow-500">{warningCount}</div>
              <p className="text-sm text-muted-foreground">Warning/At Risk</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-500">{droppedCount}</div>
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
            <CardTitle className="flex items-center gap-2 text-foreground">
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
                    <TableHead className="text-center text-foreground font-semibold">EA Rehears.</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">UA Rehears.</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Tardies</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">EA Perf.</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">UA Perf.</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Eff. Absences</TableHead>
                    <TableHead className="text-center text-foreground font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allMembers.map((member) => (
                    <TableRow key={member.name} className={member.status === 'DROPPED' ? 'bg-red-500/20' : ''}>
                      <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                      <TableCell className="text-center text-foreground">{member.eaRehearsal}</TableCell>
                      <TableCell className="text-center text-foreground">
                        <span className={member.uaRehearsal >= 6 ? 'text-red-400 font-bold' : member.uaRehearsal > 3 ? 'text-yellow-400' : ''}>
                          {member.uaRehearsal}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-foreground">
                        <span className={member.tardies >= 10 ? 'text-red-400 font-bold' : member.tardies > 5 ? 'text-yellow-400' : ''}>
                          {member.tardies}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-foreground">{member.eaPerformance}</TableCell>
                      <TableCell className="text-center text-foreground">
                        <span className={member.uaPerformance > 0 ? 'text-red-400 font-bold' : ''}>
                          {member.uaPerformance}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={member.effectiveAbsences >= 6 ? 'text-red-400 font-bold' : member.effectiveAbsences > 3 ? 'text-yellow-400' : 'text-foreground'}>
                          {member.effectiveAbsences}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {member.status === 'DROPPED' ? (
                          <Badge variant="destructive">DROPPED</Badge>
                        ) : member.status === 'At Risk' ? (
                          <Badge className="bg-red-500/80 text-white">At Risk</Badge>
                        ) : member.status === 'Warning' ? (
                          <Badge className="bg-yellow-500 text-yellow-950">Warning</Badge>
                        ) : (
                          <Badge className="bg-green-500 text-green-950">Good</Badge>
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
          <h3 className="text-lg font-semibold mb-2 text-foreground">Attendance</h3>
          <p className="text-muted-foreground">No attendance record found for your account.</p>
        </CardContent>
      </Card>
    );
  }

  const effectiveAbsences = calculateEffectiveAbsences(userAttendance);
  const status = getStatus(userAttendance);
  const penaltyAbsences = Math.max(0, effectiveAbsences - 3);
  const gradePenalty = status === 'DROPPED' ? 'DROPPED' : penaltyAbsences > 0 ? `${penaltyAbsences * 7}%` : '0%';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-foreground">{userAttendance.eaRehearsal}</div>
            <p className="text-sm text-muted-foreground">EA Rehearsal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${userAttendance.uaRehearsal > 3 ? 'text-yellow-500' : 'text-foreground'}`}>
              {userAttendance.uaRehearsal}
            </div>
            <p className="text-sm text-muted-foreground">UA Rehearsal</p>
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
            <div className="text-3xl font-bold text-foreground">{userAttendance.eaPerformance}</div>
            <p className="text-sm text-muted-foreground">EA Performance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${userAttendance.uaPerformance > 0 ? 'text-red-500' : 'text-foreground'}`}>
              {userAttendance.uaPerformance}
            </div>
            <p className="text-sm text-muted-foreground">UA Performance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className={`text-3xl font-bold ${effectiveAbsences >= 6 ? 'text-red-500' : effectiveAbsences > 3 ? 'text-yellow-500' : 'text-green-500'}`}>
              {effectiveAbsences}
            </div>
            <p className="text-sm text-muted-foreground">Effective Absences</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <UserCheck className="h-5 w-5 text-primary" />
            Your Attendance Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <span className="font-medium text-foreground">Status</span>
            {status === 'DROPPED' ? (
              <Badge variant="destructive">DROPPED</Badge>
            ) : status === 'At Risk' ? (
              <Badge className="bg-red-500/80 text-white">At Risk</Badge>
            ) : status === 'Warning' ? (
              <Badge className="bg-yellow-500 text-yellow-950">Warning</Badge>
            ) : (
              <Badge className="bg-green-500 text-green-950">Good Standing</Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <span className="font-medium text-foreground">Grade Penalty</span>
            <span className={status === 'DROPPED' ? 'text-red-500 font-bold' : 'text-foreground'}>{gradePenalty}</span>
          </div>
          
          <div className="mt-4 p-4 bg-muted/20 rounded-lg">
            <h4 className="font-semibold flex items-center gap-2 mb-2 text-foreground">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Attendance Policy
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• EA = Excused Absence (with documentation)</li>
              <li>• UA = Unexcused Absence (counts toward penalty)</li>
              <li>• 3 UA allowed without penalty</li>
              <li>• Each UA beyond 3 = 7% grade reduction</li>
              <li>• 6+ effective absences = At Risk / DROPPED</li>
              <li>• Missing a performance (UA) = 2 unexcused absences</li>
              <li>• 3 tardies allowed; every 2 beyond = 1 absence</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

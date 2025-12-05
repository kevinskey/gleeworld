import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

interface AnalyticsData {
  statusBreakdown: { name: string; value: number; tickets: number }[];
  roleBreakdown: { name: string; value: number; tickets: number }[];
  classYearBreakdown: { name: string; value: number; tickets: number }[];
  memberVsNonMember: { name: string; value: number; tickets: number }[];
}

const STATUS_COLORS = {
  pending: 'hsl(48, 96%, 53%)',
  contacted: 'hsl(280, 70%, 50%)',
  approved: 'hsl(142, 76%, 36%)',
  rejected: 'hsl(0, 84%, 60%)',
};

const ROLE_COLORS = [
  'hsl(210, 79%, 46%)',
  'hsl(142, 76%, 36%)',
  'hsl(280, 70%, 50%)',
  'hsl(48, 96%, 53%)',
  'hsl(0, 84%, 60%)',
  'hsl(180, 70%, 45%)',
];

const CLASS_COLORS = [
  'hsl(210, 79%, 46%)',
  'hsl(142, 76%, 36%)',
  'hsl(280, 70%, 50%)',
  'hsl(48, 96%, 53%)',
  'hsl(330, 80%, 60%)',
];

export const ConcertTicketAnalytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['concert-ticket-analytics'],
    queryFn: async (): Promise<AnalyticsData> => {
      // Fetch all requests with profile data
      const { data: requests, error } = await supabase
        .from('concert_ticket_requests')
        .select('status, num_tickets, email');
      
      if (error) throw error;

      // Fetch profiles to join
      const { data: profiles, error: profileError } = await supabase
        .from('gw_profiles')
        .select('email, role, class_year');
      
      if (profileError) throw profileError;

      // Create email lookup map
      const profileMap = new Map(
        profiles?.map(p => [p.email?.toLowerCase(), p]) || []
      );

      // Process data
      const statusCounts: Record<string, { count: number; tickets: number }> = {};
      const roleCounts: Record<string, { count: number; tickets: number }> = {};
      const classYearCounts: Record<string, { count: number; tickets: number }> = {};
      let memberCount = 0, memberTickets = 0;
      let nonMemberCount = 0, nonMemberTickets = 0;

      requests?.forEach(req => {
        // Status breakdown
        const status = req.status || 'pending';
        if (!statusCounts[status]) statusCounts[status] = { count: 0, tickets: 0 };
        statusCounts[status].count++;
        statusCounts[status].tickets += req.num_tickets;

        // Get profile data
        const profile = profileMap.get(req.email?.toLowerCase());
        
        if (profile) {
          memberCount++;
          memberTickets += req.num_tickets;
          
          // Role breakdown
          const role = profile.role || 'Unknown';
          if (!roleCounts[role]) roleCounts[role] = { count: 0, tickets: 0 };
          roleCounts[role].count++;
          roleCounts[role].tickets += req.num_tickets;

          // Class year breakdown
          const classYear = profile.class_year ? `Class of ${profile.class_year}` : 'Not Set';
          if (!classYearCounts[classYear]) classYearCounts[classYear] = { count: 0, tickets: 0 };
          classYearCounts[classYear].count++;
          classYearCounts[classYear].tickets += req.num_tickets;
        } else {
          nonMemberCount++;
          nonMemberTickets += req.num_tickets;
        }
      });

      return {
        statusBreakdown: Object.entries(statusCounts).map(([name, data]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value: data.count,
          tickets: data.tickets,
        })),
        roleBreakdown: Object.entries(roleCounts)
          .map(([name, data]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: data.count,
            tickets: data.tickets,
          }))
          .sort((a, b) => b.value - a.value),
        classYearBreakdown: Object.entries(classYearCounts)
          .map(([name, data]) => ({
            name,
            value: data.count,
            tickets: data.tickets,
          }))
          .sort((a, b) => b.value - a.value),
        memberVsNonMember: [
          { name: 'Members', value: memberCount, tickets: memberTickets },
          { name: 'Non-Members', value: nonMemberCount, tickets: nonMemberTickets },
        ],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-card-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">Requests: {data.value}</p>
          <p className="text-sm text-muted-foreground">Tickets: {data.tickets}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Status & Member Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Request Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {analytics?.statusBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.name.toLowerCase() as keyof typeof STATUS_COLORS] || ROLE_COLORS[index % ROLE_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Member vs Non-Member */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Members vs Non-Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.memberVsNonMember}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="hsl(142, 76%, 36%)" />
                    <Cell fill="hsl(48, 96%, 53%)" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role & Class Year Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">By User Role (Members Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.roleBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="hsl(210, 79%, 46%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Class Year Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">By Class Year (Members Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.classYearBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                  >
                    {analytics?.classYearBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CLASS_COLORS[index % CLASS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics?.statusBreakdown.map((item) => (
              <div key={item.name} className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-card-foreground">{item.value}</div>
                <div className="text-sm text-muted-foreground">{item.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{item.tickets} tickets</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

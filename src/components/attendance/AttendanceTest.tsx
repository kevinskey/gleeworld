import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function AttendanceTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Debug logging
  console.log('AttendanceTest component loaded');

  const addResult = (message: string, isError = false) => {
    setTestResults(prev => [...prev, `${isError ? '❌' : '✅'} ${message}`]);
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      // Test 1: Check if tables exist and can be queried
      addResult('Testing database schema...');
      
      const { data: policies, error: policiesError } = await supabase
        .from('gw_attendance_policies')
        .select('*')
        .limit(1);
      
      if (policiesError) {
        addResult(`Policies table error: ${policiesError.message}`, true);
      } else {
        addResult(`Attendance policies table accessible - ${policies?.length || 0} policies found`);
      }

      // Test 2: Check current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('gw_profiles')
          .select('*, voice_part, is_section_leader')
          .eq('user_id', user.id)
          .single();
        
        if (profileError) {
          addResult(`Profile query error: ${profileError.message}`, true);
        } else {
          addResult(`User profile found - Voice part: ${profile?.voice_part || 'Not set'}, Section leader: ${profile?.is_section_leader ? 'Yes' : 'No'}`);
        }
      }

      // Test 3: Check events for attendance
      const { data: events, error: eventsError } = await supabase
        .from('gw_events')
        .select('id, title, event_type, start_date')
        .limit(5);
      
      if (eventsError) {
        addResult(`Events query error: ${eventsError.message}`, true);
      } else {
        addResult(`Found ${events?.length || 0} events for attendance tracking`);
        events?.forEach(event => {
          addResult(`  - ${event.title} (${event.event_type}) - ${new Date(event.start_date).toLocaleDateString()}`);
        });
      }

      // Test 4: Test attendance record creation (if user has permission)
      if (events && events.length > 0 && user) {
        const testEvent = events[0];
        const { data: attendance, error: attendanceError } = await supabase
          .from('gw_event_attendance')
          .insert([{
            event_id: testEvent.id,
            user_id: user.id,
            attendance_status: 'present',
            recorded_by: user.id,
            notes: 'Test attendance record'
          }])
          .select()
          .single();

        if (attendanceError) {
          if (attendanceError.code === '23505') {
            addResult('Attendance record already exists (unique constraint)', false);
          } else if (attendanceError.code === '42501') {
            addResult('No permission to create attendance records (expected for non-secretary/admin users)', false);
          } else {
            addResult(`Attendance insert error: ${attendanceError.message}`, true);
          }
        } else {
          addResult('Successfully created test attendance record');
          
          // Clean up test record
          await supabase
            .from('gw_event_attendance')
            .delete()
            .eq('id', attendance.id);
          addResult('Cleaned up test attendance record');
        }
      }

      // Test 5: Query attendance records with proper joins
      const { data: attendanceRecords, error: attendanceQueryError } = await supabase
        .from('gw_event_attendance')
        .select(`
          *,
          gw_events!gw_event_attendance_event_id_fkey(title, event_type),
          gw_profiles!gw_event_attendance_user_id_fkey(full_name)
        `)
        .limit(5);

      if (attendanceQueryError) {
        addResult(`Attendance query error: ${attendanceQueryError.message}`, true);
      } else {
        addResult(`Found ${attendanceRecords?.length || 0} existing attendance records`);
      }

      toast({
        title: "Tests completed",
        description: "Check results below for any issues",
      });

    } catch (error) {
      addResult(`Unexpected error: ${error}`, true);
      toast({
        title: "Test failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testUserRoles = async () => {
    setTestResults([]);
    addResult('Testing user roles and permissions...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addResult('No authenticated user found', true);
        return;
      }

      // Check if user is admin/super-admin
      const { data: adminCheck } = await supabase
        .rpc('is_admin', { _user_id: user.id });
      
      const { data: superAdminCheck } = await supabase
        .rpc('is_super_admin', { _user_id: user.id });

      addResult(`User ID: ${user.id}`);
      addResult(`Admin status: ${adminCheck ? 'Yes' : 'No'}`);
      addResult(`Super Admin status: ${superAdminCheck ? 'Yes' : 'No'}`);

      // Check profile details
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('exec_board_role, is_section_leader, voice_part')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        addResult(`Executive Board Role: ${profile.exec_board_role || 'None'}`);
        addResult(`Section Leader: ${profile.is_section_leader ? 'Yes' : 'No'}`);
        addResult(`Voice Part: ${profile.voice_part || 'Not set'}`);
      }

    } catch (error) {
      addResult(`Role test error: ${error}`, true);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Attendance System Test Suite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runTests} 
            disabled={isLoading}
            variant="default"
          >
            {isLoading ? 'Running Tests...' : 'Run Database Tests'}
          </Button>
          <Button 
            onClick={testUserRoles} 
            disabled={isLoading}
            variant="outline"
          >
            Test User Roles
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
            <div className="bg-muted p-4 rounded-md font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={result.startsWith('❌') ? 'text-destructive' : 'text-foreground'}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-md">
          <h4 className="font-semibold mb-2">What this tests:</h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Database schema integrity (tables exist and are accessible)</li>
            <li>Row Level Security policies (permission checks)</li>
            <li>User profile data and attendance permissions</li>
            <li>Event data availability for attendance tracking</li>
            <li>Basic CRUD operations on attendance records</li>
            <li>User role verification (admin, section leader, secretary)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
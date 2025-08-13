import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const AppointmentTestButton = () => {
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runQuickTest = async () => {
    setTesting(true);
    setResults([]);
    const testResults: string[] = [];

    try {
      // Test 1: Check auth
      testResults.push(`✓ Auth Status: ${user ? 'Logged in as ' + user.email : 'Not authenticated'}`);

      // Test 2: Test appointment types fetch
      const { data: types, error: typesError } = await supabase
        .from('gw_appointment_types')
        .select('*')
        .limit(5);
      
      if (typesError) {
        testResults.push(`❌ Appointment Types Error: ${typesError.message}`);
      } else {
        testResults.push(`✓ Appointment Types: Found ${types?.length || 0} types`);
      }

      // Test 3: Test appointments fetch
      const { data: appointments, error: appointmentsError } = await supabase
        .from('gw_appointments')
        .select('*')
        .limit(5);
      
      if (appointmentsError) {
        testResults.push(`❌ Appointments Error: ${appointmentsError.message}`);
      } else {
        testResults.push(`✓ Appointments: Found ${appointments?.length || 0} appointments`);
      }

      // Test 4: Test appointment creation capability
      const testAppointment = {
        title: 'Test Appointment',
        client_name: 'Test Client',
        appointment_date: new Date().toISOString(),
        duration_minutes: 30,
        appointment_type: 'consultation',
        status: 'pending_approval'
      };

      const { error: insertError } = await supabase
        .from('gw_appointments')
        .insert([testAppointment])
        .select()
        .single();

      if (insertError) {
        testResults.push(`❌ Create Test: ${insertError.message}`);
      } else {
        testResults.push(`✓ Create Test: Can create appointments`);
        // Clean up test appointment
        await supabase
          .from('gw_appointments')
          .delete()
          .eq('title', 'Test Appointment');
      }

      testResults.push(`🎉 All tests completed!`);
      
    } catch (error: any) {
      testResults.push(`❌ Test failed: ${error.message}`);
    }

    setResults(testResults);
    setTesting(false);
    
    toast.success("Appointment system test completed!");
  };

  return (
    <div className="space-y-4">
      <Button onClick={runQuickTest} disabled={testing}>
        {testing ? 'Testing...' : 'Test Appointment System'}
      </Button>
      
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, index) => (
            <Badge key={index} variant="outline" className="block w-full text-left p-2">
              {result}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const AppointmentSystemTest = () => {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const { toast } = useToast();

  const runTests = async () => {
    setTesting(true);
    setTestResults([]);
    const results: string[] = [];

    try {
      // Test 1: Check if appointments table is accessible
      results.push('✓ Testing appointments table access...');
      const { data: appointments, error: appointmentsError } = await supabase
        .from('gw_appointments')
        .select('count')
        .limit(1);
      
      if (appointmentsError) {
        results.push(`❌ Appointments table error: ${appointmentsError.message}`);
      } else {
        results.push('✓ Appointments table accessible');
      }

      // Test 2: Check if notification log table is accessible
      results.push('✓ Testing notification log table...');
      const { data: logs, error: logsError } = await supabase
        .from('gw_notification_delivery_log')
        .select('count')
        .limit(1);
      
      if (logsError) {
        results.push(`❌ Notification log error: ${logsError.message}`);
      } else {
        results.push('✓ Notification log table accessible');
      }

      // Test 3: Test creating a test appointment
      results.push('✓ Testing appointment creation...');
      const testAppointment = {
        title: 'Test Appointment',
        description: 'System test appointment',
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration_minutes: 30,
        appointment_type: 'general',
        client_name: 'Test User',
        client_email: 'test@example.com',
        client_phone: '(555) 123-4567',
        status: 'pending_approval'
      };

      const { data: newAppt, error: createError } = await supabase
        .from('gw_appointments')
        .insert(testAppointment)
        .select()
        .single();

      if (createError) {
        results.push(`❌ Appointment creation error: ${createError.message}`);
      } else {
        results.push('✓ Test appointment created successfully');
        
        // Clean up test appointment
        await supabase
          .from('gw_appointments')
          .delete()
          .eq('id', newAppt.id);
        results.push('✓ Test appointment cleaned up');
      }

      // Test 4: Check SMS function exists
      results.push('✓ Testing SMS function availability...');
      const { data: smsTest, error: smsError } = await supabase.functions.invoke('gw-send-sms', {
        body: { test: true }
      });
      
      if (smsError) {
        results.push(`⚠️ SMS function may not be available: ${smsError.message}`);
      } else {
        results.push('✓ SMS function responding');
      }

      results.push('🎉 Appointment system tests completed!');
      
    } catch (error: any) {
      results.push(`❌ Test failed: ${error.message}`);
    }

    setTestResults(results);
    setTesting(false);
    
    toast({
      title: "Tests Complete",
      description: "Check the results below",
    });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Appointment System Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runTests} 
          disabled={testing}
          className="w-full"
        >
          {testing ? 'Running Tests...' : 'Run Appointment System Tests'}
        </Button>
        
        {testResults.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index} className="text-gray-700">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';

interface BulkEnrollmentToolProps {
  courseId: string;
  onSuccess?: () => void;
}

export const BulkEnrollmentTool: React.FC<BulkEnrollmentToolProps> = ({ courseId, onSuccess }) => {
  const [emailsText, setEmailsText] = useState('');
  const [results, setResults] = useState<{ success: string[]; failed: string[] } | null>(null);

  const bulkEnrollMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const success: string[] = [];
      const failed: string[] = [];

      for (const email of emails) {
        try {
          // Look up user in gw_profiles
          const { data: profileData } = await supabase
            .from('gw_profiles')
            .select('user_id')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();

          if (!profileData?.user_id) {
            failed.push(`${email} - User not found`);
            continue;
          }

          // Check if already enrolled
          const { data: existing } = await supabase
            .from('gw_enrollments' as any)
            .select('id')
            .eq('course_id', courseId)
            .eq('student_id', profileData.user_id)
            .maybeSingle();

          if (existing) {
            success.push(`${email} - Already enrolled`);
            continue;
          }

          // Create enrollment
          const { error } = await supabase
            .from('gw_enrollments' as any)
            .insert({
              course_id: courseId,
              student_id: profileData.user_id,
              role: 'student'
            } as any);

          if (error) {
            failed.push(`${email} - ${error.message}`);
          } else {
            success.push(email);
          }
        } catch (err) {
          failed.push(`${email} - ${err}`);
        }
      }

      return { success, failed };
    },
    onSuccess: (result) => {
      setResults(result);
      toast.success(`Enrolled ${result.success.length} students`);
      if (result.failed.length > 0) {
        toast.error(`Failed to enroll ${result.failed.length} students`);
      }
      onSuccess?.();
    },
    onError: () => {
      toast.error('Bulk enrollment failed');
    }
  });

  const handleBulkEnroll = () => {
    const emails = emailsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.includes('@'))
      .map(line => {
        // Extract email from various formats
        const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
        return emailMatch ? emailMatch[0] : null;
      })
      .filter((email): email is string => email !== null);

    if (emails.length === 0) {
      toast.error('No valid emails found');
      return;
    }

    bulkEnrollMutation.mutate(emails);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Bulk Enrollment Tool
        </CardTitle>
        <CardDescription>
          Paste student emails (one per line) to enroll multiple students at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="student1@spelman.edu&#10;student2@spelman.edu&#10;student3@spelman.edu"
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
          disabled={bulkEnrollMutation.isPending}
        />
        
        <Button 
          onClick={handleBulkEnroll}
          disabled={bulkEnrollMutation.isPending || !emailsText.trim()}
          className="w-full"
        >
          {bulkEnrollMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enrolling...
            </>
          ) : (
            'Enroll Students'
          )}
        </Button>

        {results && (
          <div className="space-y-2 text-sm">
            {results.success.length > 0 && (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md">
                <p className="font-semibold text-green-800 dark:text-green-200 mb-1">
                  ✓ Successfully enrolled ({results.success.length}):
                </p>
                <ul className="list-disc list-inside text-green-700 dark:text-green-300 space-y-1">
                  {results.success.slice(0, 5).map((email, i) => (
                    <li key={i}>{email}</li>
                  ))}
                  {results.success.length > 5 && (
                    <li className="font-semibold">...and {results.success.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
            
            {results.failed.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                <p className="font-semibold text-red-800 dark:text-red-200 mb-1">
                  ✗ Failed ({results.failed.length}):
                </p>
                <ul className="list-disc list-inside text-red-700 dark:text-red-300 space-y-1">
                  {results.failed.map((msg, i) => (
                    <li key={i} className="text-xs">{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

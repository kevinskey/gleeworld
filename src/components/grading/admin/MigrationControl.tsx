import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface MigrationResult {
  success: boolean;
  dry_run: boolean;
  course_id: string;
  course_code: string;
  semester: string;
  stats: {
    assignments_migrated: number;
    submissions_migrated: number;
    submissions_skipped: number;
    peer_comments_preserved: number;
  };
  note: string;
}

export const MigrationControl: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const runMigration = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-mus240-data', {
        body: {
          course_code: 'MUS240',
          semester: 'Fall 2024',
          dry_run: dryRun,
        },
      });

      if (error) throw error;

      setResult(data as MigrationResult);
      
      if (data.success) {
        toast.success(dryRun ? 'Dry run completed' : 'Migration completed successfully');
      } else {
        toast.error('Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Failed to run migration');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          MUS240 Data Migration
        </CardTitle>
        <CardDescription>
          Migrate MUS240 listening journal data to the new grading system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This migration will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Create a MUS240 course in the new system</li>
              <li>Migrate all listening journal assignments</li>
              <li>Migrate student submissions WITHOUT AI grades</li>
              <li>Preserve peer comments (in original tables)</li>
              <li>Remove all previous AI grading data</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-2">
          <Switch
            id="dry-run"
            checked={dryRun}
            onCheckedChange={setDryRun}
          />
          <Label htmlFor="dry-run">
            Dry Run (preview changes without applying them)
          </Label>
        </div>

        <Button
          onClick={runMigration}
          disabled={isRunning}
          className="w-full"
          variant={dryRun ? 'outline' : 'default'}
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Migration...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              {dryRun ? 'Preview Migration' : 'Run Migration'}
            </>
          )}
        </Button>

        {result && (
          <Alert className={result.success ? 'border-green-500' : 'border-red-500'}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">
                  {result.dry_run ? 'Preview Results' : 'Migration Results'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Course ID:</div>
                  <div className="font-mono text-xs">{result.course_id}</div>
                  
                  <div>Assignments:</div>
                  <div>{result.stats.assignments_migrated}</div>
                  
                  <div>Submissions Migrated:</div>
                  <div>{result.stats.submissions_migrated}</div>
                  
                  <div>Submissions Skipped:</div>
                  <div>{result.stats.submissions_skipped}</div>
                  
                  <div>Peer Comments:</div>
                  <div>{result.stats.peer_comments_preserved} preserved</div>
                </div>
                <p className="text-sm italic mt-2">{result.note}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

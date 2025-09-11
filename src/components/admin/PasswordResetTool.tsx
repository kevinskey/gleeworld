import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Users, AlertTriangle } from 'lucide-react';

interface ResetResult {
  user_id: string;
  error: string;
}

interface ResetResponse {
  role?: string;
  setTo?: string;
  success?: number;
  failed?: number;
  failures?: ResetResult[];
  dryRun?: boolean;
  count?: number;
  sample?: Array<{ user_id: string }>;
  message?: string;
  error?: string;
}

export const PasswordResetTool = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('Spelman');
  const [targetRole, setTargetRole] = useState('member');
  const [batchLimit, setBatchLimit] = useState<number | undefined>(undefined);
  const [lastResults, setLastResults] = useState<ResetResponse | null>(null);

  const handleDryRun = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a password');
      return;
    }

    setIsLoading(true);
    try {
      // Use admin JWT for edge function auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const { data, error } = await supabase.functions.invoke('reset-member-passwords', {
        body: {
          targetRole: targetRole,
          newPassword: newPassword.trim(),
          batchLimit: batchLimit
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Function error:', error);
        toast.error(`Dry run failed: ${error.message}`);
        return;
      }

      const response = data as ResetResponse;
      setLastResults(response);
      toast.success(`Dry run complete: Found ${response.count} users with role "${targetRole}"`);
    } catch (error: any) {
      console.error('Error calling dry run:', error);
      toast.error('Failed to perform dry run');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a password');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const { data, error } = await supabase.functions.invoke('reset-member-passwords', {
        body: {
          targetRole: targetRole,
          newPassword: newPassword.trim(),
          batchLimit: batchLimit
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Function error:', error);
        toast.error(`Failed to reset passwords: ${error.message}`);
        return;
      }

      const response = data as ResetResponse;
      setLastResults(response);

      if (response.error) {
        toast.error(`Password reset failed: ${response.error}`);
      } else {
        toast.success(
          `Password reset complete! ${response.success || 0} successful, ${response.failed || 0} failed`
        );
      }
    } catch (error: any) {
      console.error('Error calling password reset function:', error);
      toast.error('Failed to call password reset function');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Bulk Password Reset Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetRole">Target Role</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="alumna">Alumna</SelectItem>
                  <SelectItem value="fan">Fan</SelectItem>
                  <SelectItem value="auditioner">Auditioner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Batch Limit (Optional)</Label>
              <Input
                id="limit"
                type="number"
                value={batchLimit || ''}
                onChange={(e) => setBatchLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="No limit"
                min="1"
              />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Warning</h4>
                <p className="text-sm text-yellow-700">
                  This will reset passwords for ALL users with the selected role. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleDryRun}
              disabled={isLoading || !newPassword.trim()}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? 'Running...' : 'Dry Run (Preview)'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  className="flex-1" 
                  disabled={isLoading || !newPassword.trim()}
                  variant="destructive"
                >
                  {isLoading ? 'Resetting...' : `Reset Passwords`}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Password Reset</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to reset passwords for {batchLimit ? `up to ${batchLimit}` : 'all'} users with role "{targetRole}" 
                    to "{newPassword}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handlePasswordReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Reset Passwords
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {lastResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Last Reset Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lastResults.dryRun ? (
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <Badge variant="outline">Dry Run</Badge>
                    <Badge variant="secondary">
                      Found: {lastResults.count} users
                    </Badge>
                  </div>
                  {lastResults.sample && lastResults.sample.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sample User IDs (first 10):</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {lastResults.sample.map((user, index) => (
                          <div key={index} className="p-2 bg-muted rounded text-sm font-mono">
                            {user.user_id}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-4">
                    <Badge variant="secondary">
                      Role: {lastResults.role}
                    </Badge>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Success: {lastResults.success || 0}
                    </Badge>
                    {(lastResults.failed || 0) > 0 && (
                      <Badge variant="destructive">
                        Failed: {lastResults.failed}
                      </Badge>
                    )}
                  </div>

                  {lastResults.failures && lastResults.failures.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Failures:</h4>
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        {lastResults.failures.map((failure, index) => (
                          <div 
                            key={failure.user_id || index} 
                            className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                          >
                            <span className="font-mono">{failure.user_id}</span>
                            <span className="text-destructive text-xs truncate max-w-60">
                              {failure.error}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {lastResults.message && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  {lastResults.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
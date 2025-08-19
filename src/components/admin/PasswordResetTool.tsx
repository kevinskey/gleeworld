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
  email: string;
  success: boolean;
  error?: string;
}

interface ResetResponse {
  success: boolean;
  message: string;
  resetCount: number;
  failedCount: number;
  totalUsers: number;
  results: ResetResult[];
  error?: string;
}

export const PasswordResetTool = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('Spelman');
  const [targetRole, setTargetRole] = useState('member');
  const [lastResults, setLastResults] = useState<ResetResponse | null>(null);

  const handlePasswordReset = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a password');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-member-passwords', {
        body: {
          newPassword: newPassword.trim(),
          targetRole: targetRole
        }
      });

      if (error) {
        console.error('Function error:', error);
        toast.error(`Failed to reset passwords: ${error.message}`);
        return;
      }

      const response = data as ResetResponse;
      setLastResults(response);

      if (response.success) {
        toast.success(
          `Password reset complete! ${response.resetCount} successful, ${response.failedCount} failed`
        );
      } else {
        toast.error(`Password reset failed: ${response.error}`);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full" 
                disabled={isLoading || !newPassword.trim()}
                variant="destructive"
              >
                {isLoading ? 'Resetting Passwords...' : `Reset All ${targetRole} Passwords`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Password Reset</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to reset passwords for all users with role "{targetRole}" 
                  to "{newPassword}"? This action cannot be undone and will affect all users 
                  with this role.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handlePasswordReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Reset All Passwords
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              <div className="flex gap-4">
                <Badge variant="secondary">
                  Total: {lastResults.totalUsers}
                </Badge>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Success: {lastResults.resetCount}
                </Badge>
                {lastResults.failedCount > 0 && (
                  <Badge variant="destructive">
                    Failed: {lastResults.failedCount}
                  </Badge>
                )}
              </div>

              {lastResults.results && lastResults.results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Detailed Results:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {lastResults.results.map((result, index) => (
                      <div 
                        key={result.user_id || index} 
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                      >
                        <span>{result.email}</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={result.success ? "default" : "destructive"}
                            className={`text-xs ${result.success ? 'bg-green-100 text-green-800' : ''}`}
                          >
                            {result.success ? 'Success' : 'Failed'}
                          </Badge>
                          {result.error && (
                            <span className="text-destructive text-xs truncate max-w-40">
                              {result.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
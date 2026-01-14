import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResetResult {
  email: string;
  name: string;
  success: boolean;
  error?: string;
}

interface ResetResponse {
  success: boolean;
  message: string;
  updated: number;
  failed: number;
  details: ResetResult[];
}

export const BulkPasswordReset = () => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResetResponse | null>(null);
  const { toast } = useToast();

  const handleReset = async () => {
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both password fields match.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('bulk-password-reset', {
        body: {
          newPassword: password,
          semester: 'Spring 2026'
        }
      });

      if (error) {
        throw error;
      }

      setResults(data as ResetResponse);

      if (data.updated > 0) {
        toast({
          title: "Passwords updated",
          description: `Successfully reset passwords for ${data.updated} students.`
        });
      }
    } catch (error: any) {
      console.error('Bulk password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset passwords.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setPassword('');
    setConfirmPassword('');
    setResults(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <KeyRound className="h-4 w-4" />
          Bulk Password Reset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Bulk Password Reset
          </DialogTitle>
          <DialogDescription>
            Reset passwords for all enrolled MUS 240 students (Spring 2026).
            Students can change their password after logging in.
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will reset passwords for ALL enrolled students. They will need to use this new password to log in.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password for all students"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {results.updated} Updated
              </Badge>
              {results.failed > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  {results.failed} Failed
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[200px] rounded-md border p-3">
              <div className="space-y-2">
                {results.details.map((result, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                  >
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-xs text-muted-foreground">{result.email}</div>
                    </div>
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleReset} disabled={loading || !password || !confirmPassword}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset All Passwords
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

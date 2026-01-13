import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Hash, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Calendar,
  Clock,
  User,
  Vibrate
} from 'lucide-react';
import { format } from 'date-fns';

interface PinAttendanceEntryProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PinAttendanceEntry: React.FC<PinAttendanceEntryProps> = ({
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Trigger haptic feedback
  const triggerHaptic = (type: 'success' | 'error' | 'light') => {
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate([50, 50, 100]); // Double pulse for success
      } else if (type === 'error') {
        navigator.vibrate([200]); // Long pulse for error
      } else {
        navigator.vibrate(10); // Light tap
      }
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);
    
    triggerHaptic('light');

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5 && newDigits.every(d => d !== '')) {
      handleSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newDigits = pastedData.split('');
      setPinDigits(newDigits);
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (pin?: string) => {
    const pinCode = pin || pinDigits.join('');
    
    if (pinCode.length !== 6) {
      setError('Please enter all 6 digits');
      triggerHaptic('error');
      return;
    }

    if (!user) {
      setError('You must be logged in to check in');
      triggerHaptic('error');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('process_pin_attendance_scan', {
        pin_code_param: pinCode,
        user_id_param: user.id,
        scan_location_param: null,
        user_agent_param: navigator.userAgent
      });

      if (rpcError) throw rpcError;

      const scanResult = data as any;
      setResult(scanResult);

      if (scanResult.success) {
        triggerHaptic('success');
        toast({
          title: "✓ Checked In!",
          description: scanResult.message || "Your attendance has been recorded.",
        });
        onSuccess?.();
      } else {
        triggerHaptic('error');
        setError(scanResult.error || 'Failed to check in');
        toast({
          title: "Check-in Failed",
          description: scanResult.error,
          variant: "destructive",
        });
      }

    } catch (err) {
      console.error('Error processing PIN:', err);
      triggerHaptic('error');
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPinDigits(['', '', '', '', '', '']);
    setResult(null);
    setError('');
    inputRefs.current[0]?.focus();
  };

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Please log in to check in.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Hash className="h-5 w-5" />
          Enter Attendance PIN
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code shown by your instructor
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!result && (
          <>
            {/* PIN Input Grid */}
            <div className="flex justify-center gap-2">
              {pinDigits.map((digit, index) => (
                <Input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold"
                  disabled={loading}
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {error && (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {onCancel && (
                <Button 
                  onClick={onCancel} 
                  variant="outline" 
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
              <Button 
                onClick={() => handleSubmit()} 
                className="flex-1"
                disabled={loading || pinDigits.some(d => d === '')}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  'Check In'
                )}
              </Button>
            </div>
          </>
        )}

        {result && (
          <div className="space-y-4">
            {result.success ? (
              <>
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    Attendance Recorded!
                  </h3>
                </div>

                {result.event && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{result.event.title}</span>
                        </div>
                        {result.event.start_date && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(result.event.start_date), 'PPp')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {result.user?.name || user.email}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {result.error || 'Failed to record attendance'}
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={resetForm} variant="outline" className="w-full">
              {result.success ? 'Done' : 'Try Again'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PinAttendanceEntry;

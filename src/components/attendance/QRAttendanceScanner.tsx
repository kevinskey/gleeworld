import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import QrScanner from 'qr-scanner';
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface ScanResult {
  success: boolean;
  message: string;
  event_title?: string;
  scanned_at?: string;
  error?: string;
}

export const QRAttendanceScanner = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);

  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopScanner();
    };
  }, []);

  const checkCameraSupport = async () => {
    try {
      const hasCamera = await QrScanner.hasCamera();
      setHasCamera(hasCamera);
    } catch (error) {
      console.error('Error checking camera support:', error);
      setHasCamera(false);
    }
  };

  const startScanner = async () => {
    if (!videoRef.current || !user) return;

    try {
      setIsScanning(true);
      setScanResult(null);

      const scanner = new QrScanner(
        videoRef.current,
        async (result) => {
          await handleScan(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment'
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
    } catch (error) {
      console.error('Error starting scanner:', error);
      setIsScanning(false);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const parseQrToken = (raw: string): string => {
    const input = raw.trim();
    if (!input) return '';

    // If it's a URL, try to extract token from query string or path
    try {
      const url = new URL(input);
      const tokenParam = url.searchParams.get('token');
      if (tokenParam) return tokenParam.trim();

      // Common pattern: last path segment is the token
      const lastSegment = url.pathname.split('/').filter(Boolean).pop();
      if (lastSegment) return decodeURIComponent(lastSegment).trim();
    } catch {
      // Not a valid URL; fall through to string parsing
    }

    // Common non-URL patterns
    // e.g. "token=XYZ", "token: XYZ", "token XYZ"
    const tokenEquals = input.match(/token=([^&\s]+)/i);
    if (tokenEquals?.[1]) return decodeURIComponent(tokenEquals[1]).trim();

    const tokenColon = input.match(/\btoken\s*[:\-]\s*([^\s]+)/i);
    if (tokenColon?.[1]) return tokenColon[1].trim();

    const tokenSpace = input.match(/\btoken\s+([^\s]+)/i);
    if (tokenSpace?.[1]) return tokenSpace[1].trim();

    // Otherwise assume the QR encodes the token directly
    return input;
  };

  const handleScan = async (qrData: string) => {
    console.log('QR handleScan called with:', qrData);
    console.log('User object:', user);
    console.log('Processing state:', processing);

    if (processing || !user) {
      console.log('Scan blocked - processing:', processing, 'user:', !!user);
      return;
    }

    setProcessing(true);
    stopScanner(); // Stop scanning while processing

    try {
      const qrToken = parseQrToken(qrData);
      console.log('Parsed QR token:', qrToken);

      if (!qrToken) {
        throw new Error('Invalid QR code format');
      }

      console.log('Calling process_qr_attendance_scan with params:', {
        qr_token_param: qrToken,
        user_id_param: user.id,
        scan_location_param: null,
        user_agent_param: navigator.userAgent,
        ip_address_param: null,
      });

      // Timeout protects against "nothing happened" hangs
      const rpcPromise = supabase.rpc('process_qr_attendance_scan', {
        qr_token_param: qrToken,
        user_id_param: user.id,
        scan_location_param: null, // Could add geolocation here
        user_agent_param: navigator.userAgent,
        ip_address_param: null, // Would need server-side to get real IP
      });

      const timeoutMs = 15000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Scan timed out. Please try again.')), timeoutMs);
      });

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

      console.log('RPC response:', { data, error });

      if (error) throw error;

      if (!data) {
        throw new Error('No response from server');
      }

      // Parse the response - handle both direct object and stringified JSON
      let result: ScanResult;
      if (typeof data === 'string') {
        try {
          result = JSON.parse(data);
        } catch {
          result = { success: false, message: 'Invalid response format', error: 'Could not parse response' };
        }
      } else if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        result = data as unknown as ScanResult;
      } else {
        result = { success: false, message: 'Invalid response format', error: 'Unexpected response format' };
      }

      console.log('Parsed result:', result);
      setScanResult(result);

      if (result.success) {
        toast({
          title: "Attendance Recorded",
          description: `Successfully marked present for ${result.event_title || 'this event'}`,
        });

        // Navigate to academy module where attendance is recorded after a brief delay
        setTimeout(() => {
          navigate('/dashboard?module=glee-academy');
        }, 2000);
      } else {
        toast({
          title: "Scan Failed",
          description: result.message || result.error || "Failed to record attendance",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setScanResult({
        success: false,
        message: 'Error processing scan',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      toast({
        title: "Scan Error",
        description: error instanceof Error ? error.message : "Failed to process QR code scan",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    if (!isScanning && hasCamera) {
      startScanner();
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Login Required</h3>
            <p className="text-gray-600">
              Please log in to scan QR codes for attendance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasCamera === null) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Checking camera availability...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasCamera === false) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Camera Not Available</h3>
            <p className="text-gray-600">
              Camera access is required to scan QR codes. Please check your device settings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Attendance Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera View */}
          <div className="relative aspect-square max-w-md mx-auto bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {processing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing scan...</span>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2">
            {!isScanning ? (
              <Button onClick={startScanner} className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Start Scanning
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="outline" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Stop Scanning
              </Button>
            )}
          </div>

          {/* Scan Result */}
          {scanResult && (
            <Alert className={scanResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {scanResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">{scanResult.message}</p>
                    {scanResult.event_title && (
                      <p className="text-sm">Event: {scanResult.event_title}</p>
                    )}
                    {scanResult.error && (
                      <p className="text-sm text-red-600">Error: {scanResult.error}</p>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}

          {scanResult && (
            <div className="flex justify-center">
              <Button onClick={resetScanner} variant="outline">
                Scan Another Code
              </Button>
            </div>
          )}

          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>Position the QR code within the camera frame to scan</p>
            <p>Make sure you have good lighting and hold your device steady</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
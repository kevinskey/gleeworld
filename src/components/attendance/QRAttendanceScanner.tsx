import React, { useState, useRef, useEffect } from 'react';
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

  const handleScan = async (qrData: string) => {
    if (processing || !user) return;

    setProcessing(true);
    stopScanner(); // Stop scanning while processing

    try {
      // Parse QR code data - expecting a token string
      const qrToken = qrData.trim();
      
      if (!qrToken) {
        throw new Error('Invalid QR code format');
      }

      // Call the database function to process the scan
      const { data, error } = await supabase.rpc('process_qr_attendance_scan', {
        qr_token_param: qrToken,
        user_id_param: user.id,
        scan_location_param: null, // Could add geolocation here
        user_agent_param: navigator.userAgent,
        ip_address_param: null // Would need server-side to get real IP
      });

      if (error) throw error;

      const result = typeof data === 'object' && data !== null && !Array.isArray(data) 
        ? data as unknown as ScanResult 
        : {
            success: false,
            message: 'Invalid response format',
            error: 'Unexpected response format'
          };
      setScanResult(result);

      if (result.success) {
        toast({
          title: "Attendance Recorded",
          description: `Successfully marked present for ${result.event_title}`,
        });
      } else {
        toast({
          title: "Scan Failed",
          description: result.error || "Failed to record attendance",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Error processing QR scan:', error);
      setScanResult({
        success: false,
        message: 'Error processing scan',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast({
        title: "Scan Error",
        description: "Failed to process QR code scan",
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
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import QRCode from 'qrcode';
import { 
  RefreshCw, 
  Clock, 
  MapPin, 
  Shield,
  Loader2,
  QrCode,
  Copy,
  CheckCircle,
  Timer,
  Pause,
  Play
} from 'lucide-react';
import { format } from 'date-fns';

interface SecuritySettings {
  autoRotateEnabled: boolean;
  rotateIntervalSeconds: number;
  timeWindowEnabled: boolean;
  timeWindowMinutes: number;
  geofenceEnabled: boolean;
  geofenceLatitude: number | null;
  geofenceLongitude: number | null;
  geofenceRadiusMeters: number;
}

interface AttendanceSecurityControlsProps {
  eventId: string;
  eventTitle: string;
  venueLatitude?: number | null;
  venueLongitude?: number | null;
}

export const AttendanceSecurityControls: React.FC<AttendanceSecurityControlsProps> = ({
  eventId,
  eventTitle,
  venueLatitude,
  venueLongitude
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Security settings
  const [settings, setSettings] = useState<SecuritySettings>({
    autoRotateEnabled: false,
    rotateIntervalSeconds: 60,
    timeWindowEnabled: false,
    timeWindowMinutes: 15,
    geofenceEnabled: false,
    geofenceLatitude: venueLatitude || null,
    geofenceLongitude: venueLongitude || null,
    geofenceRadiusMeters: 100
  });
  
  // QR state
  const [qrToken, setQrToken] = useState<string>('');
  const [qrPinCode, setQrPinCode] = useState<string>('');
  const [qrImageData, setQrImageData] = useState<string>('');
  const [qrExpires, setQrExpires] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rotationTimerRef.current) clearInterval(rotationTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Start auto-rotation when enabled
  useEffect(() => {
    if (isRotating && settings.autoRotateEnabled) {
      startRotationLoop();
    } else {
      stopRotationLoop();
    }
    return () => stopRotationLoop();
  }, [isRotating, settings.autoRotateEnabled, settings.rotateIntervalSeconds]);

  const startRotationLoop = () => {
    stopRotationLoop();
    
    // Set countdown
    setCountdown(settings.rotateIntervalSeconds);
    
    // Countdown timer
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return settings.rotateIntervalSeconds;
        return prev - 1;
      });
    }, 1000);
    
    // Rotation timer
    rotationTimerRef.current = setInterval(() => {
      generateSecureQRCode();
    }, settings.rotateIntervalSeconds * 1000);
  };

  const stopRotationLoop = () => {
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const generateSecureQRCode = async () => {
    if (!user || !eventId) return;

    setGenerating(true);
    try {
      // Use type assertion until types refresh
      const { data, error } = await (supabase.rpc as any)('generate_rotating_qr_code', {
        p_event_id: eventId,
        p_created_by: user.id,
        p_rotate_interval_seconds: settings.autoRotateEnabled ? settings.rotateIntervalSeconds : 3600,
        p_time_window_enabled: settings.timeWindowEnabled,
        p_time_window_minutes: settings.timeWindowMinutes,
        p_geofence_enabled: settings.geofenceEnabled,
        p_geofence_latitude: settings.geofenceLatitude,
        p_geofence_longitude: settings.geofenceLongitude,
        p_geofence_radius_meters: settings.geofenceRadiusMeters
      });

      if (error) throw error;

      const result = data as { token: string; pin_code: string; token_id: string; expires_at: string };
      
      setQrToken(result.token);
      setQrPinCode(result.pin_code);
      setQrExpires(new Date(result.expires_at));
      
      // Generate QR image
      const baseUrl = window.location.hostname.includes('lovable') 
        ? 'https://gleeworld.org' 
        : window.location.origin;
      const attendanceUrl = `${baseUrl}/attendance/scan?token=${encodeURIComponent(result.token)}`;
      
      const qrDataURL = await QRCode.toDataURL(attendanceUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      
      setQrImageData(qrDataURL);
      
      if (!isRotating) {
        toast({
          title: "QR Code Generated",
          description: settings.autoRotateEnabled 
            ? `Auto-rotating every ${settings.rotateIntervalSeconds} seconds`
            : "Secure attendance code ready",
        });
      }

    } catch (error) {
      console.error('Error generating secure QR:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const toggleAutoRotation = () => {
    if (isRotating) {
      setIsRotating(false);
      stopRotationLoop();
      toast({ title: "Auto-rotation paused" });
    } else {
      setIsRotating(true);
      generateSecureQRCode();
      toast({ title: "Auto-rotation started" });
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Available",
        description: "Your browser doesn't support geolocation",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSettings(prev => ({
          ...prev,
          geofenceLatitude: position.coords.latitude,
          geofenceLongitude: position.coords.longitude
        }));
        toast({ title: "Location captured for geofencing" });
      },
      (error) => {
        toast({
          title: "Location Error",
          description: error.message,
          variant: "destructive",
        });
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Security Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Attendance Security Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-Rotate Toggle */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                <Label>Auto-Rotating QR Codes</Label>
              </div>
              <Switch
                checked={settings.autoRotateEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoRotateEnabled: checked }))}
              />
            </div>
            
            {settings.autoRotateEnabled && (
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">
                  Rotation Interval: {settings.rotateIntervalSeconds} seconds
                </Label>
                <Slider
                  value={[settings.rotateIntervalSeconds]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, rotateIntervalSeconds: value }))}
                  min={30}
                  max={120}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30s (High Security)</span>
                  <span>120s (Moderate)</span>
                </div>
              </div>
            )}
          </div>

          {/* Time Window Toggle */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label>Time Window Restriction</Label>
              </div>
              <Switch
                checked={settings.timeWindowEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, timeWindowEnabled: checked }))}
              />
            </div>
            
            {settings.timeWindowEnabled && (
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">
                  Allow check-in within ±{settings.timeWindowMinutes} minutes of event start
                </Label>
                <Slider
                  value={[settings.timeWindowMinutes]}
                  onValueChange={([value]) => setSettings(prev => ({ ...prev, timeWindowMinutes: value }))}
                  min={5}
                  max={60}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 min (Strict)</span>
                  <span>60 min (Lenient)</span>
                </div>
              </div>
            )}
          </div>

          {/* Geofencing Toggle */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <Label>Geofencing (Location Verification)</Label>
              </div>
              <Switch
                checked={settings.geofenceEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, geofenceEnabled: checked }))}
              />
            </div>
            
            {settings.geofenceEnabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Latitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={settings.geofenceLatitude || ''}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        geofenceLatitude: parseFloat(e.target.value) || null 
                      }))}
                      placeholder="33.7490"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Longitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={settings.geofenceLongitude || ''}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        geofenceLongitude: parseFloat(e.target.value) || null 
                      }))}
                      placeholder="-84.3880"
                    />
                  </div>
                </div>
                
                <Button onClick={handleGetCurrentLocation} variant="outline" size="sm" className="w-full">
                  <MapPin className="h-4 w-4 mr-2" />
                  Use Current Location
                </Button>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Required proximity: {settings.geofenceRadiusMeters} meters
                  </Label>
                  <Slider
                    value={[settings.geofenceRadiusMeters]}
                    onValueChange={([value]) => setSettings(prev => ({ ...prev, geofenceRadiusMeters: value }))}
                    min={25}
                    max={500}
                    step={25}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>25m (Strict)</span>
                    <span>500m (Campus-wide)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active QR Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Secure QR Code for {eventTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!qrImageData ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Configure security settings above, then generate your secure attendance code.
              </p>
              <Button onClick={generateSecureQRCode} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate Secure QR
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* QR Image */}
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <img src={qrImageData} alt="QR Code" className="w-56 h-56" />
                </div>
              </div>

              {/* Security badges */}
              <div className="flex flex-wrap justify-center gap-2">
                {settings.autoRotateEnabled && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Auto-rotating ({settings.rotateIntervalSeconds}s)
                  </Badge>
                )}
                {settings.timeWindowEnabled && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ±{settings.timeWindowMinutes} min window
                  </Badge>
                )}
                {settings.geofenceEnabled && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {settings.geofenceRadiusMeters}m radius
                  </Badge>
                )}
              </div>

              {/* Countdown for auto-rotate */}
              {settings.autoRotateEnabled && isRotating && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                  <Timer className="h-4 w-4" />
                  <AlertDescription>
                    New code in: <strong>{countdown}s</strong>
                  </AlertDescription>
                </Alert>
              )}

              {/* PIN Code Display */}
              {qrPinCode && (
                <div className="bg-muted/50 rounded-lg p-4 text-center border-2 border-dashed">
                  <div className="text-sm text-muted-foreground mb-2">Fallback PIN Code</div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-mono font-bold tracking-[0.4em]">
                      {qrPinCode}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(qrPinCode);
                        setPinCopied(true);
                        setTimeout(() => setPinCopied(false), 2000);
                        toast({ title: "PIN copied!" });
                      }}
                    >
                      {pinCopied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Expiration info */}
              {qrExpires && (
                <p className="text-center text-sm text-muted-foreground">
                  Expires: {format(qrExpires, 'h:mm:ss a')}
                </p>
              )}

              {/* Controls */}
              <div className="flex gap-2">
                {settings.autoRotateEnabled ? (
                  <Button 
                    onClick={toggleAutoRotation} 
                    variant={isRotating ? "destructive" : "default"}
                    className="flex-1"
                  >
                    {isRotating ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause Rotation
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Rotation
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={generateSecureQRCode} className="flex-1" disabled={generating}>
                    {generating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceSecurityControls;

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { QrCode, Download, Copy, Share2, Calendar, Clock, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface GleeEvent {
  id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  location?: string;
}

interface QRAttendanceGeneratorProps {
  selectedEventId?: string;
  onEventChange?: (eventId: string) => void;
}

export const QRAttendanceGenerator = ({ selectedEventId, onEventChange }: QRAttendanceGeneratorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<GleeEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>(selectedEventId || '');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [expirationMinutes, setExpirationMinutes] = useState(30);

  useEffect(() => {
    checkPermissions();
  }, [user]);

  useEffect(() => {
    if (hasPermission) {
      loadEvents();
    }
  }, [hasPermission]);

  useEffect(() => {
    if (selectedEventId && selectedEventId !== selectedEvent) {
      setSelectedEvent(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEvent) {
      generateAttendanceQR();
      onEventChange?.(selectedEvent);
    }
  }, [selectedEvent, expirationMinutes]);

  const checkPermissions = async () => {
    if (!user) return;

    try {
      const { data: profile, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, is_exec_board, exec_board_role, special_roles')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      const isAdmin = profile?.is_admin || profile?.is_super_admin;
      const isExecBoard = profile?.is_exec_board;
      const isSecretary = profile?.exec_board_role?.toLowerCase() === 'secretary';
      const hasSecretaryRole = profile?.special_roles?.includes('secretary');
      
      setHasPermission(isAdmin || isExecBoard || isSecretary || hasSecretaryRole);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
    }
  };

  const loadEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('gw_events')
        .select('id, title, event_type, start_date, end_date, location')
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    }
  };

  const generateAttendanceQR = async () => {
    if (!selectedEvent || !user) return;

    setLoading(true);
    try {
      // Generate a unique token for this QR code
      const { data, error } = await supabase.rpc('generate_qr_attendance_token', {
        p_event_id: selectedEvent,
        p_created_by: user.id,
        p_expires_in_minutes: expirationMinutes
      });

      if (error) throw error;
      
      const token = data as string;
      setQrToken(token);

      // Create the scan URL
      const scanUrl = `${window.location.origin}/attendance-scan?token=${token}`;
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(scanUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e40af', // Primary blue
          light: '#ffffff'
        }
      });
      
      setQrCodeUrl(qrDataUrl);
      
      toast({
        title: "QR Code Generated",
        description: `Attendance QR code created (expires in ${expirationMinutes} minutes)`,
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate attendance QR code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl || !selectedEvent) return;
    
    const selectedEventData = events.find(e => e.id === selectedEvent);
    const eventTitle = selectedEventData?.title || 'Event';
    const formattedDate = selectedEventData ? format(new Date(selectedEventData.start_date), 'yyyy-MM-dd') : 'unknown';
    
    const link = document.createElement('a');
    link.download = `attendance-qr-${eventTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${formattedDate}.png`;
    link.href = qrCodeUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Downloaded",
      description: "Attendance QR code saved to downloads",
    });
  };

  const copyQRCode = async () => {
    if (!qrCodeUrl) return;
    
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      toast({
        title: "Copied",
        description: "QR code copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying QR code:', error);
      toast({
        title: "Error",
        description: "Failed to copy QR code",
        variant: "destructive",
      });
    }
  };

  const shareQRCode = async () => {
    if (!qrCodeUrl || !selectedEvent) return;
    
    try {
      const selectedEventData = events.find(e => e.id === selectedEvent);
      const title = `Attendance QR - ${selectedEventData?.title}`;
      const text = 'Scan this QR code to check in for attendance';
      
      // Check if file sharing is supported
      if (navigator.share && navigator.canShare) {
        try {
          const response = await fetch(qrCodeUrl);
          const blob = await response.blob();
          const file = new File([blob], 'attendance-qr-code.png', { type: 'image/png' });
          
          // Check if the browser can share files
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title,
              text,
              files: [file]
            });
            return;
          }
        } catch (fileShareError) {
          console.log('File sharing not supported, falling back to text sharing:', fileShareError);
        }
      }
      
      // Fallback: Share just the URL if file sharing isn't supported
      if (navigator.share) {
        const scanUrl = `${window.location.origin}/attendance-scan?token=${qrToken}`;
        await navigator.share({
          title,
          text,
          url: scanUrl
        });
      } else {
        // Final fallback: Copy to clipboard
        const scanUrl = `${window.location.origin}/attendance-scan?token=${qrToken}`;
        await navigator.clipboard.writeText(`${title}\n${text}\n${scanUrl}`);
        toast({
          title: "Copied to Clipboard",
          description: "QR code link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      toast({
        title: "Error",
        description: "Failed to share QR code. You can try downloading it instead.",
        variant: "destructive",
      });
    }
  };

  const regenerateQR = () => {
    if (selectedEvent) {
      generateAttendanceQR();
    }
  };

  if (!hasPermission) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>You don't have permission to generate attendance QR codes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedEventData = events.find(e => e.id === selectedEvent);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Attendance QR Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Event Selection */}
        <div className="space-y-2">
          <Label htmlFor="event-select">Select Event/Class</Label>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an event to generate QR code for..." />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.start_date), 'MMM dd, yyyy h:mm a')} • {event.event_type}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expiration Setting */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiration">QR Code Expires (minutes)</Label>
            <Input
              id="expiration"
              type="number"
              min="5"
              max="180"
              value={expirationMinutes}
              onChange={(e) => setExpirationMinutes(parseInt(e.target.value) || 30)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={regenerateQR}
              disabled={!selectedEvent || loading}
              variant="outline"
              className="w-full"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Event Info */}
        {selectedEventData && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{selectedEventData.title}</span>
                  <Badge variant="outline">{selectedEventData.event_type}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(new Date(selectedEventData.start_date), 'EEEE, MMMM dd, yyyy h:mm a')}
                </div>
                {selectedEventData.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {selectedEventData.location}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Code Display */}
        {qrCodeUrl && selectedEventData && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-6 bg-white rounded-lg shadow-sm border">
                <img 
                  src={qrCodeUrl} 
                  alt="Attendance QR Code" 
                  className="w-64 h-64"
                />
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Scan for Attendance</p>
              <p className="text-xs text-muted-foreground">
                Token expires in {expirationMinutes} minutes
              </p>
              {qrToken && (
                <p className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  Token: {qrToken.substring(0, 8)}...
                </p>
              )}
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadQRCode}
                disabled={loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={copyQRCode}
                disabled={loading}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
              
              {(navigator.share || navigator.clipboard) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareQRCode}
                  disabled={loading}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="text-center text-muted-foreground">
            Generating attendance QR code...
          </div>
        )}

        {!selectedEvent && (
          <div className="text-center text-muted-foreground py-8">
            <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Select an event to generate an attendance QR code</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
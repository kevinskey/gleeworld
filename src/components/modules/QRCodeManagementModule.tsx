import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Calendar, History, BarChart, MapPin, Link, Download, ChevronRight, Smartphone, Scan, Clock, CheckCircle2 } from 'lucide-react';
import { QRAttendanceGenerator } from '@/components/attendance/QRAttendanceGenerator';
import { AttendanceSecurityControls } from '@/components/attendance/AttendanceSecurityControls';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';

interface QRToken {
  id: string;
  token: string;
  event_id: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  scan_count: number;
  max_scans: number | null;
  event?: {
    title: string;
    event_type: string;
    start_date: string;
  };
}

export const QRCodeManagementModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTokens, setActiveTokens] = useState<QRToken[]>([]);
  const [historicalTokens, setHistoricalTokens] = useState<QRToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('');
  const [stats, setStats] = useState({
    totalGenerated: 0,
    totalScans: 0,
    activeTokens: 0,
    expiredTokens: 0
  });

  useEffect(() => {
    loadTokenData();
  }, []);

  const loadTokenData = async () => {
    setLoading(true);
    try {
      const { data: activeData, error: activeError } = await supabase
        .from('qr_attendance_tokens')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: historicalData, error: historicalError } = await supabase
        .from('qr_attendance_tokens')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (historicalError) throw historicalError;

      const eventIds = [...new Set([
        ...(activeData?.map(t => t.event_id) || []),
        ...(historicalData?.map(t => t.event_id) || [])
      ])];

      let eventData: any[] = [];
      if (eventIds.length > 0) {
        const { data: events, error: eventsError } = await supabase
          .from('gw_events')
          .select('id, title, event_type, start_date')
          .in('id', eventIds);

        if (!eventsError) {
          eventData = events || [];
        }
      }

      const enrichTokens = (tokens: any[]) => tokens.map(token => ({
        ...token,
        event: eventData.find(e => e.id === token.event_id)
      }));

      const enrichedActiveTokens = enrichTokens(activeData || []);
      const enrichedHistoricalTokens = enrichTokens(historicalData || []);

      setActiveTokens(enrichedActiveTokens);
      setHistoricalTokens(enrichedHistoricalTokens);

      const total = enrichedHistoricalTokens.length;
      const totalScans = enrichedHistoricalTokens.reduce((sum, token) => sum + token.scan_count, 0);
      const active = enrichedActiveTokens.length;
      const expired = total - active;

      setStats({
        totalGenerated: total,
        totalScans,
        activeTokens: active,
        expiredTokens: expired
      });

    } catch (error) {
      console.error('Error loading QR token data:', error);
      toast({
        title: "Error",
        description: "Failed to load QR code data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deactivateToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('qr_attendance_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "QR code deactivated",
      });

      loadTokenData();
    } catch (error) {
      console.error('Error deactivating token:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate QR code",
        variant: "destructive",
      });
    }
  };

  const generateUrlQRCode = async (url: string) => {
    try {
      const baseUrl = window.location.hostname.includes('lovable') 
        ? 'https://gleeworld.org' 
        : window.location.origin;
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      const qrDataUrl = await QRCode.toDataURL(fullUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
      
      toast({
        title: "Success",
        description: "QR code generated successfully",
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `qr-code-${customUrl.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const quickLinks = [
    { name: 'Bowman Scholars', url: '/bowman-scholars' },
    { name: 'Public Calendar', url: '/calendar' },
    { name: 'Home Page', url: '/' },
  ];

  // Mobile-optimized Token Card
  const TokenCard = ({ token, showActions = false }: { token: QRToken; showActions?: boolean }) => {
    const isExpired = new Date() > new Date(token.expires_at);
    const isActive = token.is_active && !isExpired;

    return (
      <div className="rounded-xl p-4 mb-3 active:scale-[0.98] transition-transform" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm line-clamp-1" style={{ color: '#0f172a' }}>{token.event?.title || 'Unknown Event'}</h4>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge 
                variant={isActive ? "default" : "secondary"}
                className={`text-xs ${isActive ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}`}
              >
                {isActive ? (
                  <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                ) : isExpired ? (
                  <><Clock className="h-3 w-3 mr-1" />Expired</>
                ) : 'Inactive'}
              </Badge>
              <span className="text-xs" style={{ color: '#64748b' }}>{token.event?.event_type}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-primary">{token.scan_count}</div>
            <div className="text-xs" style={{ color: '#64748b' }}>scans</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #f1f5f9' }}>
          <div className="flex items-center gap-4 text-xs" style={{ color: '#64748b' }}>
            <span>Created {format(new Date(token.created_at), 'MMM d, h:mm a')}</span>
          </div>
          {showActions && isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deactivateToken(token.id)}
              className="h-8 text-xs text-destructive hover:text-destructive"
            >
              Deactivate
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Compact Stats Bar
  const CompactStats = () => (
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 p-3 rounded-lg border" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
      <div className="flex items-center gap-1.5">
        <QrCode className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs" style={{ color: '#64748b' }}>Generated:</span>
        <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>{stats.totalGenerated}</span>
      </div>
      <div className="hidden sm:block w-px h-4" style={{ background: '#e2e8f0' }} />
      <div className="flex items-center gap-1.5">
        <Scan className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs" style={{ color: '#64748b' }}>Scans:</span>
        <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>{stats.totalScans}</span>
      </div>
      <div className="hidden sm:block w-px h-4" style={{ background: '#e2e8f0' }} />
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs" style={{ color: '#64748b' }}>Active:</span>
        <span className="text-xs font-semibold text-green-600">{stats.activeTokens}</span>
      </div>
      <div className="hidden sm:block w-px h-4" style={{ background: '#e2e8f0' }} />
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-orange-500" />
        <span className="text-xs" style={{ color: '#64748b' }}>Expired:</span>
        <span className="text-xs font-semibold text-orange-600">{stats.expiredTokens}</span>
      </div>
    </div>
  );

  return (
    <div className="h-full p-4 sm:p-6 academy-neutral" style={{ background: '#f8f9fb' }}>
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: '#0f172a' }}>QR Management</h1>
            <p className="text-xs sm:text-sm" style={{ color: '#64748b' }}>
              Generate & track attendance codes
            </p>
          </div>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <CompactStats />

      {/* Mobile-First Tabs */}
      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="w-full h-auto p-1 rounded-xl mb-4 grid grid-cols-3 sm:grid-cols-5 gap-1" style={{ background: '#e2e8f0' }}>
          <TabsTrigger 
            value="generator" 
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-sm sm:text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            style={{ color: '#334155' }}
          >
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
            <span className="sm:hidden">QR</span>
          </TabsTrigger>
          <TabsTrigger 
            value="url-generator" 
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-sm sm:text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            style={{ color: '#334155' }}
          >
            <Link className="h-4 w-4" />
            <span className="hidden sm:inline">URL Code</span>
            <span className="sm:hidden">URL</span>
          </TabsTrigger>
          <TabsTrigger 
            value="active" 
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 text-sm sm:text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            style={{ color: '#334155' }}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden xs:inline">Active</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{stats.activeTokens}</Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="hidden sm:flex flex-1 items-center justify-center gap-1.5 py-2.5 px-2 text-sm sm:text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            style={{ color: '#334155' }}
          >
            <History className="h-4 w-4" />
            <span>History</span>
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="hidden sm:flex flex-1 items-center justify-center gap-1.5 py-2.5 px-2 text-sm sm:text-base rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
            style={{ color: '#334155' }}
          >
            <MapPin className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Mobile-only extra tabs row */}
        <div className="sm:hidden grid grid-cols-2 gap-2 mb-4">
          <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-xl">
            <TabsTrigger 
              value="history" 
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
          <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-xl">
            <TabsTrigger 
              value="settings" 
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2 text-xs rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <MapPin className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="generator" className="mt-0">
          <QRAttendanceGenerator 
            onEventChange={(eventId, eventTitle) => {
              setSelectedEventId(eventId);
              setSelectedEventTitle(eventTitle || '');
              loadTokenData();
            }}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          {selectedEventId ? (
            <AttendanceSecurityControls
              eventId={selectedEventId}
              eventTitle={selectedEventTitle || 'Selected Event'}
            />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 sm:py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-base font-medium mb-1">No Event Selected</p>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                  Select an event in the "QR" tab to configure geofencing
                </p>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const tabsElement = document.querySelector('[value="generator"]');
                    if (tabsElement instanceof HTMLElement) tabsElement.click();
                  }}
                >
                  Go to QR Generator
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="url-generator" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Link className="h-5 w-5 text-primary" />
                  Generate URL QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="custom-url" className="text-sm">Enter URL or Path</Label>
                  <Input
                    id="custom-url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="/bowman-scholars or https://..."
                    className="mt-1.5 h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Quick Links</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickLinks.map((link) => (
                      <Button
                        key={link.url}
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomUrl(link.url)}
                        className="text-xs h-8"
                      >
                        {link.name}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={() => generateUrlQRCode(customUrl)}
                  disabled={!customUrl.trim()}
                  className="w-full h-11"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Generated QR Code</CardTitle>
              </CardHeader>
              <CardContent>
                {qrCodeDataUrl ? (
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border flex justify-center">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Generated QR Code" 
                        className="max-w-[200px] sm:max-w-full h-auto"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-center break-all px-2">
                      {customUrl.startsWith('http') ? customUrl : `${window.location.hostname.includes('lovable') ? 'https://gleeworld.org' : window.location.origin}${customUrl}`}
                    </div>
                    <Button 
                      onClick={downloadQRCode}
                      className="w-full h-11"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download QR Code
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <QrCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Enter a URL to generate a QR code</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Active QR Codes</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {stats.activeTokens} active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                </div>
              ) : activeTokens.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <QrCode className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No active QR codes</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] sm:h-[500px] -mx-1 px-1">
                  {activeTokens.map((token) => (
                    <TokenCard key={token.id} token={token} showActions={true} />
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">History (30 Days)</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {historicalTokens.length} records
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                </div>
              ) : historicalTokens.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <History className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No QR codes generated yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] sm:h-[500px] -mx-1 px-1">
                  {historicalTokens.map((token) => (
                    <TokenCard key={token.id} token={token} />
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Calendar, History, Settings, BarChart } from 'lucide-react';
import { QRAttendanceGenerator } from '@/components/attendance/QRAttendanceGenerator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

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
  const [activeTokens, setActiveTokens] = useState<QRToken[]>([]);
  const [historicalTokens, setHistoricalTokens] = useState<QRToken[]>([]);
  const [loading, setLoading] = useState(false);
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
      // Load active tokens with proper joins
      const { data: activeData, error: activeError } = await supabase
        .from('qr_attendance_tokens')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (activeError) throw activeError;

      // Load historical tokens (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: historicalData, error: historicalError } = await supabase
        .from('qr_attendance_tokens')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (historicalError) throw historicalError;

      // Get event details for tokens
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

      // Combine token data with event details
      const enrichTokens = (tokens: any[]) => tokens.map(token => ({
        ...token,
        event: eventData.find(e => e.id === token.event_id)
      }));

      const enrichedActiveTokens = enrichTokens(activeData || []);
      const enrichedHistoricalTokens = enrichTokens(historicalData || []);

      setActiveTokens(enrichedActiveTokens);
      setHistoricalTokens(enrichedHistoricalTokens);

      // Calculate stats
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

      loadTokenData(); // Refresh data
    } catch (error) {
      console.error('Error deactivating token:', error);
      toast({
        title: "Error",
        description: "Failed to deactivate QR code",
        variant: "destructive",
      });
    }
  };

  const TokenCard = ({ token, showActions = false }: { token: QRToken; showActions?: boolean }) => {
    const isExpired = new Date() > new Date(token.expires_at);
    const isActive = token.is_active && !isExpired;

    return (
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex justify-between items-start mb-3">
            <div className="space-y-1">
              <h4 className="font-medium">{token.event?.title || 'Unknown Event'}</h4>
              <div className="flex gap-2">
                <Badge variant="outline">{token.event?.event_type || 'Unknown'}</Badge>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Active" : isExpired ? "Expired" : "Inactive"}
                </Badge>
              </div>
            </div>
            {showActions && isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deactivateToken(token.id)}
              >
                Deactivate
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>
              <p>{format(new Date(token.created_at), 'MMM dd, h:mm a')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expires:</span>
              <p>{format(new Date(token.expires_at), 'MMM dd, h:mm a')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Scans:</span>
              <p>{token.scan_count}{token.max_scans ? ` / ${token.max_scans}` : ''}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Token ID:</span>
              <p className="font-mono text-xs">{token.token.substring(0, 12)}...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">QR Code Management</h1>
        <p className="text-muted-foreground">
          Generate and manage attendance QR codes for any event or class
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Generated</p>
                <p className="text-2xl font-bold">{stats.totalGenerated}</p>
              </div>
              <QrCode className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Scans</p>
                <p className="text-2xl font-bold">{stats.totalScans}</p>
              </div>
              <BarChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active QR Codes</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeTokens}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expiredTokens}</p>
              </div>
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Generate QR Code
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Active Codes ({stats.activeTokens})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="mt-6">
          <QRAttendanceGenerator onEventChange={loadTokenData} />
        </TabsContent>

        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active QR Codes</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading active QR codes...</div>
              ) : activeTokens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No active QR codes found</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  {activeTokens.map((token) => (
                    <TokenCard key={token.id} token={token} showActions={true} />
                  ))}
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>QR Code History (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading QR code history...</div>
              ) : historicalTokens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No QR codes found</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
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
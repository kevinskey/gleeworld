import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isValid } from 'date-fns';
import { 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Search,
  Download,
  Eye
} from 'lucide-react';

interface QRScanLog {
  id: string;
  qr_token: string;
  user_id?: string | null;
  event_id?: string | null;
  scan_status: 'success' | 'failed' | 'duplicate' | 'expired';
  scan_result: any;
  ip_address?: string | null;
  user_agent?: string | null;
  scan_location?: string | null;
  scanned_at: string;
  created_at: string | null;
  user_name?: string;
  user_email?: string;
  event_title?: string;
}

export const QRScanHistory = () => {
  const { user } = useAuth();
  const [scanLogs, setScanLogs] = useState<QRScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchScanLogs();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('gw_profiles')
      .select('is_admin, is_super_admin')
      .eq('user_id', user.id)
      .single();
    
    setIsAdmin(profile?.is_admin || profile?.is_super_admin || false);
  };

  const fetchScanLogs = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch scan logs with manual joins due to foreign key constraints
      const { data: scanLogs, error } = await supabase
        .from('qr_scan_logs')
        .select('*')
        .order('scanned_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!scanLogs) {
        setScanLogs([]);
        return;
      }

      // Get unique user IDs and event IDs
      const userIds = [...new Set(scanLogs.map(log => log.user_id).filter(Boolean))];
      const eventIds = [...new Set(scanLogs.map(log => log.event_id).filter(Boolean))];

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      // Fetch events
      const { data: events } = await supabase
        .from('gw_events')
        .select('id, title')
        .in('id', eventIds);

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const eventMap = new Map(events?.map(e => [e.id, e]) || []);

      // Transform the data
      const transformedData: QRScanLog[] = scanLogs.map(log => {
        const profile = profileMap.get(log.user_id!);
        const event = eventMap.get(log.event_id!);
        
        return {
          ...log,
          scan_status: log.scan_status as 'success' | 'failed' | 'duplicate' | 'expired',
          ip_address: log.ip_address as string | null,
          user_agent: log.user_agent as string | null,
          scan_location: log.scan_location as string | null,
          user_name: profile?.full_name || 'Unknown User',
          user_email: profile?.email || 'N/A',
          event_title: event?.title || 'Unknown Event'
        };
      });

      setScanLogs(transformedData);
    } catch (error) {
      console.error('Error fetching scan logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'duplicate':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      duplicate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <Badge className={`${variants[status as keyof typeof variants]} capitalize`}>
        {getStatusIcon(status)}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  const filteredLogs = scanLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.scan_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Email', 'Event', 'Status', 'IP Address', 'Location'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.scanned_at), 'yyyy-MM-dd HH:mm:ss'),
        `"${log.user_name}"`,
        log.user_email,
        `"${log.event_title}"`,
        log.scan_status,
        log.ip_address || 'N/A',
        `"${log.scan_location || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-scan-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view QR scan history.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              QR Scan History
            </CardTitle>
            {isAdmin && (
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user, email, or event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="duplicate">Duplicate</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Scan Logs */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Loading scan history...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {searchTerm || statusFilter !== 'all' 
                  ? 'No scan logs match your filter criteria.'
                  : 'No QR scans recorded yet.'
                }
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <Card key={log.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="pt-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      {/* User & Event Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{log.user_name}</p>
                            <p className="text-xs text-muted-foreground">{log.user_email}</p>
                          </div>
                        </div>
                        {log.event_title && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">{log.event_title}</p>
                          </div>
                        )}
                      </div>

                      {/* Status & Timestamp */}
                      <div className="space-y-2">
                        {getStatusBadge(log.scan_status)}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            {isValid(new Date(log.scanned_at)) 
                              ? format(new Date(log.scanned_at), 'MMM dd, yyyy HH:mm')
                              : 'Invalid date'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <div className="space-y-1">
                        {log.ip_address && (
                          <p className="text-xs text-muted-foreground">
                            IP: {log.ip_address}
                          </p>
                        )}
                        {log.scan_location && (
                          <p className="text-xs text-muted-foreground">
                            Location: {log.scan_location}
                          </p>
                        )}
                        {log.scan_result?.message && (
                          <p className="text-xs text-muted-foreground">
                            {log.scan_result.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {!loading && filteredLogs.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {filteredLogs.filter(log => log.scan_status === 'success').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Successful</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {filteredLogs.filter(log => log.scan_status === 'failed').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {filteredLogs.filter(log => log.scan_status === 'duplicate').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Duplicates</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {filteredLogs.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Scans</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
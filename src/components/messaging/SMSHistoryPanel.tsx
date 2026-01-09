import React, { useState, useMemo } from 'react';
import { format, isToday, isYesterday, parseISO, startOfDay } from 'date-fns';
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter, ChevronDown, ChevronUp, Phone, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationDelivery, NotificationDeliveryLog } from '@/hooks/useNotificationDelivery';
import { cn } from '@/lib/utils';

export const SMSHistoryPanel = () => {
  const { deliveryLogs, loading } = useNotificationDelivery();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Filter for SMS logs only
  const smsLogs = useMemo(() => 
    deliveryLogs.filter(log => log.delivery_method === 'sms'),
    [deliveryLogs]
  );

  // Apply search and status filters
  const filteredLogs = useMemo(() => {
    return smsLogs.filter(log => {
      const matchesSearch = !searchQuery || 
        log.external_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.error_message?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [smsLogs, searchQuery, statusFilter]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, NotificationDeliveryLog[]> = {};
    
    filteredLogs.forEach(log => {
      const date = format(parseISO(log.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });

    // Sort groups by date (newest first)
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, logs]) => ({
        date,
        logs: logs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }));
  }, [filteredLogs]);

  // Auto-expand today's date
  React.useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setExpandedDates(new Set([today]));
  }, []);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Stats summary
  const stats = useMemo(() => ({
    total: smsLogs.length,
    delivered: smsLogs.filter(l => l.status === 'delivered').length,
    sent: smsLogs.filter(l => l.status === 'sent').length,
    failed: smsLogs.filter(l => l.status === 'failed').length,
    pending: smsLogs.filter(l => l.status === 'pending').length,
  }), [smsLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header Stats */}
      <div className="flex-shrink-0 p-4 bg-background border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">SMS History</h3>
          <Badge variant="secondary" className="ml-auto">{stats.total} messages</Badge>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-green-500/10">
            <div className="text-lg font-bold text-green-600">{stats.delivered}</div>
            <div className="text-xs text-muted-foreground">Delivered</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10">
            <div className="text-lg font-bold text-blue-600">{stats.sent}</div>
            <div className="text-xs text-muted-foreground">Sent</div>
          </div>
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <div className="text-lg font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10">
            <div className="text-lg font-bold text-destructive">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1">
        {groupedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Phone className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {smsLogs.length === 0 
                ? 'No SMS messages sent yet' 
                : 'No messages match your filters'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {groupedLogs.map(({ date, logs }) => (
              <Collapsible
                key={date}
                open={expandedDates.has(date)}
                onOpenChange={() => toggleDate(date)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-3 py-2 h-auto hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{formatDateHeader(date)}</span>
                      <Badge variant="outline" className="text-xs">
                        {logs.length}
                      </Badge>
                    </div>
                    {expandedDates.has(date) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-1 mt-1">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={cn(
                        "ml-2 p-3 rounded-lg border",
                        log.status === 'failed' 
                          ? 'bg-destructive/5 border-destructive/20' 
                          : 'bg-muted/50 border-border'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <Badge variant={getStatusBadgeVariant(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(log.created_at), 'h:mm a')}
                        </span>
                      </div>

                      {/* Timestamps */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {log.sent_at && (
                          <div>
                            <span className="text-muted-foreground">Sent: </span>
                            <span>{format(parseISO(log.sent_at), 'h:mm a')}</span>
                          </div>
                        )}
                        {log.delivered_at && (
                          <div>
                            <span className="text-muted-foreground">Delivered: </span>
                            <span>{format(parseISO(log.delivered_at), 'h:mm a')}</span>
                          </div>
                        )}
                      </div>

                      {/* External ID */}
                      {log.external_id && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">ID: </span>
                          <code className="font-mono bg-muted px-1 rounded">
                            {log.external_id.slice(0, 20)}...
                          </code>
                        </div>
                      )}

                      {/* Error Message */}
                      {log.error_message && (
                        <div className="mt-2 p-2 rounded bg-destructive/10 text-xs text-destructive">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

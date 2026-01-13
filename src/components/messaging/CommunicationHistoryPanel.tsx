import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Mail,
  MessageSquare,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGroupedMessageHistory, MessageHistoryItem } from '@/hooks/useMessageHistory';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export const CommunicationHistoryPanel: React.FC = () => {
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'sms'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'sent' | 'received'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(['Today']));

  const { groupedMessages, stats, isLoading, refetch } = useGroupedMessageHistory({
    channel: channelFilter === 'all' ? undefined : channelFilter,
    direction: directionFilter === 'all' ? undefined : directionFilter,
    search: searchQuery || undefined,
  });

  const toggleDate = (label: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'email' ? (
      <Mail className="h-4 w-4" />
    ) : (
      <MessageSquare className="h-4 w-4" />
    );
  };

  const getRecipientDisplay = (msg: MessageHistoryItem) => {
    if (msg.channel === 'email' && msg.recipient_emails?.length) {
      const count = msg.recipient_emails.length;
      return count === 1 ? msg.recipient_emails[0] : `${count} recipients`;
    }
    if (msg.channel === 'sms' && msg.recipient_phones?.length) {
      const count = msg.recipient_phones.length;
      return count === 1 ? msg.recipient_phones[0] : `${count} recipients`;
    }
    return 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Stats */}
      <div className="flex-shrink-0 p-4 bg-muted/50 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Communication History</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-lg bg-primary/10">
            <div className="text-lg font-bold text-primary">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10">
            <div className="text-lg font-bold text-blue-600">{stats.emails}</div>
            <div className="text-xs text-muted-foreground">Emails</div>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10">
            <div className="text-lg font-bold text-green-600">{stats.sms}</div>
            <div className="text-xs text-muted-foreground">SMS</div>
          </div>
          <div className="p-2 rounded-lg bg-destructive/10">
            <div className="text-lg font-bold text-destructive">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={channelFilter} onValueChange={(v) => setChannelFilter(v as typeof channelFilter)}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as typeof directionFilter)}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="received">Received</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1">
        {groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Inbox className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No messages found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.total === 0
                ? 'Your sent emails and SMS will appear here'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {groupedMessages.map(({ label, messages }) => (
              <Collapsible
                key={label}
                open={expandedDates.has(label)}
                onOpenChange={() => toggleDate(label)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between px-3 py-2 h-auto hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{label}</span>
                      <Badge variant="outline" className="text-xs">
                        {messages.length}
                      </Badge>
                    </div>
                    {expandedDates.has(label) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-2 mt-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'p-3 rounded-lg border transition-colors hover:bg-muted/50',
                        msg.status === 'failed'
                          ? 'bg-destructive/5 border-destructive/20'
                          : 'bg-card border-border'
                      )}
                    >
                      {/* Header Row */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'p-1.5 rounded-md',
                              msg.channel === 'email' ? 'bg-blue-500/10' : 'bg-green-500/10'
                            )}
                          >
                            {getChannelIcon(msg.channel)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {msg.direction === 'sent' ? (
                              <Send className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <Inbox className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">
                              {msg.direction}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(msg.status)}
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(msg.created_at), 'h:mm a')}
                          </span>
                        </div>
                      </div>

                      {/* Subject (for email) */}
                      {msg.subject && (
                        <p className="font-medium text-sm text-foreground truncate mb-1">
                          {msg.subject}
                        </p>
                      )}

                      {/* Content Preview */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {msg.content.replace(/<[^>]*>/g, '').slice(0, 150)}
                        {msg.content.length > 150 ? '...' : ''}
                      </p>

                      {/* Recipients */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          To: {getRecipientDisplay(msg)}
                        </span>
                        <Badge
                          variant={
                            msg.status === 'delivered'
                              ? 'default'
                              : msg.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {msg.status}
                        </Badge>
                      </div>

                      {/* Error Message */}
                      {msg.error_message && (
                        <div className="mt-2 p-2 rounded bg-destructive/10 text-xs text-destructive">
                          {msg.error_message}
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

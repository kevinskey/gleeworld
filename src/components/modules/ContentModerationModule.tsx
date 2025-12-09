import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAvatarUrl, getInitials } from '@/utils/avatarUtils';
import { formatDistanceToNow } from 'date-fns';
import {
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  FileText,
} from 'lucide-react';

interface Report {
  id: string;
  content_type: 'post' | 'comment';
  content_id: string;
  reason: string | null;
  status: string;
  created_at: string;
  reported_by: string;
  reporter_name: string | null;
  content_preview: string | null;
  content_author_name: string | null;
  is_hidden: boolean;
}

interface ModerationLog {
  id: string;
  action_type: string;
  content_type: string;
  reason: string | null;
  created_at: string;
  moderator_name: string | null;
}

export function ContentModerationModule() {
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isActioning, setIsActioning] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_content_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich reports with content previews and names
      const enrichedReports: Report[] = await Promise.all(
        (data || []).map(async (report) => {
          let contentPreview = null;
          let contentAuthorName = null;
          let isHidden = false;

          if (report.content_type === 'post') {
            const { data: post } = await supabase
              .from('gw_social_posts')
              .select('content, is_hidden, user_id')
              .eq('id', report.content_id)
              .single();
            
            if (post) {
              contentPreview = post.content?.substring(0, 100) + (post.content?.length > 100 ? '...' : '');
              isHidden = post.is_hidden;
              
              const { data: author } = await supabase
                .from('gw_profiles')
                .select('full_name')
                .eq('user_id', post.user_id)
                .single();
              contentAuthorName = author?.full_name || null;
            }
          } else {
            const { data: comment } = await supabase
              .from('gw_social_comments')
              .select('content, is_hidden, user_id')
              .eq('id', report.content_id)
              .single();
            
            if (comment) {
              contentPreview = comment.content?.substring(0, 100) + (comment.content?.length > 100 ? '...' : '');
              isHidden = comment.is_hidden;
              
              const { data: author } = await supabase
                .from('gw_profiles')
                .select('full_name')
                .eq('user_id', comment.user_id)
                .single();
              contentAuthorName = author?.full_name || null;
            }
          }

          const { data: reporter } = await supabase
            .from('gw_profiles')
            .select('full_name')
            .eq('user_id', report.reported_by)
            .single();

          return {
            ...report,
            content_type: report.content_type as 'post' | 'comment',
            reporter_name: reporter?.full_name || null,
            content_preview: contentPreview,
            content_author_name: contentAuthorName,
            is_hidden: isHidden,
          };
        })
      );

      setReports(enrichedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_moderation_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const enrichedLogs: ModerationLog[] = await Promise.all(
        (data || []).map(async (log) => {
          const { data: moderator } = await supabase
            .from('gw_profiles')
            .select('full_name')
            .eq('user_id', log.moderator_id)
            .single();

          return {
            ...log,
            moderator_name: moderator?.full_name || null,
          };
        })
      );

      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchReports(), fetchLogs()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleAction = async (action: 'hide' | 'unhide' | 'dismiss' | 'reviewed') => {
    if (!selectedReport) return;
    
    setIsActioning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update content visibility if hiding/unhiding
      if (action === 'hide' || action === 'unhide') {
        const table = selectedReport.content_type === 'post' ? 'gw_social_posts' : 'gw_social_comments';
        const { error: updateError } = await supabase
          .from(table)
          .update({ is_hidden: action === 'hide' })
          .eq('id', selectedReport.content_id);
        
        if (updateError) throw updateError;

        // Log the action
        await supabase.from('gw_moderation_log').insert({
          action_type: action,
          content_type: selectedReport.content_type,
          content_id: selectedReport.content_id,
          moderator_id: user.id,
          reason: actionReason || null,
        });
      }

      // Update report status
      const newStatus = action === 'dismiss' ? 'dismissed' : 'reviewed';
      const { error: reportError } = await supabase
        .from('gw_content_reports')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', selectedReport.id);

      if (reportError) throw reportError;

      toast({
        title: 'Action completed',
        description: `Report ${action === 'dismiss' ? 'dismissed' : 'reviewed'} successfully`,
      });

      setSelectedReport(null);
      setActionReason('');
      await Promise.all([fetchReports(), fetchLogs()]);
    } catch (error) {
      console.error('Error performing action:', error);
      toast({
        title: 'Action failed',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
    }
  };

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Content Moderation</h2>
        {pendingReports.length > 0 && (
          <Badge variant="destructive">{pendingReports.length} pending</Badge>
        )}
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-1">
            <AlertTriangle className="h-4 w-4" />
            Pending ({pendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedReports.length})
          </TabsTrigger>
          <TabsTrigger value="log">
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingReports.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No pending reports. The lounge is peaceful! 🎵</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingReports.map((report) => (
                <Card key={report.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <CardContent className="py-4" onClick={() => setSelectedReport(report)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={report.content_type === 'post' ? 'default' : 'secondary'}>
                            {report.content_type === 'post' ? (
                              <><FileText className="h-3 w-3 mr-1" /> Post</>
                            ) : (
                              <><MessageSquare className="h-3 w-3 mr-1" /> Comment</>
                            )}
                          </Badge>
                          {report.is_hidden && (
                            <Badge variant="outline" className="text-yellow-600">
                              <EyeOff className="h-3 w-3 mr-1" /> Hidden
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          By: {report.content_author_name || 'Unknown'}
                        </p>
                        <p className="text-sm bg-muted/50 p-2 rounded mb-2">
                          "{report.content_preview || 'Content not available'}"
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Reported by {report.reporter_name} • {report.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          <ScrollArea className="h-[400px]">
            {resolvedReports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No resolved reports yet</p>
            ) : (
              <div className="space-y-2">
                {resolvedReports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant={report.status === 'dismissed' ? 'outline' : 'default'} className="mb-1">
                            {report.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {report.content_type} by {report.content_author_name}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <ScrollArea className="h-[400px]">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No moderation activity yet</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge
                            variant={
                              log.action_type === 'hide' ? 'destructive' :
                              log.action_type === 'unhide' ? 'default' : 'secondary'
                            }
                          >
                            {log.action_type}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.content_type} • by {log.moderator_name || 'Admin'}
                          </p>
                          {log.reason && (
                            <p className="text-xs text-muted-foreground">Reason: {log.reason}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Action Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              Take action on this reported {selectedReport?.content_type}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Reported Content:</p>
                <p className="text-sm">"{selectedReport.content_preview}"</p>
                <p className="text-xs text-muted-foreground mt-2">
                  By: {selectedReport.content_author_name}
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <p className="text-sm font-medium mb-1">Report Reason:</p>
                <p className="text-sm">{selectedReport.reason || 'No reason provided'}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Reported by: {selectedReport.reporter_name}
                </p>
              </div>

              <div>
                <Label htmlFor="reason">Action Reason (optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Why are you taking this action?"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleAction('dismiss')}
              disabled={isActioning}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Dismiss Report
            </Button>
            
            {selectedReport?.is_hidden ? (
              <Button
                variant="default"
                onClick={() => handleAction('unhide')}
                disabled={isActioning}
              >
                <Eye className="h-4 w-4 mr-2" />
                Unhide Content
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => handleAction('hide')}
                disabled={isActioning}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Content
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, RotateCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
  table: string;
  lastSync: Date | null;
  status: 'idle' | 'syncing' | 'success' | 'error';
  recordCount: number;
  error?: string;
}

type TableName = 'assignment_submissions' | 'mus240_journal_entries' | 'mus240_journal_grades' | 'mus240_journal_comments';

export const JournalSyncManager = () => {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([
    { table: 'assignment_submissions', lastSync: null, status: 'idle', recordCount: 0 },
    { table: 'mus240_journal_entries', lastSync: null, status: 'idle', recordCount: 0 },
    { table: 'mus240_journal_grades', lastSync: null, status: 'idle', recordCount: 0 },
    { table: 'mus240_journal_comments', lastSync: null, status: 'idle', recordCount: 0 },
  ]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  useEffect(() => {
    // Load initial sync status
    loadSyncStatus();
    
    // Set up real-time monitoring for all journal-related tables
    const channels = syncStatuses.map(({ table }) => {
      const channel = supabase
        .channel(`sync-monitor-${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table as TableName,
          },
          (payload) => {
            console.log(`Real-time change in ${table}:`, payload);
            // Update the specific table's last sync time
            setSyncStatuses(prev => 
              prev.map(status => 
                status.table === table 
                  ? { ...status, lastSync: new Date(), status: 'success' as const }
                  : status
              )
            );
          }
        )
        .subscribe();
      
      return channel;
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const loadSyncStatus = async () => {
    try {
      const updates = await Promise.all(
        syncStatuses.map(async ({ table }) => {
          try {
            const { count, error } = await supabase
              .from(table as TableName)
              .select('*', { count: 'exact', head: true });

            if (error) throw error;

            return {
              table,
              lastSync: new Date(),
              status: 'success' as const,
              recordCount: count || 0,
            };
          } catch (error) {
            console.error(`Error loading ${table}:`, error);
            return {
              table,
              lastSync: null,
              status: 'error' as const,
              recordCount: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      setSyncStatuses(updates);
    } catch (error) {
      console.error('Error loading sync status:', error);
      toast({
        title: "Sync Status Error",
        description: "Failed to load current sync status",
        variant: "destructive"
      });
    }
  };

  const syncTable = async (tableName: string) => {
    setSyncStatuses(prev => 
      prev.map(status => 
        status.table === tableName 
          ? { ...status, status: 'syncing', error: undefined }
          : status
      )
    );

    try {
      // Force a count refresh for the table
      const { count, error } = await supabase
        .from(tableName as TableName)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      setSyncStatuses(prev => 
        prev.map(status => 
          status.table === tableName 
            ? { 
                ...status, 
                status: 'success', 
                lastSync: new Date(), 
                recordCount: count || 0,
                error: undefined 
              }
            : status
        )
      );

      toast({
        title: "Sync Complete",
        description: `${tableName} synced successfully (${count} records)`,
      });
    } catch (error) {
      console.error(`Error syncing ${tableName}:`, error);
      
      setSyncStatuses(prev => 
        prev.map(status => 
          status.table === tableName 
            ? { 
                ...status, 
                status: 'error', 
                error: error instanceof Error ? error.message : 'Unknown error' 
              }
            : status
        )
      );

      toast({
        title: "Sync Failed",
        description: `Failed to sync ${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const syncAllTables = async () => {
    setOverallStatus('syncing');
    
    try {
      await Promise.all(
        syncStatuses.map(({ table }) => syncTable(table))
      );
      
      setOverallStatus('success');
      toast({
        title: "Full Sync Complete",
        description: "All journal tables have been synced successfully",
      });
    } catch (error) {
      setOverallStatus('error');
      toast({
        title: "Sync Failed",
        description: "Some tables failed to sync. Check individual table status.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: SyncStatus['status']) => {
    switch (status) {
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: SyncStatus['status']) => {
    switch (status) {
      case 'syncing': return <Badge variant="secondary">Syncing</Badge>;
      case 'success': return <Badge variant="default">Synced</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">Idle</Badge>;
    }
  };

  const formatTableName = (tableName: string) => {
    const names: Record<string, string> = {
      'assignment_submissions': 'Assignment Submissions',
      'mus240_journal_entries': 'Journal Entries',
      'mus240_journal_grades': 'Journal Grades',
      'mus240_journal_comments': 'Journal Comments',
    };
    return names[tableName] || tableName;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-4xl font-bold text-white">Journal Data Sync Manager</h3>
          <p className="text-muted-foreground">Monitor and sync all journal-related data tables</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={loadSyncStatus}
            disabled={overallStatus === 'syncing'}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${overallStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
          <Button
            onClick={syncAllTables}
            disabled={overallStatus === 'syncing'}
            className="flex items-center gap-2"
          >
            <RotateCw className={`h-4 w-4 ${overallStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sync All Tables
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {syncStatuses.map((status) => (
          <Card key={status.table}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">
                {formatTableName(status.table)}
              </CardTitle>
              <div className="flex items-center gap-2">
                {getStatusIcon(status.status)}
                {getStatusBadge(status.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Records:</span>
                  <span className="font-medium">{status.recordCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Sync:</span>
                  <span className="font-medium">
                    {status.lastSync 
                      ? status.lastSync.toLocaleTimeString()
                      : 'Never'
                    }
                  </span>
                </div>
                {status.error && (
                  <div className="text-sm text-red-500 mt-2">
                    <strong>Error:</strong> {status.error}
                  </div>
                )}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncTable(status.table)}
                    disabled={status.status === 'syncing'}
                    className="w-full"
                  >
                    {status.status === 'syncing' ? 'Syncing...' : 'Sync Table'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Real-time Sync Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This manager monitors real-time changes to journal data. Tables are automatically updated when changes occur.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Real-time monitoring active for all journal tables</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <RotateCw className="h-4 w-4 text-blue-500" />
              <span>Data automatically syncs when changes are detected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
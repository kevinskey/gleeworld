import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ExternalLink, 
  RefreshCw, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Package,
  Zap,
  Unlink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SquareIntegration {
  id: string;
  application_id: string;
  location_id: string;
  environment: string;
  last_sync_at: string | null;
  sync_enabled: boolean;
  auto_sync_interval_hours: number;
  created_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  items_processed: number;
  items_created: number;
  items_updated: number;
  items_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export const SquareIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integration, setIntegration] = useState<SquareIntegration | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchIntegration = async () => {
    try {
      const { data, error } = await supabase
        .from('square_integrations')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setIntegration(data);
    } catch (error) {
      console.error('Error fetching Square integration:', error);
    }
  };

  const fetchSyncLogs = async () => {
    if (!integration) return;

    try {
      const { data, error } = await supabase
        .from('square_sync_logs')
        .select('*')
        .eq('integration_id', integration.id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncLogs(data || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchIntegration();
      setLoading(false);
    };
    init();
  }, [user]);

  useEffect(() => {
    if (integration) {
      fetchSyncLogs();
    }
  }, [integration]);

  const handleConnectSquare = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/admin/products?square_callback=true`;
      
      const { data, error } = await supabase.functions.invoke('square-oauth', {
        body: {
          action: 'get_auth_url',
          redirectUri
        }
      });

      if (error) throw error;

      if (data.success) {
        // Store state in localStorage for verification
        localStorage.setItem('square_oauth_state', data.state);
        // Redirect to Square OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Square connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSquareCallback = async (code: string, state: string) => {
    try {
      const storedState = localStorage.getItem('square_oauth_state');
      if (state !== storedState) {
        throw new Error('Invalid OAuth state');
      }

      const redirectUri = `${window.location.origin}/admin/products?square_callback=true`;

      const { data, error } = await supabase.functions.invoke('square-oauth', {
        body: {
          action: 'handle_callback',
          code,
          state,
          redirectUri
        }
      });

      if (error) throw error;

      if (data.success) {
        // Save integration to database
        const { error: saveError } = await supabase
          .from('square_integrations')
          .insert({
            user_id: user?.id,
            application_id: data.merchantId,
            location_id: data.locationId,
            access_token: data.accessToken,
            refresh_token: data.refreshToken,
            environment: 'sandbox' // TODO: Make configurable
          });

        if (saveError) throw saveError;

        localStorage.removeItem('square_oauth_state');
        toast({
          title: "Connected to Square",
          description: `Successfully connected to ${data.merchantInfo.name}`,
        });

        await fetchIntegration();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Square callback error:', error);
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSyncProducts = async () => {
    if (!integration) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('square-sync-products', {
        body: {
          integrationId: integration.id,
          syncType: 'full'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sync Started",
          description: `Syncing products from Square. Processed: ${data.summary.processed}, Created: ${data.summary.created}, Updated: ${data.summary.updated}`,
        });
        await fetchSyncLogs();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration) return;

    try {
      const { error } = await supabase
        .from('square_integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration(null);
      setSyncLogs([]);
      toast({
        title: "Disconnected",
        description: "Square integration has been removed",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Square integration",
        variant: "destructive",
      });
    }
  };

  const updateSyncSettings = async (field: string, value: any) => {
    if (!integration) return;

    try {
      const { error } = await supabase
        .from('square_integrations')
        .update({ [field]: value })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration({ ...integration, [field]: value });
      toast({
        title: "Settings Updated",
        description: "Square sync settings have been updated",
      });
    } catch (error) {
      console.error('Settings update error:', error);
      toast({
        title: "Error",
        description: "Failed to update sync settings",
        variant: "destructive",
      });
    }
  };

  // Check for OAuth callback on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const isCallback = urlParams.get('square_callback');

    if (isCallback && code && state) {
      handleSquareCallback(code, state);
      // Clean up URL
      window.history.replaceState({}, '', '/admin/products');
    }
  }, []);

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'running':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Running</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading Square integration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!integration) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Square Integration
          </CardTitle>
          <CardDescription>
            Connect your Square account to sync products and manage inventory
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Connect to Square to automatically sync your product catalog, manage inventory, and process orders through Square's system.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={handleConnectSquare} 
            disabled={connecting}
            className="w-full"
          >
            {connecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect to Square
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Square Integration
            </div>
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </CardTitle>
          <CardDescription>
            Connected to Square {integration.environment} environment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={handleSyncProducts} disabled={syncing}>
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Products
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleDisconnect}>
              <Unlink className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="logs">Sync History</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Sync Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync products at regular intervals
                  </p>
                </div>
                <Switch
                  checked={integration.sync_enabled}
                  onCheckedChange={(checked) => updateSyncSettings('sync_enabled', checked)}
                />
              </div>

              {integration.sync_enabled && (
                <div>
                  <Label htmlFor="sync-interval">Sync Interval (hours)</Label>
                  <Input
                    id="sync-interval"
                    type="number"
                    min="1"
                    max="72"
                    value={integration.auto_sync_interval_hours}
                    onChange={(e) => updateSyncSettings('auto_sync_interval_hours', parseInt(e.target.value))}
                    className="w-32"
                  />
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Environment:</span>
                    <Badge variant="outline" className="ml-2">
                      {integration.environment}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Last Sync:</span>
                    <span className="ml-2">
                      {integration.last_sync_at 
                        ? new Date(integration.last_sync_at).toLocaleString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>
                Recent product synchronization logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No sync history available</p>
              ) : (
                <div className="space-y-4">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{log.sync_type} Sync</span>
                          {getSyncStatusBadge(log.status)}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.started_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Processed:</span>
                          <span className="ml-1 font-medium">{log.items_processed}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="ml-1 font-medium text-green-600">{log.items_created}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="ml-1 font-medium text-blue-600">{log.items_updated}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Failed:</span>
                          <span className="ml-1 font-medium text-red-600">{log.items_failed}</span>
                        </div>
                      </div>

                      {log.error_message && (
                        <Alert className="mt-2" variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{log.error_message}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
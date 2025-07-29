import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  DollarSign, 
  CreditCard,
  ShoppingCart,
  AlertCircle,
  CheckCircle
} from "lucide-react";

export const StripeSalesSync = () => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncStats, setSyncStats] = useState<{
    synced_count: number;
    last_sync_time: string;
  } | null>(null);

  const syncAllPayments = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-to-ledger', {
        body: { sync_all: true }
      });

      if (error) throw error;

      setSyncStats({
        synced_count: data.synced_count || 0,
        last_sync_time: new Date().toISOString()
      });

      setLastSync(new Date().toLocaleString());

      toast({
        title: "Success",
        description: `Synced ${data.synced_count || 0} payments to ledger`,
      });
    } catch (error) {
      console.error('Error syncing payments:', error);
      toast({
        title: "Error",
        description: "Failed to sync Stripe payments",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const syncSinglePayment = async (sessionId: string) => {
    if (!sessionId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid session ID",
        variant: "destructive"
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-stripe-to-ledger', {
        body: { session_id: sessionId.trim() }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Payment synced successfully",
      });
    } catch (error) {
      console.error('Error syncing single payment:', error);
      toast({
        title: "Error",
        description: "Failed to sync payment",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Stripe Sales Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="space-y-1">
            <p className="font-medium">Integration Status</p>
            <p className="text-sm text-muted-foreground">
              Stripe payments automatically sync to running ledger as credits
            </p>
          </div>
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>

        {/* Sync Statistics */}
        {syncStats && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Last Sync</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{syncStats.synced_count}</p>
              <p className="text-xs text-muted-foreground">payments added</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Sync Time</span>
              </div>
              <p className="text-sm font-medium text-blue-600">
                {new Date(syncStats.last_sync_time).toLocaleTimeString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(syncStats.last_sync_time).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Manual Sync Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Sync Recent Sales</h4>
              <p className="text-sm text-muted-foreground">
                Sync all completed Stripe payments from the last 30 days
              </p>
            </div>
            <Button 
              onClick={syncAllPayments} 
              disabled={syncing}
              className="min-w-[120px]"
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {syncing ? 'Syncing...' : 'Sync All'}
            </Button>
          </div>

          {lastSync && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Last synced: {lastSync}
            </div>
          )}
        </div>

        {/* Manual Single Payment Sync */}
        <div className="border-t pt-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Sync Individual Payment</h4>
              <p className="text-sm text-muted-foreground">
                Enter a Stripe session ID to sync a specific payment
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="cs_test_... or cs_live_..."
                className="flex-1 px-3 py-2 border rounded-md text-sm"
                id="sessionId"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    syncSinglePayment(input.value);
                    input.value = '';
                  }
                }}
              />
              <Button 
                onClick={() => {
                  const input = document.getElementById('sessionId') as HTMLInputElement;
                  syncSinglePayment(input.value);
                  input.value = '';
                }}
                disabled={syncing}
                variant="outline"
              >
                Sync
              </Button>
            </div>
          </div>
        </div>

        {/* Information Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">How Sales Integration Works</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Completed Stripe payments automatically appear as credits in the ledger</li>
                <li>• Product names and customer info are included in descriptions</li>
                <li>• All sales are categorized as "Sales" for easy tracking</li>
                <li>• Running balance updates automatically with each sale</li>
                <li>• Manual sync available for missed payments</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
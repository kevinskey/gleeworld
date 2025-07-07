
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, TrendingUp, Users, RefreshCw, Check, X } from "lucide-react";
import { useAdminStipends } from "@/hooks/useAdminStipends";
import { AddBatchStipendDialog } from "../AddBatchStipendDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const StipendManagement = () => {
  const { stipends, summary, loading, error, refetch, syncContractStipends } = useAdminStipends();
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handlePaymentStatusChange = async (stipendId: string, isPaid: boolean) => {
    try {
      // Update local state immediately for better UX
      setPaidStatus(prev => ({ ...prev, [stipendId]: isPaid }));
      
      // Here you would typically update the database
      // For now, we'll just show a toast message
      toast({
        title: isPaid ? "Marked as Paid" : "Marked as Unpaid",
        description: `Stipend has been marked as ${isPaid ? 'paid' : 'unpaid'}`,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      // Revert local state on error
      setPaidStatus(prev => ({ ...prev, [stipendId]: !isPaid }));
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => refetch()} variant="secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stipends</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.totalCount || 0} stipend records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Stipend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.averageAmount || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Per performance/contract
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users with stipends
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Stipend Records</CardTitle>
              <CardDescription>All stipend transactions from contracts and manual entries</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={syncContractStipends} variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Update from Signed Contracts
              </Button>
              <Button onClick={() => refetch()} variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <AddBatchStipendDialog onSuccess={refetch} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stipends?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No stipends found</h3>
              <p className="text-sm mb-4">Stipend records will appear here as they are created or synced from contracts.</p>
              <Button onClick={syncContractStipends} variant="secondary">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync from Contracts
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stipends?.slice(0, 20).map((stipend, index) => {
                const stipendKey = stipend.reference || `${stipend.user_email}-${stipend.date}-${index}`;
                const isPaid = paidStatus[stipendKey] || false;
                
                return (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatCurrency(stipend.amount)} - {stipend.description}
                        </p>
                        <p className="text-sm text-gray-600">
                          {stipend.user_name || stipend.user_email} • {new Date(stipend.date).toLocaleDateString()}
                        </p>
                        {stipend.contract_title && (
                          <p className="text-xs text-blue-600">Contract: {stipend.contract_title}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{stipend.category}</Badge>
                      {stipend.reference?.includes('Contract ID:') && (
                        <Badge variant="secondary" className="text-xs">
                          Auto-synced
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={isPaid ? "default" : "outline"}
                          onClick={() => handlePaymentStatusChange(stipendKey, true)}
                          className="h-8 px-3"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Paid
                        </Button>
                        <Button
                          size="sm"
                          variant={!isPaid ? "destructive" : "outline"}
                          onClick={() => handlePaymentStatusChange(stipendKey, false)}
                          className="h-8 px-3"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Unpaid
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(stipends?.length || 0) > 20 && (
                <div className="text-center py-4">
                  <Button variant="secondary">
                    View All {stipends?.length} Stipends
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Plus, Search, Calendar, User, DollarSign } from "lucide-react";
import { useAdminPayments } from "@/hooks/useAdminPayments";
import { AddPaymentDialog } from "../AddPaymentDialog";

export const PaymentTracking = () => {
  const { payments, loading, error, refetch } = useAdminPayments();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = methodFilter === "all" || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesMethod;
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalAmount = filteredPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading payments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col gap-4 sm:gap-3 md:flex-row md:justify-between md:items-center">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-5 w-5" />
                Payment Tracking
              </CardTitle>
              <CardDescription className="mt-1 text-sm sm:text-base">
                Monitor and manage all payments ({filteredPayments.length} payments, {formatCurrency(totalAmount)} total)
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)} variant="default" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:gap-4 mb-4 sm:mb-5 md:mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by user name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 sm:h-11"
                />
              </div>
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-[180px] md:w-[160px] bg-brand-600 border-brand-700 text-white hover:bg-brand-700 h-10 sm:h-11">
                <SelectValue placeholder="Payment method" className="text-white" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No payments found</h3>
              <p className="text-sm">
                {searchTerm || methodFilter !== "all" 
                  ? "Try adjusting your search filters" 
                  : "No payments have been recorded yet"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredPayments.map((payment) => (
                <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 md:p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-4 sm:gap-3 md:gap-0">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-green-100 rounded-full flex-shrink-0">
                      <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-base sm:text-lg md:text-base leading-tight">
                        {formatCurrency(payment.amount || 0)} to {payment.user_full_name || payment.user_email}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-sm sm:text-base md:text-sm text-gray-600 mt-2 sm:mt-1">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 md:h-4 md:w-4" />
                          <span>
                            {payment.payment_date 
                              ? new Date(payment.payment_date).toLocaleDateString()
                              : new Date(payment.created_at).toLocaleDateString()
                            }
                          </span>
                        </div>
                        {payment.contract_title && (
                          <span className="truncate text-gray-500">• {payment.contract_title}</span>
                        )}
                      </div>
                      {payment.notes && (
                        <p className="text-sm sm:text-base md:text-sm text-gray-500 mt-2 sm:mt-1 line-clamp-2 leading-relaxed">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {payment.payment_method}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddPaymentDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={refetch}
      />
    </>
  );
};

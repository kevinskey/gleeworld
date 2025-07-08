
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, CreditCard } from "lucide-react";
import { useUserDashboard } from "@/hooks/useUserDashboard";

export const UserPaymentsList = () => {
  const { payments, loading, error } = useUserDashboard();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            <span className="ml-2 text-gray-900 text-sm">Loading payments...</span>
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
            <p className="text-red-600 mb-4 text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto text-brand-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payments Yet</h3>
            <p className="text-gray-600 text-sm">You haven't received any payments yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {payments.map((payment) => (
        <Card key={payment.id}>
          <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2">
              <div className="flex-1">
                <CardTitle className="text-gray-900 flex items-center gap-2 text-lg sm:text-xl">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  ${payment.amount || 0}
                </CardTitle>
                <CardDescription className="text-gray-600 text-xs sm:text-sm mt-1">
                  {payment.payment_date 
                    ? `Paid on ${new Date(payment.payment_date).toLocaleDateString()}`
                    : `Recorded on ${new Date(payment.created_at).toLocaleDateString()}`
                  }
                </CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800 text-xs self-start sm:self-center flex-shrink-0">
                <CreditCard className="h-3 w-3 mr-1" />
                {payment.payment_method}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="space-y-2 sm:space-y-3">
              {payment.notes && (
                <p className="text-sm text-gray-600 leading-relaxed">{payment.notes}</p>
              )}
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Recorded: {new Date(payment.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

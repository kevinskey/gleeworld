
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, CreditCard } from "lucide-react";
import { useUserDashboard } from "@/hooks/useUserDashboard";

export const UserPaymentsList = () => {
  const { payments, loading, error } = useUserDashboard();

  if (loading) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-spelman-400"></div>
            <span className="ml-2 text-white">Loading payments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-300 mb-4">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card className="glass-card border-spelman-400/20">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto text-spelman-400/50 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Payments Yet</h3>
            <p className="text-white/70">You haven't received any payments yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <Card key={payment.id} className="glass-card border-spelman-400/20">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  ${payment.amount || 0}
                </CardTitle>
                <CardDescription className="text-white/70">
                  {payment.payment_date 
                    ? `Paid on ${new Date(payment.payment_date).toLocaleDateString()}`
                    : `Recorded on ${new Date(payment.created_at).toLocaleDateString()}`
                  }
                </CardDescription>
              </div>
              <Badge className="bg-green-100 text-green-800">
                <CreditCard className="h-3 w-3 mr-1" />
                {payment.payment_method}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payment.notes && (
                <p className="text-sm text-white/70">{payment.notes}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-white/50">
                <Calendar className="h-3 w-3" />
                <span>Recorded: {new Date(payment.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

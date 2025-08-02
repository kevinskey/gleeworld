import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { 
  DollarSign, 
  CreditCard, 
  Calendar,
  MessageCircle,
  Bell,
  PiggyBank,
  HandHeart,
  Clock
} from "lucide-react";

const TreasurerServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState("pay-dues");
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    type: "dues",
    notes: ""
  });
  const [notificationForm, setNotificationForm] = useState({
    message: "",
    urgent: false
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!profile || !['member', 'alumna', 'admin', 'super-admin'].includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Payment initiated:", paymentForm);
    // This would integrate with Stripe for actual payment processing
  };

  const handleNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Notification sent:", notificationForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          title="Treasurer Services"
          description="Pay dues, manage payment plans, and communicate with the treasurer"
          backTo="/executive-services"
        />


        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pay-dues">Pay Dues</TabsTrigger>
            <TabsTrigger value="payment-plan">Payment Plan</TabsTrigger>
            <TabsTrigger value="request-funds">Request Funds</TabsTrigger>
            <TabsTrigger value="send-notification">Send Notification</TabsTrigger>
          </TabsList>

          <TabsContent value="pay-dues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pay Your Dues
                </CardTitle>
                <CardDescription>
                  Make a payment towards your Glee Club membership dues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Payment Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="Enter amount (e.g., 45.00)"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Payment Type</Label>
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={paymentForm.type}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, type: e.target.value }))}
                      >
                        <option value="dues">Annual Dues</option>
                        <option value="partial">Partial Payment</option>
                        <option value="late-fee">Late Fee</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Payment Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes about this payment..."
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button type="submit" className="flex-1">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay with Credit Card
                    </Button>
                    <Button type="button" variant="outline" className="flex-1">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Pay with Bank Transfer
                    </Button>
                  </div>
                </form>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-plan" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Set Up Payment Plan
                </CardTitle>
                <CardDescription>
                  Create a monthly payment plan for your dues
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 border-2 border-primary">
                    <div className="text-center">
                      <h4 className="font-semibold">3-Month Plan</h4>
                      <p className="text-2xl font-bold text-primary">$15/mo</p>
                      <p className="text-sm text-muted-foreground">No additional fees</p>
                      <Button className="w-full mt-3" size="sm">Select Plan</Button>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <h4 className="font-semibold">6-Month Plan</h4>
                      <p className="text-2xl font-bold">$8/mo</p>
                      <p className="text-sm text-muted-foreground">$3 processing fee</p>
                      <Button className="w-full mt-3" size="sm" variant="outline">Select Plan</Button>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="text-center">
                      <h4 className="font-semibold">Pay in Full</h4>
                      <p className="text-2xl font-bold">$85</p>
                      <p className="text-sm text-muted-foreground">One-time payment</p>
                      <Button className="w-full mt-3" size="sm" variant="outline">Pay Now</Button>
                    </div>
                  </Card>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="request-funds" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandHeart className="h-5 w-5" />
                  Request Financial Assistance
                </CardTitle>
                <CardDescription>
                  Apply for financial aid or emergency funding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button className="h-20 flex-col" variant="outline">
                    <HandHeart className="h-6 w-6 mb-2" />
                    Financial Aid Application
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Clock className="h-6 w-6 mb-2" />
                    Emergency Fund Request
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <DollarSign className="h-6 w-6 mb-2" />
                    Scholarship Application
                  </Button>
                  <Button className="h-20 flex-col" variant="outline">
                    <Calendar className="h-6 w-6 mb-2" />
                    Payment Extension Request
                  </Button>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Available Financial Support</h4>
                  <div className="space-y-2 text-sm">
                    <p>• <strong>Need-Based Financial Aid:</strong> Up to 100% dues coverage</p>
                    <p>• <strong>Emergency Fund:</strong> Up to $125 for unexpected expenses</p>
                    <p>• <strong>Performance Scholarships:</strong> Merit-based partial coverage</p>
                    <p>• <strong>Payment Extensions:</strong> Up to 60 days with no penalties</p>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Fund Request</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-4">
                      <div>
                        <Label htmlFor="request-type">Request Type</Label>
                        <select className="w-full p-2 border rounded-md">
                          <option value="">Select request type</option>
                          <option value="emergency">Emergency Fund</option>
                          <option value="financial-aid">Financial Aid</option>
                          <option value="scholarship">Scholarship</option>
                          <option value="extension">Payment Extension</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="request-amount">Requested Amount</Label>
                        <Input type="number" step="0.01" placeholder="Enter amount needed" />
                      </div>
                      <div>
                        <Label htmlFor="request-reason">Reason for Request</Label>
                        <Textarea placeholder="Explain your financial situation and need..." rows={3} />
                      </div>
                      <Button className="w-full">Submit Fund Request</Button>
                    </form>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send-notification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Send Notification to Treasurer
                </CardTitle>
                <CardDescription>
                  Send a message or notification to the treasurer about financial matters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNotificationSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Type your message to the treasurer..."
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="urgent"
                      checked={notificationForm.urgent}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, urgent: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="urgent">Mark as urgent</Label>
                  </div>
                  <Button type="submit" className="w-full">
                    <Bell className="h-4 w-4 mr-2" />
                    Send Notification
                  </Button>
                </form>

                <div className="mt-6">
                  <h4 className="font-semibold mb-3">Quick Message Templates</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                      "I need help setting up a payment plan"
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                      "I have a question about my dues balance"
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                      "I need to discuss financial assistance options"
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-left justify-start">
                      "I have an issue with my recent payment"
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Contact Treasurer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Current Treasurer</h4>
                    <div className="space-y-2">
                      <p className="font-medium">Ashley Davis</p>
                      <p className="text-sm text-muted-foreground">treasurer@spelman.edu</p>
                      <p className="text-sm text-muted-foreground">Office Hours: Tue/Thu 3-6 PM</p>
                      <p className="text-sm text-muted-foreground">Financial Aid Hours: Mon/Wed 2-4 PM</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Financial Meeting
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Send Direct Message
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <HandHeart className="h-4 w-4 mr-2" />
                        Request Financial Counseling
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TreasurerServices;
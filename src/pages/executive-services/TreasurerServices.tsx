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
import { 
  DollarSign, 
  Receipt, 
  CreditCard, 
  Calculator,
  FileText,
  PieChart,
  TrendingUp,
  AlertCircle,
  Calendar,
  MessageCircle
} from "lucide-react";

const TreasurerServices = () => {
  const { user } = useAuth();
  const { profile, loading } = useUserRole();
  const [activeTab, setActiveTab] = useState("budget-overview");
  const [expenseForm, setExpenseForm] = useState({
    amount: "",
    description: "",
    category: "",
    receipt: null as File | null
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

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Expense submitted:", expenseForm);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Treasurer Services</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage finances, submit expenses, and track budget allocations
          </p>
          <Badge variant="secondary" className="text-sm">
            Member Access Only
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">$12,450</div>
              <div className="text-sm text-muted-foreground">Total Budget</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">$8,200</div>
              <div className="text-sm text-muted-foreground">Spent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Calculator className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">$4,250</div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Receipt className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">23</div>
              <div className="text-sm text-muted-foreground">Pending Receipts</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="budget-overview">Budget Overview</TabsTrigger>
            <TabsTrigger value="submit-expense">Submit Expense</TabsTrigger>
            <TabsTrigger value="payment-requests">Payment Requests</TabsTrigger>
            <TabsTrigger value="contact-treasurer">Contact Treasurer</TabsTrigger>
          </TabsList>

          <TabsContent value="budget-overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Budget Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { category: "Travel & Transportation", allocated: 5000, spent: 3200, color: "bg-blue-500" },
                    { category: "Performance Attire", allocated: 2500, spent: 2100, color: "bg-green-500" },
                    { category: "Music & Equipment", allocated: 3000, spent: 1800, color: "bg-purple-500" },
                    { category: "Meals & Catering", allocated: 1950, spent: 1100, color: "bg-orange-500" },
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.category}</span>
                        <span>${item.spent} / ${item.allocated}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`${item.color} h-2 rounded-full transition-all`}
                          style={{ width: `${(item.spent / item.allocated) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { action: "Bus rental payment processed", amount: "$850", date: "2 hours ago" },
                    { action: "Uniform order approved", amount: "$1,200", date: "1 day ago" },
                    { action: "Sheet music purchase", amount: "$145", date: "3 days ago" },
                    { action: "Meal reimbursement", amount: "$67", date: "5 days ago" },
                  ].map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.action}</p>
                        <p className="text-xs text-muted-foreground">{item.date}</p>
                      </div>
                      <Badge variant="outline">{item.amount}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="submit-expense" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Submit Expense Report
                </CardTitle>
                <CardDescription>
                  Submit receipts and expense claims for reimbursement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <select 
                        className="w-full p-2 border rounded-md"
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="">Select category</option>
                        <option value="travel">Travel & Transportation</option>
                        <option value="attire">Performance Attire</option>
                        <option value="music">Music & Equipment</option>
                        <option value="meals">Meals & Catering</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the expense..."
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="receipt">Upload Receipt</Label>
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setExpenseForm(prev => ({ ...prev, receipt: e.target.files?.[0] || null }))}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Submit Expense Report
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Requests
                </CardTitle>
                <CardDescription>
                  Request payments for approved expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Request Stipend Payment
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Calculator className="h-4 w-4 mr-2" />
                    Submit Budget Proposal
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Receipt className="h-4 w-4 mr-2" />
                    Emergency Fund Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact-treasurer" className="space-y-6">
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
                        <FileText className="h-4 w-4 mr-2" />
                        Request Financial Report
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
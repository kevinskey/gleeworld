import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Calendar, DollarSign, Bell, CreditCard, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DuesOverview } from "@/components/dues/DuesOverview";
import { DuesRecordsList } from "@/components/dues/DuesRecordsList";
import { PaymentPlansList } from "@/components/dues/PaymentPlansList";
import { DuesRemindersList } from "@/components/dues/DuesRemindersList";
import { CreateDuesDialog } from "@/components/dues/CreateDuesDialog";
import { CreatePaymentPlanDialog } from "@/components/dues/CreatePaymentPlanDialog";
import { CreateReminderDialog } from "@/components/dues/CreateReminderDialog";

export const DuesManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [duesRecords, setDuesRecords] = useState([]);
  const [paymentPlans, setPaymentPlans] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [createDuesOpen, setCreateDuesOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [createReminderOpen, setCreateReminderOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // If user is not authenticated, show sign-in prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              You need to be signed in to access the dues management system.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/auth')} className="w-full">
                Sign In
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDuesRecords(),
      fetchPaymentPlans(),
      fetchReminders()
    ]);
    setLoading(false);
  };

  const fetchDuesRecords = async () => {
    try {
      console.log('DuesManagement: Fetching dues records...');
      console.log('DuesManagement: Current user:', user);
      console.log('DuesManagement: User ID:', user?.id);
      
      const { data, error } = await supabase
        .from('gw_dues_records')
        .select(`
          *,
          gw_profiles (
            full_name,
            email
          )
        `)
        .order('due_date', { ascending: false });

      console.log('DuesManagement: Dues query result:', { data, error, recordCount: data?.length });

      if (error) {
        console.error('DuesManagement: Error fetching dues records:', error);
        throw error;
      }
      
      console.log('DuesManagement: Successfully set dues records:', data?.length || 0);
      setDuesRecords(data || []);
    } catch (error: any) {
      console.error('DuesManagement: Catch block - Error fetching dues records:', error);
      toast({
        title: "Error",
        description: `Failed to load dues records: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const fetchPaymentPlans = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('gw_dues_payment_plans')
        .select(`
          *,
          gw_payment_plan_installments (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentPlans(data || []);
    } catch (error) {
      console.error('Error fetching payment plans:', error);
      toast({
        title: "Error",
        description: "Failed to load payment plans",
        variant: "destructive"
      });
    }
  };

  const fetchReminders = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('gw_dues_reminders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast({
        title: "Error",
        description: "Failed to load reminders",
        variant: "destructive"
      });
    }
  };

  const handleSuccess = () => {
    fetchAllData();
    setCreateDuesOpen(false);
    setCreatePlanOpen(false);
    setCreateReminderOpen(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-bebas tracking-wide bg-gradient-to-r from-brand-gold via-brand-accent to-brand-secondary bg-clip-text text-transparent">
              Dues Management
            </h1>
            <p className="text-muted-foreground">
              Comprehensive dues tracking, payment plans, and reminders
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setCreateDuesOpen(true)} className="bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Dues
          </Button>
          <Button variant="outline" onClick={() => setCreatePlanOpen(true)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Plan
          </Button>
          <Button variant="outline" onClick={() => setCreateReminderOpen(true)}>
            <Bell className="h-4 w-4 mr-2" />
            Add Reminder
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-brand-subtle/20 border border-brand-accent/20">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-primary data-[state=active]:to-brand-secondary data-[state=active]:text-white"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="records"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-primary data-[state=active]:to-brand-secondary data-[state=active]:text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Records
          </TabsTrigger>
          <TabsTrigger 
            value="plans"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-primary data-[state=active]:to-brand-secondary data-[state=active]:text-white"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Payment Plans
          </TabsTrigger>
          <TabsTrigger 
            value="reminders"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-primary data-[state=active]:to-brand-secondary data-[state=active]:text-white"
          >
            <Clock className="h-4 w-4 mr-2" />
            Reminders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <DuesOverview 
            duesRecords={duesRecords} 
            paymentPlans={paymentPlans}
            reminders={reminders}
          />
        </TabsContent>

        <TabsContent value="records" className="space-y-6">
          <DuesRecordsList 
            duesRecords={duesRecords} 
            onRefresh={fetchDuesRecords}
          />
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <PaymentPlansList 
            paymentPlans={paymentPlans} 
            onRefresh={fetchPaymentPlans}
          />
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <DuesRemindersList 
            reminders={reminders} 
            onRefresh={fetchReminders}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateDuesDialog 
        open={createDuesOpen} 
        onOpenChange={setCreateDuesOpen}
        onSuccess={handleSuccess}
      />
      
      <CreatePaymentPlanDialog 
        open={createPlanOpen} 
        onOpenChange={setCreatePlanOpen}
        onSuccess={handleSuccess}
        duesRecords={duesRecords}
      />
      
      <CreateReminderDialog 
        open={createReminderOpen} 
        onOpenChange={setCreateReminderOpen}
        onSuccess={handleSuccess}
        duesRecords={duesRecords}
        paymentPlans={paymentPlans}
      />
    </div>
  );
};
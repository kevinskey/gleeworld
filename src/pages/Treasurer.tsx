import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { DollarSign, FileText, Users, BookOpen, ArrowLeft, Calculator, TrendingUp, Receipt } from 'lucide-react';
import { MemberDuesRegister } from '@/components/treasurer/MemberDuesRegister';
import { MerchandiseIncomeRegister } from '@/components/treasurer/MerchandiseIncomeRegister';
import { PerformanceStipendsRegister } from '@/components/treasurer/PerformanceStipendsRegister';
import { GleeClubLedger } from '@/components/treasurer/GleeClubLedger';

const Treasurer = () => {
  const [activeTab, setActiveTab] = useState('dues');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <div className="h-6 w-px bg-border"></div>
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Treasurer Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage financial records and registers</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/budgets" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Budgets
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/accounting" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Accounting
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/payments" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Payments
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dues" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Member Dues
          </TabsTrigger>
          <TabsTrigger value="merchandise" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Merchandise
          </TabsTrigger>
          <TabsTrigger value="stipends" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Stipends
          </TabsTrigger>
          <TabsTrigger value="ledger" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            General Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dues">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Member Dues Register
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MemberDuesRegister />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="merchandise">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Merchandise Income Register
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MerchandiseIncomeRegister />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stipends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Performance Stipends Register
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceStipendsRegister />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                General Glee Club Ledger
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GleeClubLedger />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Treasurer;
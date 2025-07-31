import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { DollarSign, FileText, Users, BookOpen, ArrowLeft, Calculator, TrendingUp, Receipt, Wallet, ShoppingBag } from 'lucide-react';
import { MemberDuesRegister } from '@/components/treasurer/MemberDuesRegister';
import { MerchandiseIncomeRegister } from '@/components/treasurer/MerchandiseIncomeRegister';
import { PerformanceStipendsRegister } from '@/components/treasurer/PerformanceStipendsRegister';
import { GleeClubLedger } from '@/components/treasurer/GleeClubLedger';

const Treasurer = () => {
  const [activeTab, setActiveTab] = useState('dues');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link to="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Treasurer Hub</h1>
                <p className="text-sm text-gray-600">Financial management & registers</p>
              </div>
            </div>
          </div>
          
          {/* Compact Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/budgets" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Budgets</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/accounting" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Accounting</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/payments" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Dues</p>
                  <p className="text-lg font-bold text-gray-900">$12,450</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Merchandise</p>
                  <p className="text-lg font-bold text-gray-900">$8,320</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Stipends</p>
                  <p className="text-lg font-bold text-gray-900">$5,150</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Balance</p>
                  <p className="text-lg font-bold text-gray-900">$25,920</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Compact Tabs */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Financial Registers</CardTitle>
                <TabsList className="grid grid-cols-4 w-fit">
                  <TabsTrigger value="dues" className="flex items-center gap-2 text-xs">
                    <Users className="h-3 w-3" />
                    <span className="hidden sm:inline">Dues</span>
                  </TabsTrigger>
                  <TabsTrigger value="merchandise" className="flex items-center gap-2 text-xs">
                    <ShoppingBag className="h-3 w-3" />
                    <span className="hidden sm:inline">Merch</span>
                  </TabsTrigger>
                  <TabsTrigger value="stipends" className="flex items-center gap-2 text-xs">
                    <Wallet className="h-3 w-3" />
                    <span className="hidden sm:inline">Stipends</span>
                  </TabsTrigger>
                  <TabsTrigger value="ledger" className="flex items-center gap-2 text-xs">
                    <BookOpen className="h-3 w-3" />
                    <span className="hidden sm:inline">Ledger</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            
            <CardContent className="pt-4">
              <TabsContent value="dues" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Member Dues Register</h3>
                    <Button size="sm" className="h-8">
                      <Users className="h-3 w-3 mr-1" />
                      Add Entry
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <MemberDuesRegister />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="merchandise" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Merchandise Income Register</h3>
                    <Button size="sm" className="h-8">
                      <ShoppingBag className="h-3 w-3 mr-1" />
                      Add Sale
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <MerchandiseIncomeRegister />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stipends" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Performance Stipends Register</h3>
                    <Button size="sm" className="h-8">
                      <Wallet className="h-3 w-3 mr-1" />
                      Add Stipend
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <PerformanceStipendsRegister />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ledger" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">General Glee Club Ledger</h3>
                    <Button size="sm" className="h-8">
                      <BookOpen className="h-3 w-3 mr-1" />
                      Add Entry
                    </Button>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <GleeClubLedger />
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Treasurer;
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, FileText, Users, BookOpen } from 'lucide-react';
import { MemberDuesRegister } from '@/components/treasurer/MemberDuesRegister';
import { MerchandiseIncomeRegister } from '@/components/treasurer/MerchandiseIncomeRegister';
import { PerformanceStipendsRegister } from '@/components/treasurer/PerformanceStipendsRegister';
import { GleeClubLedger } from '@/components/treasurer/GleeClubLedger';

const Treasurer = () => {
  const [activeTab, setActiveTab] = useState('dues');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Treasurer Dashboard</h1>
          <p className="text-muted-foreground">Manage financial records and registers</p>
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
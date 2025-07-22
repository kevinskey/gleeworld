import React, { useState } from 'react';

import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, Users, FileText, Calendar, DollarSign, Bell } from 'lucide-react';
import { MassEmailManager } from '@/components/notifications/MassEmailManager';
import { SMSHistoryManager } from '@/components/notifications/SMSHistoryManager';
import { MemberCommunications } from '@/components/notifications/MemberCommunications';
import { PublicFormsManager } from '@/components/notifications/PublicFormsManager';
import { NewsletterManager } from '@/components/notifications/NewsletterManager';
import { NotificationHistoryWithDelivery } from '@/components/notifications/NotificationHistoryWithDelivery';

export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Debug logging
  console.log('NotificationCenter rendering, activeTab:', activeTab);

  return (
    <UniversalLayout>
      <div className="container mx-auto px-2 py-6 max-w-7xl">

        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 -mt-6">
          {/* Mobile dropdown */}
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="mass-email">Mass Email</SelectItem>
                <SelectItem value="sms">SMS Center</SelectItem>
                <SelectItem value="communications">Communications</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="public-forms">Public Forms</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Desktop tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mass-email">Mass Email</TabsTrigger>
            <TabsTrigger value="sms">SMS Center</TabsTrigger>
            <TabsTrigger value="communications">Communications</TabsTrigger>
            <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
            <TabsTrigger value="public-forms">Public Forms</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer p-3" onClick={() => setActiveTab('mass-email')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-normal">Mass Email</CardTitle>
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Send to Groups</div>
                  <p className="text-xs text-muted-foreground">
                    Send emails to individual members or entire groups
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer p-3" onClick={() => setActiveTab('sms')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-normal">SMS Center</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Text Messaging</div>
                  <p className="text-xs text-muted-foreground">
                    Send SMS notifications and view message history
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer p-3" onClick={() => setActiveTab('communications')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-normal">Member Communications</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Letters & Forms</div>
                  <p className="text-xs text-muted-foreground">
                    Excuse letters and member communications
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer p-3" onClick={() => setActiveTab('newsletter')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-normal">Newsletter</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Alumni & Board</div>
                  <p className="text-xs text-muted-foreground">
                    Newsletter for alumni and executive board members
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer p-3" onClick={() => setActiveTab('public-forms')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-normal">Public Forms</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Bookings & Interest</div>
                  <p className="text-xs text-muted-foreground">
                    Fan interest forms and concert booking requests
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow p-3">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-normal">Integrations</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Connected</div>
                  <p className="text-xs text-muted-foreground">
                    Calendar, Financial & User Systems
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Notification Activity</CardTitle>
                <CardDescription>Latest communications sent to members</CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationHistoryWithDelivery />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mass-email">
            <MassEmailManager />
          </TabsContent>

          <TabsContent value="sms">
            <SMSHistoryManager />
          </TabsContent>

          <TabsContent value="communications">
            <MemberCommunications />
          </TabsContent>

          <TabsContent value="newsletter">
            <NewsletterManager />
          </TabsContent>

          <TabsContent value="public-forms">
            <PublicFormsManager />
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
}
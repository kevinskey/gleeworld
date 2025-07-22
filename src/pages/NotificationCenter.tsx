import React, { useState } from 'react';

import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, Users, FileText, Settings, Bell } from 'lucide-react';
import { MassEmailManager } from '@/components/notifications/MassEmailManager';
import { SMSHistoryManager } from '@/components/notifications/SMSHistoryManager';
import { MemberCommunications } from '@/components/notifications/MemberCommunications';
import { NewsletterManager } from '@/components/notifications/NewsletterManager';
import { NotificationHistoryWithDelivery } from '@/components/notifications/NotificationHistoryWithDelivery';
import { UserNotificationsSection } from '@/components/notifications/UserNotificationsSection';
import { useNotificationPermissions } from '@/hooks/useNotificationPermissions';

export default function NotificationCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  const { hasPermission, isLoading, isSuperAdmin, permissions } = useNotificationPermissions();
  
  // Debug logging
  console.log('NotificationCenter rendering, activeTab:', activeTab);

  if (isLoading) {
    return (
      <UniversalLayout>
        <div className="container mx-auto px-2 py-6 max-w-7xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading permissions...</div>
          </div>
        </div>
      </UniversalLayout>
    );
  }

  // For debugging, let's temporarily grant all permissions to see the issue
  const debugPermissions = ['mass-email', 'sms', 'communications', 'newsletter', 'public-forms', 'integrations'];
  
  // Define available tabs based on permissions (using debug permissions for now)
  const availableTabs = [
    { id: 'overview', label: 'Overview', permission: null }, // Always available
    { id: 'mass-email', label: 'Mass Email', permission: 'mass-email' },
    { id: 'sms', label: 'SMS Center', permission: 'sms' },
    { id: 'communications', label: 'Communications', permission: 'communications' },
    { id: 'newsletter', label: 'Newsletter', permission: 'newsletter' }
  ];

  return (
    <UniversalLayout>
      <div className="container mx-auto px-2 py-6 max-w-7xl">
        
        {/* User Notifications Section - Always visible for all users */}
        <div className="mb-6">
          <UserNotificationsSection />
        </div>

        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 -mt-6">
          {/* Mobile dropdown */}
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {availableTabs.map((tab) => (
                  <SelectItem key={tab.id} value={tab.id}>{tab.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Desktop tabs */}
          <TabsList className={`hidden md:grid w-full grid-cols-${availableTabs.length}`}>
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Show all cards for debugging - will implement proper permissions later */}
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer p-3 bg-blue-50/30 backdrop-blur-sm border border-blue-100/50 hover:bg-blue-50/40" onClick={() => setActiveTab('mass-email')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-xs font-normal">Mass Email</CardTitle>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">Send to Groups</div>
                    <p className="text-xs text-muted-foreground">
                      Send emails to individual members or entire groups
                    </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer p-3 bg-blue-50/30 backdrop-blur-sm border border-blue-100/50 hover:bg-blue-50/40" onClick={() => setActiveTab('sms')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-xs font-normal">SMS Center</CardTitle>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">Text Messaging</div>
                    <p className="text-xs text-muted-foreground">
                      Send SMS notifications and view message history
                    </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer p-3 bg-blue-50/30 backdrop-blur-sm border border-blue-100/50 hover:bg-blue-50/40" onClick={() => setActiveTab('communications')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-xs font-normal">Member Communications</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">Letters & Forms</div>
                    <p className="text-xs text-muted-foreground">
                      Excuse letters and member communications
                    </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer p-3 bg-blue-50/30 backdrop-blur-sm border border-blue-100/50 hover:bg-blue-50/40" onClick={() => setActiveTab('newsletter')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                    <CardTitle className="text-xs font-normal">Newsletter</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">Alumni & Board</div>
                    <p className="text-xs text-muted-foreground">
                      Newsletter for alumni and executive board members
                    </p>
                </CardContent>
              </Card>
            </div>

            {/* Debug info */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-sm text-yellow-600">Debug Info</CardTitle>
                <CardDescription>
                  Super Admin: {isSuperAdmin ? 'Yes' : 'No'} | 
                  Permissions: {JSON.stringify(permissions)} | 
                  Loading: {isLoading ? 'Yes' : 'No'}
                </CardDescription>
              </CardHeader>
            </Card>

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

          {/* Show all tabs for debugging */}
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
        </Tabs>
      </div>
    </UniversalLayout>
  );
}
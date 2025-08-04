import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Bell, Send } from "lucide-react";

const Communications = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-muted-foreground">Newsletters, SMS, and member notifications</p>
        </div>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Send Message
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Campaigns
            </CardTitle>
            <CardDescription>Manage email communications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-sm text-muted-foreground">Active campaigns</p>
            <Button variant="outline" className="w-full mt-4">
              Create Campaign
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Messages
            </CardTitle>
            <CardDescription>Quick member alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85</div>
            <p className="text-sm text-muted-foreground">Messages sent this month</p>
            <Button variant="outline" className="w-full mt-4">
              Send SMS
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>App notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-sm text-muted-foreground">Pending notifications</p>
            <Button variant="outline" className="w-full mt-4">
              Manage Notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Communications;
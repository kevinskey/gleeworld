import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Users, FileText, Clock } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";

export const EmailManagementModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const emailCampaigns = [
    { id: 1, subject: "Spring Concert Announcement", recipients: 245, status: "sent", date: "2024-01-15" },
    { id: 2, subject: "Rehearsal Schedule Update", recipients: 52, status: "draft", date: "2024-01-14" },
    { id: 3, subject: "Holiday Break Notice", recipients: 298, status: "scheduled", date: "2024-01-20" }
  ];

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Email Management</h1>
            <p className="text-muted-foreground">Create and manage email campaigns for members</p>
          </div>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">1,247</div>
              <div className="text-sm text-muted-foreground">Total Subscribers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">89%</div>
              <div className="text-sm text-muted-foreground">Open Rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">23</div>
              <div className="text-sm text-muted-foreground">Campaigns This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">5</div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {emailCampaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">{campaign.subject}</div>
                      <div className="text-sm text-muted-foreground">
                        {campaign.recipients} recipients • {campaign.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      campaign.status === 'sent' ? 'default' : 
                      campaign.status === 'scheduled' ? 'secondary' : 'outline'
                    }>
                      {campaign.status}
                    </Badge>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Management
        </CardTitle>
        <CardDescription>Configure and send emails to members</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">23 campaigns this month</div>
          <div className="text-sm">89% average open rate</div>
          <div className="text-sm">5 scheduled campaigns</div>
        </div>
      </CardContent>
    </Card>
  );
};
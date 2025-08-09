import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Users, FileText, Clock } from "lucide-react";
import { ModuleProps } from "@/types/unified-modules";
import { CommunicationHub } from "@/components/communication/CommunicationHub";

export const EmailManagementModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const emailCampaigns = [
    { id: 1, subject: "Spring Concert Announcement", recipients: 245, status: "sent", date: "2024-01-15" },
    { id: 2, subject: "Rehearsal Schedule Update", recipients: 52, status: "draft", date: "2024-01-14" },
    { id: 3, subject: "Holiday Break Notice", recipients: 298, status: "scheduled", date: "2024-01-20" }
  ];

  if (isFullPage) {
    return <CommunicationHub />;
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
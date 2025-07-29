import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  Camera, 
  Calendar, 
  FileText, 
  Users, 
  Archive, 
  MessageSquare, 
  FolderOpen, 
  Upload 
} from "lucide-react";
import { DashboardOverview } from "./DashboardOverview";
import { MediaUploadTool } from "./MediaUploadTool";
import { EventDocumentationTracker } from "./EventDocumentationTracker";
import { HistorianJournal } from "./HistorianJournal";
import { InterviewToolkit } from "./InterviewToolkit";
import { ArchiveManagement } from "./ArchiveManagement";
import { CommunicationTools } from "./CommunicationTools";
import { TemplatesResources } from "./TemplatesResources";
import { ReportingPanel } from "./ReportingPanel";

export const HistorianWorkpage = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bebas tracking-wide text-foreground">
            Historian Workpage
          </h1>
          <p className="text-muted-foreground">
            Document events, manage media, conduct interviews, and preserve Glee Club history
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
          <TabsTrigger value="overview" className="text-xs">
            <BarChart3 className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="media-upload" className="text-xs">
            <Upload className="h-4 w-4 mr-1" />
            Media Upload
          </TabsTrigger>
          <TabsTrigger value="event-tracker" className="text-xs">
            <Calendar className="h-4 w-4 mr-1" />
            Event Tracker
          </TabsTrigger>
          <TabsTrigger value="journal" className="text-xs">
            <FileText className="h-4 w-4 mr-1" />
            Journal
          </TabsTrigger>
          <TabsTrigger value="interviews" className="text-xs">
            <Users className="h-4 w-4 mr-1" />
            Interviews
          </TabsTrigger>
          <TabsTrigger value="archive" className="text-xs">
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </TabsTrigger>
          <TabsTrigger value="communication" className="text-xs">
            <MessageSquare className="h-4 w-4 mr-1" />
            Communication
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs">
            <FolderOpen className="h-4 w-4 mr-1" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">
            <BarChart3 className="h-4 w-4 mr-1" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <DashboardOverview />
        </TabsContent>

        <TabsContent value="media-upload">
          <MediaUploadTool />
        </TabsContent>

        <TabsContent value="event-tracker">
          <EventDocumentationTracker />
        </TabsContent>

        <TabsContent value="journal">
          <HistorianJournal />
        </TabsContent>

        <TabsContent value="interviews">
          <InterviewToolkit />
        </TabsContent>

        <TabsContent value="archive">
          <ArchiveManagement />
        </TabsContent>

        <TabsContent value="communication">
          <CommunicationTools />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesResources />
        </TabsContent>

        <TabsContent value="reports">
          <ReportingPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
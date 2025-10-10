import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Video } from "lucide-react";
import { NewsletterManager } from "./NewsletterManager";
import { InterviewManager } from "./InterviewManager";

export const AlumnaeManagementPanel = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>Alumnae Content Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="newsletters" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="newsletters" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Newsletters
            </TabsTrigger>
            <TabsTrigger value="interviews" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Interviews
            </TabsTrigger>
          </TabsList>

          <TabsContent value="newsletters" className="mt-6">
            <NewsletterManager />
          </TabsContent>

          <TabsContent value="interviews" className="mt-6">
            <InterviewManager />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

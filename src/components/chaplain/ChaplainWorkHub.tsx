import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Book, Users, Calendar, MessageSquare, Lightbulb, HeartHandshake } from "lucide-react";
import { SpiritualReflections } from "./SpiritualReflections";
import { PrayerRotations } from "./PrayerRotations";
import { WellnessCheckins } from "./WellnessCheckins";
import { LiturgicalPlanning } from "./LiturgicalPlanning";
import { ChaplainAnnouncements } from "./ChaplainAnnouncements";
import { MemberCare } from "./MemberCare";
import { ChaplainToolkit } from "./ChaplainToolkit";

export const ChaplainWorkHub = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bebas tracking-wide text-foreground mb-2">
          Chaplain Work Hub
        </h2>
        <p className="text-muted-foreground">
          Spiritual guidance and community support for the Glee Club family
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
          <TabsTrigger value="overview" className="text-xs">
            <Heart className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="reflections" className="text-xs">
            <Book className="h-4 w-4 mr-1" />
            Reflections
          </TabsTrigger>
          <TabsTrigger value="prayer" className="text-xs">
            <Users className="h-4 w-4 mr-1" />
            Prayer
          </TabsTrigger>
          <TabsTrigger value="wellness" className="text-xs">
            <Heart className="h-4 w-4 mr-1" />
            Wellness
          </TabsTrigger>
          <TabsTrigger value="liturgical" className="text-xs">
            <Calendar className="h-4 w-4 mr-1" />
            Liturgical
          </TabsTrigger>
          <TabsTrigger value="announcements" className="text-xs">
            <MessageSquare className="h-4 w-4 mr-1" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="member-care" className="text-xs">
            <HeartHandshake className="h-4 w-4 mr-1" />
            Member Care
          </TabsTrigger>
          <TabsTrigger value="toolkit" className="text-xs">
            <Lightbulb className="h-4 w-4 mr-1" />
            Toolkit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("reflections")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  Spiritual Reflections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Share daily devotionals and spiritual insights with the choir family.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("prayer")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Prayer Rotations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Organize prayer chains and spiritual support schedules.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("wellness")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Wellness Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Monitor member wellbeing and provide pastoral care support.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("liturgical")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Liturgical Planning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Plan worship services and spiritual events for the group.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("announcements")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Announcements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Share spiritual reminders and uplifting messages with members.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab("member-care")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-primary" />
                  Member Care
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track and manage pastoral care and member support activities.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Spiritual Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Book className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Daily Devotional - "Finding Harmony in Unity"</p>
                    <p className="text-xs text-muted-foreground">Posted today</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Prayer Circle for Concert Success</p>
                    <p className="text-xs text-muted-foreground">Scheduled for this Friday</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Heart className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Wellness Check completed for all members</p>
                    <p className="text-xs text-muted-foreground">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reflections">
          <SpiritualReflections />
        </TabsContent>

        <TabsContent value="prayer">
          <PrayerRotations />
        </TabsContent>

        <TabsContent value="wellness">
          <WellnessCheckins />
        </TabsContent>

        <TabsContent value="liturgical">
          <LiturgicalPlanning />
        </TabsContent>

        <TabsContent value="announcements">
          <ChaplainAnnouncements />
        </TabsContent>

        <TabsContent value="member-care">
          <MemberCare />
        </TabsContent>

        <TabsContent value="toolkit">
          <ChaplainToolkit />
        </TabsContent>
      </Tabs>
    </div>
  );
};
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Send, Users, Gift } from "lucide-react";
import { ModuleProps } from "@/types/modules";

export const BucketsOfLoveModule = ({ user, isFullPage, onNavigate }: ModuleProps) => {
  const loveMessages = [
    { id: 1, from: "Sarah M.", to: "Jessica K.", message: "Great job at rehearsal today!", date: "Today" },
    { id: 2, from: "Director", to: "All Sopranos", message: "Beautiful harmonies in yesterday's practice", date: "Yesterday" },
    { id: 3, from: "Alumni Board", to: "Current Members", message: "Proud of your dedication this semester", date: "2 days ago" }
  ];

  if (isFullPage) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Buckets of Love</h1>
            <p className="text-muted-foreground">Share encouragement and support within the Glee Club community</p>
          </div>
          <Button>
            <Heart className="h-4 w-4 mr-2" />
            Send Love
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
            <CardHeader>
              <CardTitle className="text-lg text-pink-700">This Week's Love</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loveMessages.map((message) => (
                <div key={message.id} className="p-3 bg-white/70 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    <span className="text-sm font-medium">{message.from}</span>
                    <span className="text-xs text-muted-foreground">→ {message.to}</span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{message.date}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Send to Section
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Gift className="h-4 w-4 mr-2" />
                Recognition Card
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Heart className="h-4 w-4 mr-2" />
                Anonymous Love
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Community Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-2xl font-bold text-pink-600">143</div>
                <div className="text-sm text-muted-foreground">Love messages this month</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-600">89%</div>
                <div className="text-sm text-muted-foreground">Members participated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-600">7.2</div>
                <div className="text-sm text-muted-foreground">Avg messages per person</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-pink-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-pink-700">
          <Heart className="h-5 w-5" />
          Buckets of Love
        </CardTitle>
        <CardDescription>Community support and encouragement</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm">143 messages this month</div>
          <div className="text-sm">89% member participation</div>
          <div className="text-sm">Latest: "Great job at rehearsal today!"</div>
        </div>
      </CardContent>
    </Card>
  );
};
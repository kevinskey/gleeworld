import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronRight, 
  Sparkles,
  Users,
  MessageSquare,
  Heart,
  Activity,
  Bell
} from "lucide-react";

export const CommunityHeader = () => {
  const [quickStatsOpen, setQuickStatsOpen] = useState(true);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Members Dashboard Title */}
      <div className="text-center py-4">
        <h1 className="text-4xl font-bold text-white">Members Dashboard</h1>
      </div>

      {/* Community Overview */}
      <Collapsible open={quickStatsOpen} onOpenChange={setQuickStatsOpen}>
        <Card className="glass-card border border-white/10">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-white/5 transition-colors pb-3 md:pb-4 p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                    {quickStatsOpen ? (
                      <ChevronDown className="h-4 w-4 text-white/70" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-white/70" />
                    )}
                  </Button>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Community Hub
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
                  <Users className="h-4 w-4 mr-1" />
                  Glee Community
                </Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 p-4 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <MessageSquare className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">Messages</div>
                  <div className="text-lg font-semibold text-white">3</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <Heart className="h-5 w-5 text-pink-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">Love Notes</div>
                  <div className="text-lg font-semibold text-white">12</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <Activity className="h-5 w-5 text-green-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">Activities</div>
                  <div className="text-lg font-semibold text-white">8</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <Bell className="h-5 w-5 text-yellow-400 mx-auto mb-2" />
                  <div className="text-sm text-white/70">Updates</div>
                  <div className="text-lg font-semibold text-white">5</div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};
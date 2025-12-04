import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export const AnnouncementsSection = () => {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["fy-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulletin_posts")
        .select("*")
        .eq("is_public", true)
        .or("category.eq.first-year,category.eq.general")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Recent Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Recent Announcements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No announcements at this time. Check back later!
          </p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {announcements.map((announcement) => (
              <div 
                key={announcement.id} 
                className="border-l-4 border-primary/30 pl-3 sm:pl-4 py-2 hover:bg-muted/30 transition-colors rounded-r"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground mb-1 text-sm sm:text-base">
                      {announcement.title}
                    </h4>
                    <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">
                      {announcement.content}
                    </p>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                    <Badge variant={announcement.category === 'first-year' ? 'default' : 'secondary'} className="text-xs">
                      {announcement.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
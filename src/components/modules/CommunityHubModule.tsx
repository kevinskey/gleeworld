import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from 'lucide-react';

export const CommunityHubModule = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Community Hub</CardTitle>
        </div>
        <CardDescription>
          Central space for community discussions and interactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Community Hub features coming soon...</p>
        </div>
      </CardContent>
    </Card>
  );
};
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Megaphone, Users, Crown } from "lucide-react";

const Announcements = () => {
  const navigate = useNavigate();

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Announcements</h1>
          <p className="text-gray-600">Important updates and notifications for Glee Club members</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Communication Center
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Executive board members can access the full communication center with mass email, SMS, and member communications.
              </p>
              <Button 
                onClick={() => navigate('/exec-board')} 
                className="w-full"
              >
                <Crown className="h-4 w-4 mr-2" />
                Go to Executive Board Dashboard
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                View your personal notifications, messages, and updates sent to you.
              </p>
              <Button 
                onClick={() => navigate('/notifications')} 
                variant="outline"
                className="w-full"
              >
                View My Notifications
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default Announcements;
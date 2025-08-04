import { useState } from "react";
import { CommunityHubWidget } from "@/components/unified/CommunityHubWidget";
import { AdminToolsWidget } from "@/components/unified/AdminToolsWidget";
import AlumnaeAdmin from "@/pages/admin/AlumnaeAdmin";
import { RadioManagement } from "@/components/admin/RadioManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Users, 
  GraduationCap, 
  Music, 
  Radio,
  Shield,
  Crown,
  DollarSign
} from "lucide-react";

interface AdminDashboardProps {
  user: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    exec_board_role?: string;
    is_exec_board?: boolean;
    created_at?: string;
  };
}

export const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [activeManagementTab, setActiveManagementTab] = useState("radio");

  const handleNavigateToTab = (tab: string, subTab?: string) => {
    setActiveMainTab(tab);
    if (subTab) {
      setActiveManagementTab(subTab);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="space-y-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="dues" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Dues Management
            </TabsTrigger>
            <TabsTrigger value="student-conductor" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Student Conductor
            </TabsTrigger>
            <TabsTrigger value="alumnae" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Alumnae Admin
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Management
            </TabsTrigger>
            <TabsTrigger value="executive" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Executive Board
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminToolsWidget onNavigateToTab={handleNavigateToTab} />
          </TabsContent>

          <TabsContent value="dues">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Dues Management</h3>
              <p className="text-muted-foreground">Dues management coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="student-conductor">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Student Conductor Dashboard</h3>
              <p className="text-muted-foreground">Student conductor tools coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="alumnae">
            <AlumnaeAdmin />
          </TabsContent>

          <TabsContent value="management">
            <Tabs value={activeManagementTab} onValueChange={setActiveManagementTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="auditions" className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Auditions
                </TabsTrigger>
                <TabsTrigger value="solos" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Solos
                </TabsTrigger>
                <TabsTrigger value="srf" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  SRF
                </TabsTrigger>
                <TabsTrigger value="radio" className="flex items-center gap-2">
                  <Radio className="h-4 w-4" />
                  Radio
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permissions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="auditions">
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Auditions Management</h3>
                  <p className="text-muted-foreground">Auditions management coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="solos">
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Solos Management</h3>
                  <p className="text-muted-foreground">Solos management coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="srf">
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">SRF Management</h3>
                  <p className="text-muted-foreground">SRF management coming soon...</p>
                </div>
              </TabsContent>

              <TabsContent value="radio">
                <RadioManagement />
              </TabsContent>

              <TabsContent value="permissions">
                <div className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">Permissions Management</h3>
                  <p className="text-muted-foreground">Permissions management coming soon...</p>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="executive">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold mb-2">Executive Board Tools</h3>
              <p className="text-muted-foreground">Executive board tools coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
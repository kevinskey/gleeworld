import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PermissionsGrid } from "@/components/admin/PermissionsGrid";
import { EXECUTIVE_POSITIONS, type ExecutivePosition } from "@/hooks/useExecutivePermissions";
import { 
  Crown,
  FileText,
  DollarSign,
  MapPin,
  Shirt,
  BookOpen,
  Clock,
  MessageSquare,
  Heart,
  BarChart,
  Users,
  Mic
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

const getPositionIcon = (position: string) => {
  switch (position) {
    case 'president': return Crown;
    case 'secretary': return FileText;
    case 'treasurer': return DollarSign;
    case 'tour_manager': return MapPin;
    case 'wardrobe_manager': return Shirt;
    case 'librarian': return BookOpen;
    case 'historian': return Clock;
    case 'pr_coordinator': case 'pr_manager': return MessageSquare;
    case 'chaplain': case 'assistant_chaplain': return Heart;
    case 'data_analyst': return BarChart;
    default: return Users;
  }
};

const getPositionColor = (position: string) => {
  switch (position) {
    case 'president': return 'bg-purple-500/10 text-purple-700 border-purple-200';
    case 'secretary': return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'treasurer': return 'bg-green-500/10 text-green-700 border-green-200';
    case 'tour_manager': return 'bg-orange-500/10 text-orange-700 border-orange-200';
    case 'wardrobe_manager': return 'bg-pink-500/10 text-pink-700 border-pink-200';
    case 'librarian': return 'bg-indigo-500/10 text-indigo-700 border-indigo-200';
    case 'historian': return 'bg-amber-500/10 text-amber-700 border-amber-200';
    case 'pr_coordinator': case 'pr_manager': return 'bg-cyan-500/10 text-cyan-700 border-cyan-200';
    case 'chaplain': case 'assistant_chaplain': return 'bg-rose-500/10 text-rose-700 border-rose-200';
    case 'data_analyst': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
    default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
  }
};

export const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const [activePosition, setActivePosition] = useState<ExecutivePosition>(EXECUTIVE_POSITIONS[0]);

  return (
    <div className="min-h-screen bg-muted/30 p-6 -m-6">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Executive Board Permissions Management
            </h1>
            <p className="text-muted-foreground">
              Assign function permissions to executive board positions
            </p>
          </div>

          <Tabs value={activePosition.value} onValueChange={(value) => {
            const position = EXECUTIVE_POSITIONS.find(p => p.value === value);
            if (position) setActivePosition(position);
          }} className="lg:w-auto">
            <TabsList className="flex w-full overflow-x-auto lg:grid lg:grid-cols-6 gap-1 scrollbar-hide p-1 h-auto">
              {EXECUTIVE_POSITIONS.map((position) => {
                const Icon = getPositionIcon(position.value);
                const colorClass = getPositionColor(position.value);
                
                return (
                  <TabsTrigger 
                    key={position.value} 
                    value={position.value} 
                    className="flex-shrink-0 flex flex-col items-center gap-2 p-3 h-auto data-[state=active]:bg-primary/10"
                  >
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-xs">{position.label}</div>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {EXECUTIVE_POSITIONS.map((position) => (
              <TabsContent key={position.value} value={position.value} className="mt-6">
                <PermissionsGrid selectedPosition={position} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </div>
  );
};
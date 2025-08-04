import { useState } from "react";
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

          <div className="flex flex-wrap gap-3">
            {EXECUTIVE_POSITIONS.map((position) => {
              const Icon = getPositionIcon(position.value);
              const isSelected = activePosition.value === position.value;
              
              return (
                <button
                  key={position.value}
                  onClick={() => setActivePosition(position)}
                  className={`p-3 rounded-full border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'bg-green-500 border-green-600 text-white' 
                      : 'bg-red-500 border-red-600 text-white hover:bg-red-400'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <PermissionsGrid selectedPosition={activePosition} />
        </div>
      </div>
    </div>
  );
};
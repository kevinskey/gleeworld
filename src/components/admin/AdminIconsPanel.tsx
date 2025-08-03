import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Package, 
  Calculator, 
  Music, 
  Activity, 
  Settings, 
  FileText,
  Receipt,
  Shield,
  Mail
} from "lucide-react";

interface AdminFunction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tab: string;
  color: string;
}

const adminFunctions: AdminFunction[] = [
  {
    id: 'users',
    title: 'User Management',
    description: 'Manage members, roles & permissions',
    icon: Users,
    tab: 'users',
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: 'products',
    title: 'Shop Products',
    description: 'Manage store inventory & pricing',
    icon: Package,
    tab: 'products',
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: 'accounting',
    title: 'Accounting',
    description: 'Contract finances & stipends',
    icon: Calculator,
    tab: 'accounting',
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    id: 'music',
    title: 'Music Library',
    description: 'Sheet music & audio archives',
    icon: Music,
    tab: 'music',
    color: 'bg-pink-500 hover:bg-pink-600'
  },
  {
    id: 'activity',
    title: 'Activity Logs',
    description: 'Monitor system activity',
    icon: Activity,
    tab: 'activity',
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    id: 'contracts',
    title: 'Contracts',
    description: 'Signature fixes & management',
    icon: FileText,
    tab: 'contracts',
    color: 'bg-indigo-500 hover:bg-indigo-600'
  },
  {
    id: 'receipts',
    title: 'Receipts',
    description: 'Receipt management',
    icon: Receipt,
    tab: 'receipts',
    color: 'bg-teal-500 hover:bg-teal-600'
  },
  {
    id: 'executive',
    title: 'Executive Board',
    description: 'Board member management',
    icon: Shield,
    tab: 'executive-board',
    color: 'bg-red-500 hover:bg-red-600'
  },
  {
    id: 'w9',
    title: 'W9 Forms',
    description: 'Tax form management',
    icon: Mail,
    tab: 'overview',
    color: 'bg-yellow-500 hover:bg-yellow-600'
  },
  {
    id: 'settings',
    title: 'System Settings',
    description: 'Dashboard & system config',
    icon: Settings,
    tab: 'settings',
    color: 'bg-gray-500 hover:bg-gray-600'
  }
];

export const AdminIconsPanel = () => {
  const navigate = useNavigate();

  const handleAdminFunction = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Shield className="h-6 w-6 text-red-500" />
          Admin Controls
        </CardTitle>
        <CardDescription>
          Manage users, products, finances, and system settings
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
          {adminFunctions.map((func) => {
            const IconComponent = func.icon;
            return (
              <Button
                key={func.id}
                variant="outline"
                onClick={() => handleAdminFunction(func.tab)}
                className={`h-20 md:h-24 flex flex-col items-center justify-center space-y-1 md:space-y-2 p-2 md:p-4 border-2 hover:border-transparent transition-all duration-200 ${func.color} hover:text-white border-gray-200 hover:shadow-lg text-xs md:text-sm`}
              >
                <IconComponent className="h-4 w-4 md:h-6 md:w-6" />
                <div className="text-center">
                  <div className="font-medium text-xs leading-tight">{func.title}</div>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-4 md:mt-6 grid grid-cols-1 gap-2 md:gap-4">
          {adminFunctions.slice(0, 4).map((func) => (
            <div
              key={`desc-${func.id}`}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => handleAdminFunction(func.tab)}
            >
              <div className={`p-2 rounded-lg ${func.color} text-white`}>
                <func.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-medium text-sm">{func.title}</div>
                <div className="text-xs text-gray-600">{func.description}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
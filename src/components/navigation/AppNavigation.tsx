
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Home, 
  FileText, 
  Users, 
  Settings, 
  DollarSign, 
  Activity,
  Menu,
  Library,
  PenTool
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, isAdmin } from "@/constants/permissions";

export const AppNavigation = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigationItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: Home,
      permission: null
    },
    {
      label: "Library",
      href: "/?tab=library",
      icon: Library,
      permission: null
    },
    {
      label: "Contracts",
      href: "/",
      icon: FileText,
      permission: "view_own_contracts"
    },
    {
      label: "Finance",
      href: "/?tab=finance",
      icon: DollarSign,
      permission: "view_own_payments"
    },
    {
      label: "Accounting",
      href: "/accounting",
      icon: DollarSign,
      permission: "view_all_payments",
      adminOnly: true
    },
    {
      label: "Admin Signing",
      href: "/admin-signing",
      icon: PenTool,
      permission: "admin_sign_contracts",
      adminOnly: true
    },
    {
      label: "System",
      href: "/system",
      icon: Settings,
      permission: "view_system_settings",
      adminOnly: true
    },
    {
      label: "Activity",
      href: "/activity-logs",
      icon: Activity,
      permission: "view_activity_logs",
      adminOnly: true
    },
    {
      label: "Users",
      href: "/system?tab=users",
      icon: Users,
      permission: "manage_users",
      adminOnly: true
    }
  ];

  const filteredItems = navigationItems.filter(item => {
    if (!user) return false;
    
    if (item.adminOnly && !isAdmin(user.role)) return false;
    
    if (item.permission && !hasPermission(user.role || 'user', item.permission)) {
      return false;
    }
    
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    if (href === "/") {
      return location.pathname === "/" && !location.search;
    }
    if (href.includes("?tab=")) {
      const [path, query] = href.split("?");
      return location.pathname === path && location.search.includes(query);
    }
    return location.pathname === href;
  };

  const NavigationContent = () => (
    <nav className="space-y-2">
      {filteredItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive(item.href)
              ? "bg-brand-100 text-brand-800"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
          {item.adminOnly && (
            <Badge variant="secondary" className="ml-auto text-xs">
              Admin
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-gray-200">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-6">
            <h1 className="text-xl font-bold text-gray-900">Contract Manager</h1>
          </div>
          <div className="mt-5 flex-grow flex flex-col px-4">
            <NavigationContent />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden p-1 sm:p-2">
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 sm:w-64 p-0">
            <div className="flex flex-col h-full">
              <div className="flex items-center h-12 sm:h-16 px-4 border-b">
                <h1 className="text-base sm:text-lg font-bold text-gray-900">Contract Manager</h1>
              </div>
              <div className="flex-1 px-4 py-4">
                <NavigationContent />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};


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
  PenTool,
  Calendar
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
      label: "Event Planner",
      href: "/event-planner",
      icon: Calendar,
      permission: null
    },
    {
      label: "Content Creator",
      href: "/content-creator",
      icon: PenTool,
      permission: null
    },
    {
      label: "System",
      href: "/system",
      icon: Settings,
      permission: "view_system_settings",
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

  // Desktop horizontal navigation for header
  const DesktopNavigation = () => (
    <nav className="flex items-center space-x-1">
      {filteredItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isActive(item.href)
              ? "bg-white/20 text-white"
              : "text-white/80 hover:text-white hover:bg-white/10"
          }`}
        >
          <item.icon className="h-4 w-4" />
          <span className="hidden lg:inline">{item.label}</span>
          {item.adminOnly && (
            <Badge variant="secondary" className="ml-1 text-xs bg-white/20 text-white border-white/30">
              Admin
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  );

  // Mobile navigation content for sheet
  const MobileNavigationContent = () => (
    <nav className="space-y-1">
      {filteredItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors touch-manipulation ${
            isActive(item.href)
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <item.icon className="h-5 w-5" />
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
      {/* Desktop Navigation - Horizontal for header */}
      <div className="hidden md:block">
        <DesktopNavigation />
      </div>

      {/* Mobile Navigation - Sheet sidebar */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:bg-white/10 p-2 min-h-[40px] min-w-[40px] touch-manipulation"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-background">
            <div className="flex flex-col h-full">
              <div className="flex items-center h-16 px-4 border-b bg-gradient-to-r from-brand-700 to-brand-800">
                <h1 className="text-lg font-bold text-white">Contract Manager</h1>
              </div>
              <div className="flex-1 px-4 py-6">
                <MobileNavigationContent />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

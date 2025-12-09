
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
  Calendar,
  CalendarDays,
  Music,
  ShoppingCart,
  ShoppingBag,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Sofa
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/constants/permissions";
import { MobileNavigationFlow } from "./flow/MobileNavigationFlow";
import { useUserRole } from "@/hooks/useUserRole";

export const AppNavigation = () => {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isInstructor = profile?.role === 'instructor' || profile?.is_admin || profile?.is_super_admin;

  const navigationItems = [
    {
      label: "Library",
      href: "/?tab=library",
      icon: Library,
      permission: null
    },
    ...(isInstructor ? [{
      label: "Grading",
      href: "/grading/instructor/dashboard",
      icon: BookOpen,
      permission: null
    }] : []),
    {
      label: "My Grades",
      href: "/student/my-submissions",
      icon: GraduationCap,
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
      label: "Amazon Shopping",
      href: "/amazon-shopping",
      icon: ShoppingCart,
      permission: null
    },
    {
      label: "Music Library",
      href: "/music-library",
      icon: Music,
      permission: null
    },
    {
      label: "Calendar",
      href: "/calendar",
      icon: Calendar,
      permission: null
    },
    {
      label: "Event Planner",
      href: "/event-planner",
      icon: CalendarDays,
      permission: null
    },
    {
      label: "Modules",
      href: "/modules",
      icon: LayoutDashboard,
      permission: null
    },
    {
      label: "Glee Lounge",
      href: "/glee-lounge",
      icon: Sofa,
      permission: null
    },
  ];

  const filteredItems = navigationItems.filter(item => {
    if (!user) return false;
    
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
              ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
              : "text-primary/90 hover:text-primary hover:bg-primary/10 border border-transparent"
          }`}
        >
          <item.icon className="h-4 w-4" />
          <span className="hidden lg:inline">{item.label}</span>
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
        </Link>
      ))}
    </nav>
  );

  // Mobile Navigation Flow Component
  const MobileNavigationFlowContent = () => (
    <div className="h-[50vh] w-full mb-4">
      <MobileNavigationFlow />
    </div>
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
              className="text-primary hover:bg-primary/10 border border-primary/30 p-2 min-h-[40px] min-w-[40px] touch-manipulation"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-background">
            <div className="flex flex-col h-full">
              <div className="flex items-center h-16 px-4 border-b bg-gradient-to-r from-brand-700 to-brand-800">
                <h1 className="text-lg font-bold text-white">Navigation Flow</h1>
              </div>
              <div className="flex-1 px-4 py-6">
                <MobileNavigationFlowContent />
                
                {/* Traditional navigation as fallback */}
                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">Quick Links</h3>
                  <MobileNavigationContent />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

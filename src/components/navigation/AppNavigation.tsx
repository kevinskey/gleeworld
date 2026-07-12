import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Home,
  FileText,
  Settings,
  DollarSign,
  Menu,
  Library,
  Calendar,
  CalendarDays,
  Music,
  ShoppingCart,
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Images,
  Bookmark,
  Rss,
  ChevronDown,
  MessageCircle,
  Mic,
  Ticket,
  Users,
  Disc3,
  Film,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/constants/permissions";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  permission?: string | null;
  /** restrict to instructors / admins / super admins */
  instructorsOnly?: boolean;
  /** restrict to students (hidden for instructors/admins) */
  studentsOnly?: boolean;
};

type NavGroup = {
  label: string;
  /** default open state when no localStorage preference yet */
  defaultOpen?: boolean;
  /** hide whole group from non-admins */
  adminOnly?: boolean;
  items: NavItem[];
};

// Grouped + categorized nav. Order within a group is intentional —
// most-frequently-touched on top. The bottom nav covers Home / Messenger
// / Music Library / Toolkit so the sheet leans on grouping for everything
// else.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Today",
    defaultOpen: true,
    items: [
      { label: "Home", href: "/dashboard", icon: Home },
      { label: "Calendar", href: "/dashboard/calendar", icon: Calendar },
      { label: "Messages", href: "/dashboard/messenger", icon: MessageCircle },
    ],
  },
  {
    label: "Music",
    defaultOpen: true,
    items: [
      { label: "Music Library", href: "/dashboard/music-library", icon: Music },
      { label: "Concert Planner", href: "/dashboard/concert-planner", icon: CalendarDays },
      { label: "Part Tracks", href: "/dashboard/part-tracks", icon: Disc3 },
      { label: "Practice Studio", href: "/practice-studio", icon: Mic },
      { label: "Studio", href: "/studio", icon: Disc3 },
      { label: "Video", href: "/video", icon: Film },
    ],
  },
  {
    label: "Academy",
    items: [
      { label: "Courses", href: "/modules", icon: LayoutDashboard },
      { label: "Academy", href: "/academy/canvas", icon: GraduationCap },
      { label: "Grading", href: "/grading/instructor/dashboard", icon: BookOpen, instructorsOnly: true },
      { label: "My Grades", href: "/student/my-submissions", icon: GraduationCap, studentsOnly: true },
    ],
  },
  {
    label: "Files & Media",
    items: [
      { label: "Photo Gallery", href: "/photo-gallery", icon: Images },
      { label: "Saved Feed", href: "/saved-feed", icon: Bookmark },
      { label: "Contracts", href: "/", icon: FileText, permission: "view_own_contracts" },
    ],
  },
  {
    label: "Operations",
    adminOnly: true,
    items: [
      { label: "Event Planner", href: "/event-planner", icon: CalendarDays },
      { label: "Box Office", href: "/box-office", icon: Ticket },
      { label: "Finance", href: "/?tab=finance", icon: DollarSign, permission: "view_own_payments" },
      { label: "Feed Control", href: "/feed-control", icon: Rss, permission: "manage_settings" },
      { label: "Amazon Shopping", href: "/amazon-shopping", icon: ShoppingCart },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Workspace", href: "/dashboard/workspace", icon: Settings, permission: "manage_settings" },
      { label: "Members", href: "/dashboard/users", icon: Users, permission: "manage_settings" },
      { label: "LTI Platforms", href: "/dashboard/lti-platforms", icon: BookOpen, permission: "manage_settings" },
    ],
  },
];

const STATE_KEY = "gw-nav-group-state";

function loadOpenState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOpenState(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore — localStorage may be disabled */
  }
}

export const AppNavigation = () => {
  const { user } = useAuth();
  const { profile } = useUserRole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => loadOpenState());

  const isInstructor =
    profile?.role === "instructor" || profile?.is_admin || profile?.is_super_admin;
  const isAdmin = profile?.is_admin || profile?.is_super_admin;

  // Filter each group's items + drop groups that end up empty or are
  // admin-only when the viewer isn't admin.
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => {
      if (!user) return false;
      if (item.instructorsOnly && !isInstructor) return false;
      if (item.studentsOnly && isInstructor) return false;
      if (item.permission && !hasPermission(user.role || "user", item.permission)) return false;
      return true;
    }),
  })).filter((g) => {
    if (g.adminOnly && !isAdmin) return false;
    return g.items.length > 0;
  });

  // Flat list used by the desktop horizontal nav — grouping only matters
  // on mobile where the sheet has vertical room for accordion headers.
  const flatItems = visibleGroups.flatMap((g) => g.items);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/" && !location.search;
    if (href.includes("?tab=")) {
      const [path, query] = href.split("?");
      return location.pathname === path && location.search.includes(query);
    }
    return location.pathname === href;
  };

  const toggleGroup = (label: string, current: boolean) => {
    const next = { ...openGroups, [label]: !current };
    setOpenGroups(next);
    saveOpenState(next);
  };

  // localStorage round-trip on mount in case another tab updated state.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STATE_KEY) setOpenGroups(loadOpenState());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const DesktopNavigation = () => (
    <nav className="flex items-center space-x-1 overflow-x-auto scrollbar-hide max-w-full">
      {flatItems.map((item) => (
        <Link
          key={item.href + item.label}
          to={item.href}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
              : "text-primary/90 hover:text-primary hover:bg-primary/10 border border-transparent"
          )}
        >
          <item.icon className="h-4 w-4" />
          <span className="hidden lg:inline">{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  const MobileNavigationContent = () => (
    <nav className="space-y-2">
      {visibleGroups.map((group) => {
        const stored = openGroups[group.label];
        const open = stored ?? !!group.defaultOpen;
        return (
          <Collapsible
            key={group.label}
            open={open}
            onOpenChange={() => toggleGroup(group.label, open)}
            className="border border-border rounded-lg overflow-hidden"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-foreground bg-muted/40 hover:bg-muted transition-colors">
              <span>{group.label}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform text-muted-foreground",
                  open ? "rotate-180" : ""
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="py-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href + item.label}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors touch-manipulation",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="hidden md:block">
        <DesktopNavigation />
      </div>

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
          <SheetContent
            side="left"
            className="w-80 p-0 bg-background flex flex-col max-h-screen"
          >
            <div className="flex items-center h-16 px-4 border-b bg-gradient-to-r from-brand-700 to-brand-800 flex-shrink-0">
              <h1 className="text-lg font-bold text-white">Navigation</h1>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y px-4 py-4 -webkit-overflow-scrolling-touch">
              <MobileNavigationContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

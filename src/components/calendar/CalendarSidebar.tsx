import { Calendar, Upload, Settings, List, Grid, Clock, Home, ArrowLeft } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Calendar View", url: "/calendar", icon: Calendar },
  { title: "Events List", url: "/calendar/events", icon: List },
  { title: "Monthly Grid", url: "/calendar/monthly", icon: Grid },
  { title: "Upcoming", url: "/calendar/upcoming", icon: Clock },
];

const toolItems = [
  { title: "Google Sync", url: "/calendar/sync", icon: Upload },
  { title: "Settings", url: "/calendar/settings", icon: Settings },
];

export function CalendarSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
            <NavLink to="/">
              <ArrowLeft className="h-4 w-4" />
            </NavLink>
          </Button>
          {state === "expanded" && (
            <div className="flex flex-col">
              <h2 className="text-sm font-semibold">Calendar</h2>
              <p className="text-xs text-muted-foreground">Manage events & sync</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 px-3 mb-2">
            Views
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-9 rounded-md transition-all duration-200">
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {state === "expanded" && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground/70 px-3 mb-2">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {toolItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-9 rounded-md transition-all duration-200">
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {state === "expanded" && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-9 rounded-md transition-all duration-200">
                  <NavLink to="/" className="hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                    <Home className="h-4 w-4 shrink-0" />
                    {state === "expanded" && <span className="truncate">Back to Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
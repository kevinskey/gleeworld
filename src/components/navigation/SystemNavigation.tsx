import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { 
  Settings, 
  Users, 
  FileText, 
  Calculator, 
  Shield, 
  ChevronDown,
  TrendingUp,
  CreditCard,
  PieChart,
  BarChart3,
  DollarSign,
  Menu,
  Music,
  Calendar,
  Activity,
  Crown
} from "lucide-react";

interface SystemNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobile?: boolean;
}

export const SystemNavigation = ({ activeTab, onTabChange, isMobile }: SystemNavigationProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const getTabClasses = (tabValue: string, isDropdown: boolean = false) => {
    const financialTabs = ['financial-overview', 'user-records', 'payment-tracking', 'stipends', 'budget', 'reports', 'payments', 'w9', 'financial', 'w9-forms'];
    const systemTabs = ['dashboard', 'users', 'activity', 'settings', 'executive-board'];
    
    const isActive = activeTab === tabValue || 
      (isDropdown && tabValue === 'financial' && financialTabs.includes(activeTab)) ||
      (isDropdown && tabValue === 'system' && systemTabs.includes(activeTab));
    
    return `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? "bg-white/20 text-white"
        : "text-white/80 hover:text-white hover:bg-white/10"
    }`;
  };

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-1 sm:p-2">
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 sm:w-64 p-0 bg-background">
          <div className="flex flex-col h-full">
            <div className="flex items-center h-12 sm:h-16 px-4 border-b">
              <h1 className="text-2xl sm:text-lg font-bold">System Admin</h1>
            </div>
            <div className="flex-1 px-4 py-4 space-y-2">
              <Button
                variant="ghost"
                onClick={() => { onTabChange('contracts'); setMobileOpen(false); }}
                className={`w-full justify-start ${activeTab === 'contracts' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <FileText className="h-4 w-4 mr-3" />
                Contracts
              </Button>
              <Button
                variant="ghost"
                onClick={() => { onTabChange('calendar'); setMobileOpen(false); }}
                className={`w-full justify-start ${activeTab === 'calendar' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Calendar className="h-4 w-4 mr-3" />
                Calendar
              </Button>
              <Button
                variant="ghost"
                onClick={() => { onTabChange('music'); setMobileOpen(false); }}
                className={`w-full justify-start ${activeTab === 'music' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Music className="h-4 w-4 mr-3" />
                Music
              </Button>
              <Button
                variant="ghost"
                onClick={() => { onTabChange('executive-board'); setMobileOpen(false); }}
                className={`w-full justify-start ${activeTab === 'executive-board' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Crown className="h-4 w-4 mr-3" />
                Executive Board
              </Button>
              <Button
                variant="ghost"
                onClick={() => { onTabChange('dashboard'); setMobileOpen(false); }}
                className={`w-full justify-start ${activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Settings className="h-4 w-4 mr-3" />
                System
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <nav className="flex items-center space-x-1">
      <Button
        variant="ghost"
        onClick={() => onTabChange('contracts')}
        className={getTabClasses('contracts')}
      >
        <FileText className="h-4 w-4" />
        <span className="hidden lg:inline">Contracts</span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => onTabChange('calendar')}
        className={getTabClasses('calendar')}
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden lg:inline">Calendar</span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => onTabChange('music')}
        className={getTabClasses('music')}
      >
        <Music className="h-4 w-4" />
        <span className="hidden lg:inline">Music</span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => onTabChange('executive-board')}
        className={getTabClasses('executive-board')}
      >
        <Crown className="h-4 w-4" />
        <span className="hidden lg:inline">Exec Board</span>
      </Button>

      {/* Financial Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={getTabClasses('financial', true)}
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden lg:inline">Financial</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-white border shadow-lg z-50">
          {/* Overview & Analytics */}
          <DropdownMenuItem onClick={() => onTabChange('financial-overview')}>
            <TrendingUp className="h-4 w-4 mr-3" />
            Overview & Analytics
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange('reports')}>
            <BarChart3 className="h-4 w-4 mr-3" />
            Financial Reports
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          
          {/* User Management */}
          <DropdownMenuItem onClick={() => onTabChange('user-records')}>
            <FileText className="h-4 w-4 mr-3" />
            User Records
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange('payments')}>
            <DollarSign className="h-4 w-4 mr-3" />
            User Payments
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          
          {/* Transactions */}
          <DropdownMenuItem onClick={() => onTabChange('payment-tracking')}>
            <CreditCard className="h-4 w-4 mr-3" />
            Payment Tracking
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange('budget')}>
            <PieChart className="h-4 w-4 mr-3" />
            Budget Planning
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          
          {/* Forms & Compliance */}
          <DropdownMenuItem onClick={() => onTabChange('w9')}>
            <FileText className="h-4 w-4 mr-3" />
            W9 Tax Forms
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange('stipends')}>
            <DollarSign className="h-4 w-4 mr-3" />
            Stipend Management
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.location.href = '/treasurer'}>
            <DollarSign className="h-4 w-4 mr-3" />
            Treasurer Dashboard
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* System Dropdown - moved to end */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={getTabClasses('system', true)}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline">System</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 bg-white border shadow-lg z-50">
          <DropdownMenuItem onClick={() => onTabChange('dashboard')}>
            <Settings className="h-4 w-4 mr-3" />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange('users')}>
            <Users className="h-4 w-4 mr-3" />
            User Management
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange('executive-board')}>
            <Crown className="h-4 w-4 mr-3" />
            Executive Board
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange('activity')}>
            <Activity className="h-4 w-4 mr-3" />
            Activity Logs
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTabChange('settings')}>
            <Settings className="h-4 w-4 mr-3" />
            System Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
};
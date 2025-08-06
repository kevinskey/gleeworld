import { useState } from 'react';
import { Crown, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExecBoardModulePanel } from "./ExecBoardModulePanel";
import { useAuth } from "@/contexts/AuthContext";

interface ExecBoardSidebarProps {
  className?: string;
}

export const ExecBoardSidebar = ({ className }: ExecBoardSidebarProps) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`relative transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'} ${className}`}>
      {/* Collapse/Expand Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSidebar}
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full p-0 shadow-md"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div className={`h-full transition-all duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {!isCollapsed && (
          <div className="p-4 space-y-4">
            {/* Header */}
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Executive Board</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings className="h-3 w-3" />
                </Button>
              </div>
            </Card>

            {/* Module Panel */}
            <ExecBoardModulePanel userEmail={user?.email} />
          </div>
        )}
      </div>

      {/* Collapsed State - Mini Icons */}
      {isCollapsed && (
        <div className="p-2 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Executive Board"
          >
            <Crown className="h-4 w-4 text-yellow-600" />
          </Button>
        </div>
      )}
    </div>
  );
};
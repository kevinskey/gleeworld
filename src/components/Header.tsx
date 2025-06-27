
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, LogOut, Settings, Receipt, Library, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Header = ({ activeTab, onTabChange }: HeaderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        toast({
          title: "Error",
          description: "Failed to log out. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Logged out successfully",
        });
        navigate("/auth");
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Settings },
    { id: "library", label: "Library", icon: Library },
    { id: "receipts", label: "Receipts", icon: Receipt },
    { id: "system", label: "System", icon: Monitor },
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === "system") {
      navigate("/system");
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold text-white">
              GleeWorld <span className="text-brand-200">Contracts</span>
            </h1>
            
            <nav className="hidden md:flex items-center space-x-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg transition-all
                    ${activeTab === tab.id 
                      ? "bg-brand-400 text-white shadow-lg" 
                      : "text-white/80 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden mt-4 flex items-center space-x-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              onClick={() => handleTabClick(tab.id)}
              size="sm"
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-lg transition-all whitespace-nowrap
                ${activeTab === tab.id 
                  ? "bg-brand-400 text-white shadow-lg" 
                  : "text-white/80 hover:text-white hover:bg-white/10"
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Button>
          ))}
        </nav>
      </div>
    </header>
  );
};

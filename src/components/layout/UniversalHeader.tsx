
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, User, Settings, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppNavigation } from "@/components/navigation/AppNavigation";
import { AIAssist } from "@/components/shared/AIAssist";
import { DashboardSwitcher } from "@/components/navigation/DashboardSwitcher";
import { useIsMobile } from "@/hooks/use-mobile";

export const UniversalHeader = () => {
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">CM</span>
              </div>
              <span className="text-white font-semibold text-base sm:text-lg hidden xs:block">
                Contract Manager
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            {user && !isMobile && <AppNavigation />}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <>
                {/* Mobile Navigation */}
                {isMobile && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64">
                      <div className="py-4">
                        <AppNavigation />
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
                
                <DashboardSwitcher />
                
                <AIAssist 
                  context="contract management" 
                  placeholder="How can I help you today?"
                  className="hidden sm:flex"
                />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-7 w-7 sm:h-8 sm:w-8 rounded-full p-0">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                        <AvatarImage className="bg-white/20 text-white flex items-center justify-center">
                          <span className="text-white text-xs sm:text-sm">{getInitials(user.email || '')}</span>
                        </AvatarImage>
                        <AvatarFallback className="bg-white/20 text-white">
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none truncate">{user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        Signed in
                      </p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/system" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {!user && (
              <Button asChild variant="secondary" size="sm">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

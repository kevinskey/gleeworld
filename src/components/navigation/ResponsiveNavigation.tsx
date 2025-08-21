import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ModeToggle } from "@/components/shared/ModeToggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Menu } from "lucide-react";

interface ResponsiveNavigationProps {
  isAuthenticated: boolean;
  user: any;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({ user, isAuthenticated }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { userProfile } = useUserProfile(user);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const publicNavItems = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Events', href: '/events' },
    { name: 'Join', href: '/join' },
    { name: 'Contact', href: '/contact' },
    { name: 'Shop', href: '/shop' },
    { name: 'Ofc Hours', href: '/booking' },
  ];

  const authNavItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Music Library', href: '/music' },
    { name: 'Events', href: '/my-events' },
    { name: 'Profile', href: '/profile' },
  ];

  const adminNavItems = [
    { name: 'Admin Dashboard', href: '/admin/dashboard' },
    { name: 'Access Control', href: '/admin/access' },
    { name: 'Calendar Admin', href: '/admin/calendar' },
    { name: 'Communications', href: '/admin/communications' },
  ];

  return (
    <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b">
      <div className="container flex items-center justify-between py-4">
        <Link to="/" className="font-bold text-xl">
          GleeWorld
        </Link>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:w-64">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription>
                Explore GleeWorld
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 py-4">
              {publicNavItems.map((item) => (
                <Link key={item.name} to={item.href} className="block py-2 hover:bg-gray-100 rounded-md px-3">
                  {item.name}
                </Link>
              ))}

              {isAuthenticated && (
                <>
                  <h4 className="font-semibold text-sm text-muted-foreground px-3">My Account</h4>
                  {authNavItems.map((item) => (
                    <Link key={item.name} to={item.href} className="block py-2 hover:bg-gray-100 rounded-md px-3">
                      {item.name}
                    </Link>
                  ))}

                  {userProfile?.is_admin && (
                    <>
                      <h4 className="font-semibold text-sm text-muted-foreground px-3">Admin Tools</h4>
                      {adminNavItems.map((item) => (
                        <Link key={item.name} to={item.href} className="block py-2 hover:bg-gray-100 rounded-md px-3">
                          {item.name}
                        </Link>
                      ))}
                    </>
                  )}

                  <Button variant="destructive" size="sm" onClick={handleLogout} className="w-full">
                    Logout
                  </Button>
                </>
              )}

              {!isAuthenticated && (
                <>
                  <Link to="/login" className="block py-2 hover:bg-gray-100 rounded-md px-3">
                    Login
                  </Link>
                  <Link to="/register" className="block py-2 hover:bg-gray-100 rounded-md px-3">
                    Register
                  </Link>
                </>
              )}

              <ModeToggle />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          {publicNavItems.map((item) => (
            <Link key={item.name} to={item.href} className="hidden md:block text-gray-700 hover:text-gray-900">
              {item.name}
            </Link>
          ))}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.full_name} />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                {authNavItems.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link to={item.href}>{item.name}</Link>
                  </DropdownMenuItem>
                ))}

                {userProfile?.is_admin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Admin Tools</DropdownMenuLabel>
                    {adminNavItems.map((item) => (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link to={item.href}>{item.name}</Link>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <ModeToggle />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="hidden md:block text-gray-700 hover:text-gray-900">
                Login
              </Link>
              <Link to="/register" className="hidden md:block text-gray-700 hover:text-gray-900">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveNavigation;

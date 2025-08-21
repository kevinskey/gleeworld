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
  isAuthenticated?: boolean;
  user?: any;
  mobile?: boolean;
  onItemClick?: () => void;
}

const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({ 
  user, 
  isAuthenticated, 
  mobile = false, 
  onItemClick 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { userProfile } = useUserProfile(user);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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
    { name: 'Dashboard', href: '/app/dashboard' },
    { name: 'Music Library', href: '/app/music' },
    { name: 'Auditions', href: '/app/auditions' },
    { name: 'Communications', href: '/app/communications' },
    { name: 'Budgeting', href: '/app/budgeting' },
    { name: 'Wellness', href: '/app/wellness' },
    { name: 'First Year', href: '/app/first-year' },
    { name: 'Handbook Exam', href: '/app/handbook-exam' },
    { name: 'Handbook Signature', href: '/app/handbook-signature' },
    { name: 'Profile', href: '/app/profile' },
  ];

  const adminNavItems = [
    { name: 'Admin Dashboard', href: '/admin/dashboard' },
    { name: 'Access Control', href: '/admin/access' },
    { name: 'Roles', href: '/admin/roles' },
    { name: 'Modules', href: '/admin/modules' },
    { name: 'Calendar Admin', href: '/admin/calendar' },
    { name: 'Events', href: '/admin/events' },
    { name: 'Budgets', href: '/admin/budgets' },
    { name: 'Users', href: '/admin/users' },
    { name: 'Handbook', href: '/admin/handbook' },
  ];

  if (mobile) {
    return (
      <div className="flex flex-col gap-2">
        {publicNavItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.href} 
            className="block py-2 hover:bg-gray-100 rounded-md px-3"
            onClick={onItemClick}
          >
            {item.name}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {publicNavItems.map((item) => (
        <Link key={item.name} to={item.href} className="text-gray-700 hover:text-gray-900">
          {item.name}
        </Link>
      ))}
    </div>
  );
};

export default ResponsiveNavigation;

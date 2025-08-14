import React from 'react';
import { Button } from '@/components/ui/button';
import { Music, User, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UniversalHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <Music className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">GleeWorld</h1>
              <p className="text-xs opacity-90">Spelman College Glee Club</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Button 
              variant="ghost" 
              className="text-white hover:text-blue-200 hover:bg-blue-800"
              onClick={() => navigate('/')}
            >
              Home
            </Button>
            <Button 
              variant="ghost" 
              className="text-white hover:text-blue-200 hover:bg-blue-800"
              onClick={() => navigate('/sight-reading-generator')}
            >
              Sight-Singing Studio
            </Button>
            <Button 
              variant="ghost" 
              className="text-white hover:text-blue-200 hover:bg-blue-800"
            >
              Events
            </Button>
            <Button 
              variant="ghost" 
              className="text-white hover:text-blue-200 hover:bg-blue-800"
            >
              Shop
            </Button>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:text-blue-200 hover:bg-blue-800"
            >
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
            
            {/* Mobile Menu Button */}
            <Button 
              variant="ghost" 
              size="sm"
              className="md:hidden text-white hover:text-blue-200 hover:bg-blue-800"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Page Title Section */}
        <div className="mt-4 text-center border-t border-blue-600 pt-4">
          <h2 className="text-lg font-semibold">Sight-Singing Studio</h2>
          <p className="text-sm opacity-90">Generate, practice, and evaluate sight-singing exercises</p>
        </div>
      </div>
    </header>
  );
};
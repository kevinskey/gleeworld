import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const AdminGradesCard: React.FC = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('gw_profiles')
        .select('is_admin, is_super_admin, is_exec_board')
        .eq('user_id', user.id)
        .single();
      
      if (data && !error) {
        setIsAdmin(data.is_admin || data.is_super_admin || data.is_exec_board);
      }
    };

    checkAdminStatus();
  }, [user]);

  if (!isAdmin) {
    return null; // Don't show the card to non-admins
  }

  return (
    <Link 
      to="/classes/mus240/instructor/console" 
      className="group block"
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl lg:rounded-3xl px-6 py-4 sm:px-4 sm:py-3 lg:px-8 lg:py-5 xl:px-10 xl:py-6 shadow-xl border border-white/30 hover:bg-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
        <div className="flex items-center gap-4 sm:gap-3 lg:gap-6 mb-4 sm:mb-3 lg:mb-6">
          <div className="p-3 sm:p-2 md:p-5 lg:p-4 xl:p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg lg:rounded-xl">
            <Settings className="h-6 w-6 sm:h-5 sm:w-5 md:h-8 md:w-8 lg:h-10 lg:w-10 xl:h-12 xl:w-12 text-white" />
          </div>
          <h3 className="text-5xl sm:text-2xl md:text-4xl lg:text-3xl xl:text-4xl font-semibold text-gray-900">Administrator</h3>
        </div>
        <p className="text-gray-600 text-xl sm:text-sm md:text-lg lg:text-base xl:text-lg leading-relaxed">Manage student enrollments and grades</p>
      </div>
    </Link>
  );
};
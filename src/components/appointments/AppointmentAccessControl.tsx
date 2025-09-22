import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AppointmentAccessControlProps {
  children: React.ReactNode;
}

export const AppointmentAccessControl = ({ children }: AppointmentAccessControlProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
          .from('gw_profiles')
          .select('email, exec_board_role, is_admin, is_super_admin')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        // If user is Drew or Soleil (wardrobe managers), redirect to wardrobe appointments
        const wardrobeManagerEmails = [
          'drewroberts@spelman.edu',
          'soleilvailes@spelman.edu',
          'soleilvailes111@gmail.com'
        ];

        const userEmail = profile?.email?.toLowerCase() || '';
        const isWardrobe = profile?.exec_board_role === 'wardrobe_manager';
        const isWardrobeManager = wardrobeManagerEmails.includes(userEmail) || isWardrobe;

        // Redirect wardrobe managers to their specific page (unless they're admins)
        if (isWardrobeManager && !profile?.is_admin && !profile?.is_super_admin) {
          navigate('/wardrobe-appointments', { replace: true });
        }
      } catch (error) {
        console.error('Error checking user access:', error);
      }
    };

    checkUserAccess();
  }, [user, navigate]);

  return <>{children}</>;
};
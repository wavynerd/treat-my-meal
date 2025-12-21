import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/auth');
          return;
        }

        setUserId(user.id);

        // Check if user has admin role
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking admin role:', error);
          navigate('/dashboard');
          return;
        }

        if (!roleData) {
          navigate('/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error in admin check:', error);
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  return { isAdmin, isLoading, userId };
};

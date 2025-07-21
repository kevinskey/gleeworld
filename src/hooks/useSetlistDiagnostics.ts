
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSetlistDiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState({
    setlistsTableExists: false,
    setlistItemsTableExists: false,
    sheetMusicTableExists: false,
    authWorking: false,
    hasPermissions: false,
    errors: [] as string[]
  });

  const runDiagnostics = async () => {
    const errors: string[] = [];
    
    try {
      // Check auth
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const authWorking = !authError && !!authData.user;
      
      if (authError) {
        errors.push(`Auth error: ${authError.message}`);
      }

      // Test setlists table
      const { error: setlistsError } = await supabase
        .from('setlists')
        .select('id', { count: 'exact', head: true });
      
      const setlistsTableExists = !setlistsError;
      if (setlistsError) {
        errors.push(`Setlists table error: ${setlistsError.message}`);
      }

      // Test setlist_items table
      const { error: itemsError } = await supabase
        .from('setlist_items')
        .select('id', { count: 'exact', head: true });
      
      const setlistItemsTableExists = !itemsError;
      if (itemsError) {
        errors.push(`Setlist items table error: ${itemsError.message}`);
      }

      // Test gw_sheet_music table
      const { error: sheetMusicError } = await supabase
        .from('gw_sheet_music')
        .select('id', { count: 'exact', head: true });
      
      const sheetMusicTableExists = !sheetMusicError;
      if (sheetMusicError) {
        errors.push(`Sheet music table error: ${sheetMusicError.message}`);
      }

      // Test permissions by trying to insert a test record (we'll rollback)
      let hasPermissions = false;
      if (authWorking && setlistsTableExists) {
        const { error: permissionError } = await supabase
          .from('setlists')
          .insert({
            title: 'TEST_PERMISSION_CHECK',
            created_by: authData.user?.id
          })
          .select()
          .single();

        if (!permissionError) {
          // Clean up test record
          await supabase
            .from('setlists')
            .delete()
            .eq('title', 'TEST_PERMISSION_CHECK')
            .eq('created_by', authData.user?.id);
          hasPermissions = true;
        } else {
          errors.push(`Permission error: ${permissionError.message}`);
        }
      }

      setDiagnostics({
        setlistsTableExists,
        setlistItemsTableExists,
        sheetMusicTableExists,
        authWorking,
        hasPermissions,
        errors
      });

    } catch (error) {
      console.error('Diagnostics error:', error);
      errors.push(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDiagnostics(prev => ({ ...prev, errors }));
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return { diagnostics, runDiagnostics };
};

import { supabase } from '@/integrations/supabase/client';

/**
 * Utility function to clean up duplicate bucket of love entries
 * This should only be run by the user who created the duplicates
 */
export const cleanupDuplicateBuckets = async () => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Find duplicates with the specific message and timestamp
    const duplicateMessage = 'Wishing all of our 105 members a safe and successful semester! DOC';
    const duplicateTimestamp = '2025-08-23T23:07:37.100057+00:00';

    const { data: duplicates, error: fetchError } = await supabase
      .from('gw_buckets_of_love')
      .select('id')
      .eq('message', duplicateMessage)
      .eq('created_at', duplicateTimestamp)
      .eq('user_id', user.id)
      .order('id');

    if (fetchError) throw fetchError;

    if (!duplicates || duplicates.length <= 1) {
      console.log('No duplicates found or only one entry exists');
      return { success: true, deleted: 0 };
    }

    // Keep the first one, delete the rest
    const idsToDelete = duplicates.slice(1).map(d => d.id);
    
    console.log(`Found ${duplicates.length} duplicates, deleting ${idsToDelete.length}`);

    // Delete duplicates one by one to respect RLS policies
    let deletedCount = 0;
    for (const id of idsToDelete) {
      const { error: deleteError } = await supabase
        .from('gw_buckets_of_love')
        .delete()
        .eq('id', id);
      
      if (deleteError) {
        console.error(`Failed to delete bucket ${id}:`, deleteError);
      } else {
        deletedCount++;
      }
    }

    console.log(`Successfully deleted ${deletedCount} duplicate buckets`);
    return { success: true, deleted: deletedCount };

  } catch (error) {
    console.error('Error cleaning up duplicate buckets:', error);
    return { success: false, error: error.message };
  }
};

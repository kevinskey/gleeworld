import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface JournalEntry {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  word_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  author_name?: string;
}

export interface JournalComment {
  id: string;
  journal_id: string;
  commenter_id: string;
  content: string;
  created_at: string;
  author_name: string;
}

export interface ReadingProgress {
  id: string;
  journal_id: string;
  user_id: string;
  pages_read: number;
  total_pages: number;
  last_read_at: string;
}

// Simple API helper using known Supabase URL and key
const SUPABASE_URL = "https://oopmlreysjzuxzylyheb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcG1scmV5c2p6dXh6eWx5aGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNzg5NTUsImV4cCI6MjA2NDY1NDk1NX0.tDq4HaTAy9p80e4upXFHIA90gUxZSHTH5mnqfpxh7eg";

const apiCall = async (endpoint: string, options?: RequestInit) => {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  
  return fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
};

export const useMus240Journals = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [comments, setComments] = useState<Record<string, JournalComment[]>>({});
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Remove problematic real-time subscriptions that could cause UI issues
  // Real-time updates are handled manually through refreshes instead

  // Add a sync function for manual refresh
  const syncJournalData = useCallback(async (assignmentId?: string) => {
    if (assignmentId) {
      // Refresh specific assignment data
      try {
        const response = await apiCall(`mus240_journal_entries?assignment_id=eq.${assignmentId}&is_published=eq.true&order=created_at.desc`);
        if (!response.ok) throw new Error('Failed to fetch published journals');
        
        const journals = await response.json();
        
        // Get author names
        if (journals.length > 0) {
          const studentIds = [...new Set(journals.map((j: any) => j.student_id))];
          const { data: profiles } = await supabase
            .from('gw_profiles')
            .select('user_id, full_name')
            .in('user_id', studentIds as string[]);

          const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

          const enriched = journals.map((journal: any) => ({
            ...journal,
            author_name: profileMap.get(journal.student_id) || 'Anonymous'
          }));
          setEntries(enriched);
        }
      } catch (error) {
        console.error('Error syncing journal data:', error);
      }
    }
  }, []);

  const fetchUserEntry = useCallback(async (assignmentId: string): Promise<JournalEntry | null> => {
    if (!user) return null;
    
    try {
      const response = await apiCall(`mus240_journal_entries?assignment_id=eq.${assignmentId}&student_id=eq.${user.id}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch user entry:', response.status, errorText);
        throw new Error(`Failed to fetch user entry: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching user entry:', error);
      return null;
    }
  }, [user]);

  const fetchPublishedJournals = useCallback(async (assignmentId: string): Promise<JournalEntry[]> => {
    try {
      const response = await apiCall(`mus240_journal_entries?assignment_id=eq.${assignmentId}&is_published=eq.true&order=created_at.desc`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch published journals:', response.status, errorText);
        throw new Error(`Failed to fetch published journals: ${response.statusText}`);
      }
      
      const journals = await response.json();
      
      // Get author names
      if (journals.length === 0) return [];
      
      const studentIds = [...new Set(journals.map((j: any) => j.student_id))];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds as string[]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return journals.map((journal: any) => ({
        ...journal,
        author_name: profileMap.get(journal.student_id) || 'Anonymous'
      }));
    } catch (error) {
      console.error('Error fetching published journals:', error);
      return [];
    }
  }, []);

  const fetchJournalComments = async (journalId: string): Promise<JournalComment[]> => {
    try {
      const response = await apiCall(`mus240_journal_comments?journal_id=eq.${journalId}&order=created_at.asc`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      
      const comments = await response.json();
      
      // Get commenter names
      if (comments.length === 0) return [];
      
      const commenterIds = [...new Set(comments.map((c: any) => c.commenter_id))];
      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', commenterIds as string[]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return comments.map((comment: any) => ({
        ...comment,
        author_name: profileMap.get(comment.commenter_id) || 'Anonymous'
      }));
    } catch (error) {
      console.error('Error fetching journal comments:', error);
      return [];
    }
  };

  const addJournalComment = async (journalId: string, content: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment on journals.",
        variant: "destructive"
      });
      return false;
    }


    try {
      const response = await apiCall('mus240_journal_comments', {
        method: 'POST',
        headers: {
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          journal_id: journalId,
          commenter_id: user.id,
          content: content.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to add comment');

      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });

      return true;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error Adding Comment",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      });
      return false;
    }
  };

  const saveJournal = async (assignmentId: string, content: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save journal entries.",
        variant: "destructive"
      });
      return false;
    }

    setLoading(true);
    try {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

      // Check if entry exists
      const { data: existing, error: checkError } = await supabase
        .from('mus240_journal_entries')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing entry:', checkError);
        toast({
          title: "Database Error",
          description: `Failed to check existing entry: ${checkError.message}. Please contact your instructor.`,
          variant: "destructive"
        });
        throw new Error(checkError.message);
      }

      if (existing) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('mus240_journal_entries')
          .update({
            content,
            word_count: wordCount,
            updated_at: new Date().toISOString()
          })
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id);

        if (updateError) {
          console.error('Error updating journal:', updateError);
          toast({
            title: "Save Failed",
            description: `Could not update journal: ${updateError.message}. Please try again or contact your instructor.`,
            variant: "destructive"
          });
          throw new Error(updateError.message);
        }
      } else {
        // Create new entry
        const { error: insertError } = await supabase
          .from('mus240_journal_entries')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            content,
            word_count: wordCount,
            is_published: false
          });

        if (insertError) {
          console.error('Error inserting journal:', insertError);
          toast({
            title: "Save Failed",
            description: `Could not create journal entry: ${insertError.message}. Please try again or contact your instructor.`,
            variant: "destructive"
          });
          throw new Error(insertError.message);
        }
      }

      toast({
        title: "Journal Saved",
        description: "Your journal entry has been saved as a draft.",
      });

      return true;
    } catch (error: any) {
      console.error('Error saving journal:', error);
      // Don't show toast again if we already showed a specific error
      if (!error.message?.includes('journal')) {
        toast({
          title: "Error Saving Journal",
          description: error.message || "An unexpected error occurred. Please try again.",
          variant: "destructive"
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const publishJournal = async (assignmentId: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mus240_journal_entries')
        .update({
          is_published: true,
          submitted_at: new Date().toISOString()
        })
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id);

      if (error) throw error;

      toast({
        title: "Journal Published",
        description: "Your journal is now available for peer review.",
      });

      return true;
    } catch (error: any) {
      console.error('Error publishing journal:', error);
      toast({
        title: "Error Publishing Journal",
        description: error.message || "Failed to publish journal",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteJournal = async (assignmentId: string): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    try {
      // Find the user's journal entry for this assignment
      const { data: entry, error: entryError } = await supabase
        .from('mus240_journal_entries')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (entryError) throw entryError;
      if (!entry) return true; // nothing to delete

      // Check if comments exist for this journal
      const { data: existingComments, error: commentsError } = await supabase
        .from('mus240_journal_comments')
        .select('id', { count: 'exact', head: true })
        .eq('journal_id', entry.id);

      if (commentsError) throw commentsError;
      if ((existingComments as any) === null) {
        // head: true returns null data; use count via response headers (handled internally by supabase-js)
      }

      // If count is returned in meta, supabase-js v2 doesn't expose it easily here.
      // Safer approach: fetch minimal list and check length.
      const { data: commentsList, error: listErr } = await supabase
        .from('mus240_journal_comments')
        .select('id')
        .eq('journal_id', entry.id)
        .limit(1);
      if (listErr) throw listErr;
      if (commentsList && commentsList.length > 0) {
        throw new Error('Cannot delete journal with existing comments');
      }

      // Delete the journal entry
      const { error: deleteError } = await supabase
        .from('mus240_journal_entries')
        .delete()
        .eq('id', entry.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Journal Deleted",
        description: "Your journal entry has been deleted.",
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting journal:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    entries,
    comments,
    readingProgress,
    loading,
    fetchUserEntry,
    fetchPublishedJournals,
    fetchJournalComments,
    addJournalComment,
    saveJournal,
    publishJournal,
    deleteJournal,
    syncJournalData
  };
};
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface JournalEntry {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  word_count: number;
  is_published: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface JournalComment {
  id: string;
  journal_id: string;
  commenter_id: string;
  content: string;
  created_at: string;
  commenter_name?: string;
}

interface ReadingProgress {
  assignment_id: string;
  journals_read: number;
  required_reads: number;
  completed_at: string | null;
}

export const useMus240Journals = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [comments, setComments] = useState<Record<string, JournalComment[]>>({});
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [loading, setLoading] = useState(false);

  const fetchUserEntry = useCallback(async (assignmentId: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user entry:', error);
      return null;
    }
  }, [user]);

  const fetchPublishedEntries = useCallback(async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_entries')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profile data separately to avoid relation issues
      const entriesWithProfiles = await Promise.all((data || []).map(async (entry) => {
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('full_name')
          .eq('user_id', entry.student_id)
          .single();
        
        return {
          ...entry,
          student_name: profile?.full_name || 'Anonymous'
        };
      }));
      
      return entriesWithProfiles;
    } catch (error) {
      console.error('Error fetching published entries:', error);
      return [];
    }
  }, []);

  const fetchComments = useCallback(async (journalId: string) => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_comments')
        .select('*')
        .eq('journal_id', journalId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Fetch profile data separately to avoid relation issues
      const commentsWithNames = await Promise.all((data || []).map(async (comment) => {
        const { data: profile } = await supabase
          .from('gw_profiles')
          .select('full_name')
          .eq('user_id', comment.commenter_id)
          .single();
        
        return {
          ...comment,
          commenter_name: profile?.full_name || 'Anonymous'
        };
      }));

      setComments(prev => ({
        ...prev,
        [journalId]: commentsWithNames
      }));

      return commentsWithNames;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }, []);

  const fetchReadingProgress = useCallback(async (assignmentId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('mus240_reading_requirements')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setReadingProgress(prev => ({
          ...prev,
          [assignmentId]: data
        }));
      }
    } catch (error) {
      console.error('Error fetching reading progress:', error);
    }
  }, [user]);

  const saveJournal = useCallback(async (assignmentId: string, content: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save journals.",
        variant: "destructive"
      });
      return null;
    }

    if (content.trim().length < 250) {
      toast({
        title: "Content Too Short",
        description: "Journal entries must be at least 250 words.",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    try {
      const wordCount = content.trim().split(/\s+/).length;
      const existingEntry = await fetchUserEntry(assignmentId);

      if (existingEntry) {
        const { data, error } = await supabase
          .from('mus240_journal_entries')
          .update({
            content,
            word_count: wordCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id)
          .select()
          .single();

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Journal entry updated successfully."
        });
        
        return data;
      } else {
        const { data, error } = await supabase
          .from('mus240_journal_entries')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            content,
            word_count: wordCount
          })
          .select()
          .single();

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Journal entry saved successfully."
        });
        
        return data;
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      toast({
        title: "Error",
        description: "Failed to save journal entry.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast, fetchUserEntry]);

  const publishJournal = useCallback(async (assignmentId: string) => {
    if (!user) return false;

    setLoading(true);
    try {
      const entry = await fetchUserEntry(assignmentId);
      if (!entry) {
        toast({
          title: "Error",
          description: "No journal entry found to publish.",
          variant: "destructive"
        });
        return false;
      }

      const { error } = await supabase
        .from('mus240_journal_entries')
        .update({
          is_published: true,
          submitted_at: new Date().toISOString()
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Journal entry published for peer review!"
      });
      
      return true;
    } catch (error) {
      console.error('Error publishing journal:', error);
      toast({
        title: "Error",
        description: "Failed to publish journal entry.",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast, fetchUserEntry]);

  const addComment = useCallback(async (journalId: string, content: string) => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mus240_journal_comments')
        .insert({
          journal_id: journalId,
          commenter_id: user.id,
          content
        })
        .select('*')
        .single();

      if (error) throw error;

      // Get the user's profile name
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const commentWithName = {
        ...data,
        commenter_name: profile?.full_name || 'Anonymous'
      };

      setComments(prev => ({
        ...prev,
        [journalId]: [...(prev[journalId] || []), commentWithName]
      }));

      toast({
        title: "Success",
        description: "Comment added successfully!"
      });

      return commentWithName;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const markAsRead = useCallback(async (journalId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('mus240_journal_reads')
        .insert({
          journal_id: journalId,
          reader_id: user.id
        });

      if (error && !error.message.includes('duplicate key')) {
        throw error;
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  // Delete journal entry (only if no comments exist)
  const deleteJournal = useCallback(async (assignmentId: string) => {
    if (!user) return false;

    try {
      // First check if there are any comments
      const { data: existingComments, error: commentsError } = await supabase
        .from('mus240_journal_comments')
        .select('id')
        .eq('journal_id', assignmentId);

      if (commentsError) throw commentsError;

      if (existingComments && existingComments.length > 0) {
        throw new Error('Cannot delete journal with existing comments');
      }

      // Delete the journal entry
      const { error } = await supabase
        .from('mus240_journal_entries')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting journal:', error);
      throw error;
    }
  }, [user]);

  return {
    entries,
    comments,
    readingProgress,
    loading,
    fetchUserEntry,
    fetchPublishedEntries,
    fetchComments,
    fetchReadingProgress,
    saveJournal,
    publishJournal,
    addComment,
    markAsRead,
    deleteJournal
  };
};
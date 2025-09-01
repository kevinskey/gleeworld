
import { useState } from 'react';
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
  published_at?: string;
}

export interface JournalComment {
  id: string;
  journal_id: string;
  user_id: string;
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

export const useMus240Journals = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [comments, setComments] = useState<Record<string, JournalComment[]>>({});
  const [readingProgress, setReadingProgress] = useState<Record<string, ReadingProgress>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchUserEntry = async (assignmentId: string): Promise<JournalEntry | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('mus240_journals')
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
  };

  const fetchPublishedJournals = async (assignmentId: string): Promise<JournalEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('mus240_journals')
        .select(`
          *,
          gw_profiles!student_id (
            full_name
          )
        `)
        .eq('assignment_id', assignmentId)
        .eq('is_published', true)
        .order('published_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(journal => ({
        ...journal,
        author_name: journal.gw_profiles?.full_name || 'Anonymous'
      }));
    } catch (error) {
      console.error('Error fetching published journals:', error);
      return [];
    }
  };

  const fetchJournalComments = async (journalId: string): Promise<JournalComment[]> => {
    try {
      const { data, error } = await supabase
        .from('mus240_journal_comments')
        .select(`
          *,
          gw_profiles!user_id (
            full_name
          )
        `)
        .eq('journal_id', journalId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(comment => ({
        ...comment,
        author_name: comment.gw_profiles?.full_name || 'Anonymous'
      }));
    } catch (error) {
      console.error('Error fetching journal comments:', error);
      return [];
    }
  };

  const addJournalComment = async (journalId: string, content: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('mus240_journal_comments')
        .insert({
          journal_id: journalId,
          user_id: user.id,
          content: content.trim()
        });

      if (error) throw error;

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
    if (!user) return false;

    try {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

      const { error } = await supabase
        .from('mus240_journals')
        .upsert({
          assignment_id: assignmentId,
          student_id: user.id,
          content,
          word_count: wordCount,
          is_published: false
        }, {
          onConflict: 'assignment_id,student_id'
        });

      if (error) throw error;

      toast({
        title: "Journal Saved",
        description: "Your journal entry has been saved as a draft.",
      });

      return true;
    } catch (error: any) {
      console.error('Error saving journal:', error);
      toast({
        title: "Error Saving Journal",
        description: error.message || "Failed to save journal",
        variant: "destructive"
      });
      return false;
    }
  };

  const publishJournal = async (assignmentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('mus240_journals')
        .update({
          is_published: true,
          published_at: new Date().toISOString()
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
    }
  };

  const deleteJournal = async (assignmentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if journal has comments
      const { data: comments, error: commentsError } = await supabase
        .from('mus240_journal_comments')
        .select('id')
        .eq('journal_id', assignmentId);

      if (commentsError) throw commentsError;

      if (comments && comments.length > 0) {
        throw new Error('Cannot delete journal with existing comments');
      }

      const { error } = await supabase
        .from('mus240_journals')
        .delete()
        .eq('assignment_id', assignmentId)
        .eq('student_id', user.id);

      if (error) throw error;

      toast({
        title: "Journal Deleted",
        description: "Your journal entry has been deleted.",
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting journal:', error);
      throw error;
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
    deleteJournal
  };
};

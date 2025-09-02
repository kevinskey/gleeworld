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

  const fetchUserEntry = async (assignmentId: string): Promise<JournalEntry | null> => {
    if (!user) return null;
    
    try {
      const response = await apiCall(`mus240_journal_entries?assignment_id=eq.${assignmentId}&student_id=eq.${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch user entry');
      
      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching user entry:', error);
      return null;
    }
  };

  const fetchPublishedJournals = async (assignmentId: string): Promise<JournalEntry[]> => {
    try {
      const response = await apiCall(`mus240_journal_entries?assignment_id=eq.${assignmentId}&is_published=eq.true&order=published_at.desc`);
      if (!response.ok) throw new Error('Failed to fetch published journals');
      
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
  };

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
    if (!user) return false;

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
    if (!user) return false;

    try {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

      const response = await apiCall('mus240_journal_entries', {
        method: 'POST',
        headers: {
          'Prefer': 'return=minimal,resolution=merge-duplicates'
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          student_id: user.id,
          content,
          word_count: wordCount,
          is_published: false
        })
      });

      if (!response.ok) throw new Error('Failed to save journal');

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
      const response = await apiCall(`mus240_journal_entries?assignment_id=eq.${assignmentId}&student_id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          is_published: true,
          published_at: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to publish journal');

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
      // Check if journal has comments first
      const commentsResponse = await apiCall(`mus240_journal_comments?journal_entry_id=eq.${assignmentId}&select=id`);

      if (commentsResponse.ok) {
        const comments = await commentsResponse.json();
        if (comments && comments.length > 0) {
          throw new Error('Cannot delete journal with existing comments');
        }
      }

      const response = await apiCall(`mus240_journal_entries?assignment_id=eq.${assignmentId}&student_id=eq.${user.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete journal');

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
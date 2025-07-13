import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";

type UserScore = Database['public']['Tables']['gw_scores']['Row'];
type UserScoreInsert = Database['public']['Tables']['gw_scores']['Insert'];

interface ScoreFilters {
  sheet_music_id?: string;
  date_range?: {
    start: string;
    end: string;
  };
}

export const useUserScores = () => {
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchScores = async (filters?: ScoreFilters) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('gw_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters?.sheet_music_id) {
        query = query.eq('sheet_music_id', filters.sheet_music_id);
      }

      if (filters?.date_range) {
        query = query
          .gte('performance_date', filters.date_range.start)
          .lte('performance_date', filters.date_range.end);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setScores(data || []);
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scores');
    } finally {
      setLoading(false);
    }
  };

  const addScore = async (scoreData: Omit<UserScoreInsert, 'user_id' | 'created_at'>) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error: insertError } = await supabase
        .from('gw_scores')
        .insert({
          ...scoreData,
          user_id: user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setScores(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding score:', err);
      setError(err instanceof Error ? err.message : 'Failed to add score');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateScore = async (id: string, updates: Partial<UserScoreInsert>) => {
    try {
      setLoading(true);
      const { data, error: updateError } = await supabase
        .from('gw_scores')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setScores(prev => 
        prev.map(score => score.id === id ? data : score)
      );
      return data;
    } catch (err) {
      console.error('Error updating score:', err);
      setError(err instanceof Error ? err.message : 'Failed to update score');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteScore = async (id: string) => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('gw_scores')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (deleteError) throw deleteError;

      setScores(prev => prev.filter(score => score.id !== id));
    } catch (err) {
      console.error('Error deleting score:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete score');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getAverageScore = (sheetMusicId?: string) => {
    const filteredScores = sheetMusicId 
      ? scores.filter(score => score.sheet_music_id === sheetMusicId)
      : scores;

    if (filteredScores.length === 0) return 0;

    const sum = filteredScores.reduce((acc, score) => acc + score.score_value, 0);
    return sum / filteredScores.length;
  };

  const getBestScore = (sheetMusicId?: string) => {
    const filteredScores = sheetMusicId 
      ? scores.filter(score => score.sheet_music_id === sheetMusicId)
      : scores;

    if (filteredScores.length === 0) return 0;

    return Math.max(...filteredScores.map(score => score.score_value));
  };

  const getScoreProgress = (sheetMusicId: string, days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentScores = scores
      .filter(score => 
        score.sheet_music_id === sheetMusicId && 
        score.created_at && 
        new Date(score.created_at) >= cutoffDate
      )
      .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());

    return recentScores;
  };

  useEffect(() => {
    if (user?.id) {
      fetchScores();
    }
  }, [user?.id]);

  return {
    scores,
    loading,
    error,
    fetchScores,
    addScore,
    updateScore,
    deleteScore,
    getAverageScore,
    getBestScore,
    getScoreProgress,
  };
};
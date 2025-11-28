import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Test Builder hooks for managing Glee Academy tests

export interface GleeAcademyTest {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  duration_minutes: number | null;
  total_points: number;
  passing_score: number;
  is_published: boolean;
  is_practice: boolean;
  allow_retakes: boolean;
  show_correct_answers: boolean;
  randomize_questions: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'audio_listening' | 'video_watching' | 'file_upload';
  question_text: string;
  points: number;
  display_order: number;
  required: boolean;
  media_type: 'audio' | 'video' | 'image' | 'pdf' | 'youtube' | 'slide' | null;
  media_url: string | null;
  media_title: string | null;
  youtube_video_id: string | null;
  start_time: number | null;
  end_time: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnswerOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  display_order: number;
  created_at: string;
}

// Fetch tests for a course
export const useTests = (courseId: string) => {
  return useQuery({
    queryKey: ['tests', courseId],
    queryFn: async () => {
      let query = supabase
        .from('glee_academy_tests')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Only filter by course_id if it's not 'all'
      if (courseId !== 'all') {
        query = query.eq('course_id', courseId);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      return data as GleeAcademyTest[];
    },
  });
};

// Fetch single test with questions and options
export const useTest = (testId: string) => {
  return useQuery({
    queryKey: ['test', testId],
    queryFn: async () => {
      const { data: test, error: testError } = await supabase
        .from('glee_academy_tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;

      const { data: questions, error: questionsError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', testId)
        .order('display_order');

      if (questionsError) throw questionsError;

      const questionIds = questions.map(q => q.id);
      const { data: options, error: optionsError } = await supabase
        .from('test_answer_options')
        .select('*')
        .in('question_id', questionIds)
        .order('display_order');

      if (optionsError) throw optionsError;

      return {
        test: test as GleeAcademyTest,
        questions: questions as TestQuestion[],
        options: options as AnswerOption[],
      };
    },
    enabled: !!testId,
  });
};

// Create test
export const useCreateTest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<GleeAcademyTest>) => {
      const { data: test, error } = await supabase
        .from('glee_academy_tests')
        .insert([data] as any)
        .select()
        .single();

      if (error) throw error;
      return test;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tests', data.course_id] });
      toast({
        title: 'Test Created',
        description: 'Your test has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create test: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Update test
export const useUpdateTest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<GleeAcademyTest> & { id: string }) => {
      const { data: test, error } = await supabase
        .from('glee_academy_tests')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return test;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test', data.id] });
      queryClient.invalidateQueries({ queryKey: ['tests', data.course_id] });
      toast({
        title: 'Test Updated',
        description: 'Your test has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update test: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Delete test
export const useDeleteTest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('glee_academy_tests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, courseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tests', data.courseId] });
      toast({
        title: 'Test Deleted',
        description: 'The test has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete test: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Create question
export const useCreateQuestion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<TestQuestion>) => {
      const { data: question, error} = await supabase
        .from('test_questions')
        .insert([data] as any)
        .select()
        .single();

      if (error) throw error;
      return question;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test', data.test_id] });
      toast({
        title: 'Question Added',
        description: 'Question has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add question: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Update question
export const useUpdateQuestion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testId, ...data }: Partial<TestQuestion> & { id: string; testId: string }) => {
      const { data: question, error } = await supabase
        .from('test_questions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { question, testId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test', data.testId] });
      toast({
        title: 'Question Updated',
        description: 'Question has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update question: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Delete question
export const useDeleteQuestion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testId }: { id: string; testId: string }) => {
      const { error } = await supabase
        .from('test_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return testId;
    },
    onSuccess: (testId) => {
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
      toast({
        title: 'Question Deleted',
        description: 'Question has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete question: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Duplicate question
export const useDuplicateQuestion = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, testId }: { questionId: string; testId: string }) => {
      // Fetch the original question
      const { data: originalQuestion, error: questionError } = await supabase
        .from('test_questions')
        .select('*')
        .eq('id', questionId)
        .single();

      if (questionError) throw questionError;

      // Fetch answer options for the original question
      const { data: originalOptions, error: optionsError } = await supabase
        .from('test_answer_options')
        .select('*')
        .eq('question_id', questionId)
        .order('display_order');

      if (optionsError) throw optionsError;

      // Get the max display_order for questions in this test
      const { data: questions, error: questionsError } = await supabase
        .from('test_questions')
        .select('display_order')
        .eq('test_id', testId)
        .order('display_order', { ascending: false })
        .limit(1);

      if (questionsError) throw questionsError;

      const newDisplayOrder = questions.length > 0 ? questions[0].display_order + 1 : 1;

      // Create the duplicate question
      const { id, created_at, updated_at, ...questionData } = originalQuestion as TestQuestion;
      const { data: newQuestion, error: insertError } = await supabase
        .from('test_questions')
        .insert([{
          ...questionData,
          display_order: newDisplayOrder,
        }] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // Duplicate answer options if they exist
      if (originalOptions && originalOptions.length > 0) {
        const newOptions = originalOptions.map(({ id, created_at, question_id, ...optionData }) => ({
          ...optionData,
          question_id: newQuestion.id,
        }));

        const { error: optionsInsertError } = await supabase
          .from('test_answer_options')
          .insert(newOptions as any);

        if (optionsInsertError) throw optionsInsertError;
      }

      return testId;
    },
    onSuccess: (testId) => {
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
      toast({
        title: 'Question Duplicated',
        description: 'Question has been duplicated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to duplicate question: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Batch create answer options
export const useCreateAnswerOptions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ options, testId }: { options: Partial<AnswerOption>[]; testId: string }) => {
      const { data, error } = await supabase
        .from('test_answer_options')
        .insert(options as any)
        .select();

      if (error) throw error;
      return { data, testId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['test', result.testId] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to save answer options: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

// Update answer option
export const useUpdateAnswerOption = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testId, ...data }: Partial<AnswerOption> & { id: string; testId: string }) => {
      const { data: option, error } = await supabase
        .from('test_answer_options')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { option, testId };
    },
    onSuccess: ({ testId }) => {
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update answer option',
        variant: 'destructive',
      });
    },
  });
};

// Delete single answer option
export const useDeleteAnswerOption = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, testId }: { id: string; testId: string }) => {
      const { error } = await supabase
        .from('test_answer_options')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return testId;
    },
    onSuccess: (testId) => {
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete answer option',
        variant: 'destructive',
      });
    },
  });
};

// Delete answer options for a question
export const useDeleteAnswerOptions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, testId }: { questionId: string; testId: string }) => {
      const { error } = await supabase
        .from('test_answer_options')
        .delete()
        .eq('question_id', questionId);

      if (error) throw error;
      return testId;
    },
    onSuccess: (testId) => {
      queryClient.invalidateQueries({ queryKey: ['test', testId] });
    },
  });
};
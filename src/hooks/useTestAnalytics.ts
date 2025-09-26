import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsEvent {
  event_type: 'question_start' | 'question_submit' | 'section_complete' | 'edit' | 'pause' | 'resume';
  section_name?: 'terms' | 'short_answers' | 'excerpts' | 'essay';
  question_id?: string;
  time_spent_seconds?: number;
  content_length?: number;
  edit_count?: number;
  keystroke_patterns?: any;
  ai_indicators?: any;
}

interface SessionMetrics {
  totalActiveTime: number;
  totalPauseTime: number;
  sectionOrder: string[];
  averageTypingSpeed: number;
  revisionFrequency: number;
  responsePatterns: any;
}

export const useTestAnalytics = (submissionId: string | null, studentId: string | null) => {
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>({
    totalActiveTime: 0,
    totalPauseTime: 0,
    sectionOrder: [],
    averageTypingSpeed: 0,
    revisionFrequency: 0,
    responsePatterns: {}
  });

  const [isTracking, setIsTracking] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [editCounts, setEditCounts] = useState<Record<string, number>>({});
  const [typingData, setTypingData] = useState<Record<string, any>>({});
  
  // Refs for timing
  const sessionStartTime = useRef<number>(Date.now());
  const lastActiveTime = useRef<number>(Date.now());
  const keystrokeBuffer = useRef<Array<{ timestamp: number; key: string; length: number }>>([]);
  const pauseStartTime = useRef<number | null>(null);

  // Initialize tracking
  useEffect(() => {
    if (submissionId && studentId) {
      setIsTracking(true);
      sessionStartTime.current = Date.now();
      
      // Set up browser info collection
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenWidth: screen.width,
        screenHeight: screen.height,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
      };
      
      // Store browser info in session metrics
      setSessionMetrics(prev => ({
        ...prev,
        responsePatterns: { ...prev.responsePatterns, browserInfo }
      }));
    }
  }, [submissionId, studentId]);

  // Track section changes
  const trackSectionStart = async (sectionName: string) => {
    if (!submissionId || !studentId || !isTracking) return;

    const now = Date.now();
    setCurrentSection(sectionName);
    setQuestionStartTime(now);
    
    // Update section order
    setSessionMetrics(prev => ({
      ...prev,
      sectionOrder: [...prev.sectionOrder.filter(s => s !== sectionName), sectionName]
    }));

    // Record analytics event
    await recordAnalyticsEvent({
      event_type: 'question_start',
      section_name: sectionName as any,
      question_id: sectionName
    });
  };

  // Track question completion
  const trackQuestionSubmit = async (
    sectionName: string, 
    questionId: string, 
    content: string,
    editCount: number = 0
  ) => {
    if (!submissionId || !studentId || !isTracking || !questionStartTime) return;

    const now = Date.now();
    const timeSpent = Math.round((now - questionStartTime) / 1000);
    
    // Calculate typing metrics
    const wordCount = content.trim().split(/\s+/).length;
    const typingSpeed = timeSpent > 0 ? (wordCount / (timeSpent / 60)) : 0;
    
    // Detect potential AI indicators
    const aiIndicators = analyzeForAIPatterns(content, timeSpent, editCount, typingSpeed);
    
    // Record analytics event
    await recordAnalyticsEvent({
      event_type: 'question_submit',
      section_name: sectionName as any,
      question_id: questionId,
      time_spent_seconds: timeSpent,
      content_length: content.length,
      edit_count: editCount,
      keystroke_patterns: getKeystrokePatterns(questionId),
      ai_indicators: aiIndicators
    });

    // Update session metrics
    setSessionMetrics(prev => ({
      ...prev,
      averageTypingSpeed: (prev.averageTypingSpeed + typingSpeed) / 2,
      revisionFrequency: (prev.revisionFrequency + editCount) / 2
    }));
  };

  // Track edits
  const trackEdit = async (sectionName: string, questionId: string, content: string) => {
    if (!submissionId || !studentId || !isTracking) return;
    
    const currentCount = editCounts[questionId] || 0;
    const newCount = currentCount + 1;
    
    setEditCounts(prev => ({
      ...prev,
      [questionId]: newCount
    }));

    await recordAnalyticsEvent({
      event_type: 'edit',
      section_name: sectionName as any,
      question_id: questionId,
      edit_count: newCount,
      content_length: content.length
    });
  };

  // Track keystroke patterns
  const trackKeystroke = (questionId: string, key: string, contentLength: number) => {
    if (!isTracking) return;
    
    const now = Date.now();
    keystrokeBuffer.current.push({
      timestamp: now,
      key: key,
      length: contentLength
    });

    // Keep only last 100 keystrokes per question
    if (keystrokeBuffer.current.length > 100) {
      keystrokeBuffer.current = keystrokeBuffer.current.slice(-100);
    }
  };

  // Track pauses and resumes
  const trackPause = async () => {
    if (!isTracking || pauseStartTime.current) return;
    
    pauseStartTime.current = Date.now();
    await recordAnalyticsEvent({
      event_type: 'pause'
    });
  };

  const trackResume = async () => {
    if (!isTracking || !pauseStartTime.current) return;
    
    const pauseDuration = Math.round((Date.now() - pauseStartTime.current) / 1000);
    setSessionMetrics(prev => ({
      ...prev,
      totalPauseTime: prev.totalPauseTime + pauseDuration
    }));
    
    pauseStartTime.current = null;
    await recordAnalyticsEvent({
      event_type: 'resume'
    });
  };

  // Complete session analytics
  const completeSession = async () => {
    if (!submissionId || !studentId || !isTracking) return;
    
    const now = Date.now();
    const totalSessionTime = Math.round((now - sessionStartTime.current) / 1000);
    const activeTime = totalSessionTime - sessionMetrics.totalPauseTime;
    
    // Calculate final metrics
    const aiLikelihoodScore = await calculateAILikelihood();
    const struggleAreas = identifyStruggleAreas();
    const strengthAreas = identifyStrengthAreas();
    
    // Save session analytics
    const { error } = await supabase
      .from('mus240_session_analytics')
      .upsert({
        submission_id: submissionId,
        student_id: studentId,
        total_active_time_seconds: activeTime,
        total_pause_time_seconds: sessionMetrics.totalPauseTime,
        section_completion_order: sessionMetrics.sectionOrder,
        average_typing_speed: sessionMetrics.averageTypingSpeed,
        consistency_score: calculateConsistencyScore(),
        ai_likelihood_score: aiLikelihoodScore,
        struggle_areas: struggleAreas,
        strength_areas: strengthAreas,
        revision_frequency: sessionMetrics.revisionFrequency,
        response_patterns: sessionMetrics.responsePatterns,
        browser_info: sessionMetrics.responsePatterns.browserInfo
      });
    
    if (error) {
      console.error('Error saving session analytics:', error);
    }
    
    setIsTracking(false);
  };

  // Helper functions
  const recordAnalyticsEvent = async (event: AnalyticsEvent) => {
    if (!submissionId || !studentId) return;
    
    try {
      const { error } = await supabase
        .from('mus240_test_analytics')
        .insert({
          submission_id: submissionId,
          student_id: studentId,
          ...event
        });
      
      if (error) {
        console.error('Error recording analytics event:', error);
      }
    } catch (err) {
      console.error('Analytics recording failed:', err);
    }
  };

  const analyzeForAIPatterns = (content: string, timeSpent: number, editCount: number, typingSpeed: number) => {
    const indicators: any = {};
    
    // Fast completion
    const wordsPerMinute = content.trim().split(/\s+/).length / (timeSpent / 60);
    if (wordsPerMinute > 100) {
      indicators.rapid_completion = true;
    }
    
    // No corrections
    if (editCount === 0 && content.length > 100) {
      indicators.no_corrections = true;
    }
    
    // Perfect grammar patterns (simplified)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
    if (avgSentenceLength > 20) {
      indicators.complex_sentences = true;
    }
    
    // Uniform pacing
    if (typingSpeed > 80 && editCount < 2) {
      indicators.uniform_pacing = true;
    }
    
    return indicators;
  };

  const getKeystrokePatterns = (questionId: string) => {
    const patterns = keystrokeBuffer.current;
    if (patterns.length < 2) return {};
    
    // Calculate typing rhythm
    const intervals = [];
    for (let i = 1; i < patterns.length; i++) {
      intervals.push(patterns[i].timestamp - patterns[i-1].timestamp);
    }
    
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    return {
      averageKeystrokeInterval: avgInterval,
      keystrokeVariance: intervalVariance,
      totalKeystrokes: patterns.length,
      typingRhythm: intervalVariance < 100 ? 'consistent' : 'variable'
    };
  };

  const calculateAILikelihood = async (): Promise<number> => {
    if (!submissionId) return 0;
    
    try {
      const { data, error } = await supabase
        .rpc('calculate_ai_likelihood_score', { p_submission_id: submissionId });
      
      if (error) {
        console.error('Error calculating AI likelihood:', error);
        return 0;
      }
      
      return data || 0;
    } catch (err) {
      console.error('AI likelihood calculation failed:', err);
      return 0;
    }
  };

  const identifyStruggleAreas = (): string[] => {
    // Identify areas where student spent excessive time
    const strugglingAreas: string[] = [];
    
    // Add logic based on timing data
    sessionMetrics.sectionOrder.forEach(section => {
      // This would be enhanced with actual timing data
      if (sessionMetrics.totalActiveTime > 3000) { // > 50 minutes
        strugglingAreas.push(section);
      }
    });
    
    return strugglingAreas;
  };

  const identifyStrengthAreas = (): string[] => {
    // Identify areas completed quickly and accurately
    const strengthAreas: string[] = [];
    
    // Add logic based on speed and accuracy
    sessionMetrics.sectionOrder.forEach(section => {
      if (sessionMetrics.averageTypingSpeed > 50 && sessionMetrics.revisionFrequency < 2) {
        strengthAreas.push(section);
      }
    });
    
    return strengthAreas;
  };

  const calculateConsistencyScore = (): number => {
    // Calculate how consistent the student's performance is
    const variance = sessionMetrics.revisionFrequency * 10; // Simplified calculation
    return Math.max(0, 100 - variance);
  };

  return {
    trackSectionStart,
    trackQuestionSubmit,
    trackEdit,
    trackKeystroke,
    trackPause,
    trackResume,
    completeSession,
    sessionMetrics,
    isTracking
  };
};

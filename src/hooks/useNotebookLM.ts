import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotebookDocument {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'pdf' | 'audio' | 'web';
  uploadedAt: string;
}

export interface StudyGuide {
  summary: string;
  keyPoints: string[];
  studyQuestions: string[];
  conceptMap: Record<string, string[]>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const useNotebookLM = () => {
  const [documents, setDocuments] = useState<NotebookDocument[]>([]);
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const addDocument = async (file: File, title?: string) => {
    setIsLoading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('notebook-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      let content = '';
      if (file.type === 'text/plain') {
        content = await file.text();
      } else if (file.type === 'application/pdf') {
        // For PDFs, we'll extract text using the edge function
        const formData = new FormData();
        formData.append('file', file);
        
        const { data: extractData, error: extractError } = await supabase.functions
          .invoke('extract-pdf-text', { body: formData });
        
        if (extractError) throw extractError;
        content = extractData.text;
      }

      const newDoc: NotebookDocument = {
        id: uploadData.path,
        title: title || file.name,
        content,
        type: file.type.includes('pdf') ? 'pdf' : 'text',
        uploadedAt: new Date().toISOString()
      };

      setDocuments(prev => [...prev, newDoc]);
      
      toast({
        title: "Document Added",
        description: `${newDoc.title} has been added to your notebook`,
      });

      return newDoc;
    } catch (error) {
      console.error('Error adding document:', error);
      toast({
        title: "Error",
        description: "Failed to add document to notebook",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateStudyGuide = async () => {
    if (documents.length === 0) {
      toast({
        title: "No Documents",
        description: "Add some documents first to generate a study guide",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const combinedContent = documents.map(doc => 
        `Document: ${doc.title}\n${doc.content}`
      ).join('\n\n---\n\n');

      const { data, error } = await supabase.functions.invoke('generate-study-guide', {
        body: { 
          content: combinedContent,
          context: 'MUS240 - Music Theory and Analysis Course'
        }
      });

      if (error) throw error;

      setStudyGuide(data.studyGuide);
      
      toast({
        title: "Study Guide Generated",
        description: "Your personalized study guide is ready!",
      });
    } catch (error) {
      console.error('Error generating study guide:', error);
      toast({
        title: "Error",
        description: "Failed to generate study guide",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const askQuestion = async (question: string) => {
    if (!question.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const context = documents.map(doc => 
        `${doc.title}: ${doc.content.slice(0, 2000)}...`
      ).join('\n\n');

      const { data, error } = await supabase.functions.invoke('notebook-chat', {
        body: { 
          question,
          context,
          chatHistory: chatHistory.slice(-5), // Last 5 messages for context
          courseContext: 'MUS240 - Music Theory and Analysis'
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      };

      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI assistant",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast({
      title: "Document Removed",
      description: "Document has been removed from your notebook",
    });
  };

  const clearChat = () => {
    setChatHistory([]);
  };

  return {
    documents,
    studyGuide,
    chatHistory,
    isLoading,
    isAnalyzing,
    addDocument,
    generateStudyGuide,
    askQuestion,
    removeDocument,
    clearChat
  };
};
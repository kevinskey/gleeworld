import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TextPollCreatorProps {
  onPollCreated?: () => void;
}

interface ParsedQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

interface ParsedPoll {
  title: string;
  questions: ParsedQuestion[];
}

export const TextPollCreator: React.FC<TextPollCreatorProps> = ({ onPollCreated }) => {
  const [pollText, setPollText] = useState('');
  const [parsedPoll, setParsedPoll] = useState<ParsedPoll | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const sampleText = `Title: Origins of the African American Negro Spiritual

Questions:

1. Where did Negro Spirituals primarily develop?
A. Africa
B. The American South during slavery ✅
C. The Caribbean
D. Northern U.S. churches

2. Which cultural tradition most directly influenced the musical structure of Spirituals?
A. European hymnody
B. African rhythmic and call-response practices ✅
C. Native American chants
D. Classical opera`;

  const parsePollText = (text: string): ParsedPoll | null => {
    try {
      setParseError(null);
      
      // Extract title
      const titleMatch = text.match(/Title:\s*(.+)/i);
      if (!titleMatch) {
        throw new Error('No title found. Please start with "Title: Your Poll Title"');
      }
      
      const title = titleMatch[1].trim();
      
      // Split into sections and find questions section
      const questionsStart = text.toLowerCase().indexOf('questions:');
      if (questionsStart === -1) {
        throw new Error('No "Questions:" section found');
      }
      
      const questionsText = text.substring(questionsStart);
      
      // Parse individual questions
      const questionMatches = [...questionsText.matchAll(/(\d+)\.\s*(.+?)(?=\n\d+\.|$)/gs)];
      
      if (questionMatches.length === 0) {
        throw new Error('No numbered questions found');
      }
      
      const questions: ParsedQuestion[] = [];
      
      for (const match of questionMatches) {
        const questionText = match[2].trim();
        
        // Extract the question part (before options)
        const lines = questionText.split('\n').filter(line => line.trim());
        const questionLine = lines[0];
        
        // Extract options
        const options: string[] = [];
        let correctAnswer = -1;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          const optionMatch = line.match(/^([A-D])\.\s*(.+)/);
          
          if (optionMatch) {
            const optionText = optionMatch[2];
            // Check if this option has the checkmark
            const isCorrect = optionText.includes('✅');
            const cleanOption = optionText.replace('✅', '').trim();
            
            options.push(cleanOption);
            
            if (isCorrect) {
              correctAnswer = options.length - 1;
            }
          }
        }
        
        if (options.length !== 4) {
          throw new Error(`Question ${questions.length + 1} must have exactly 4 options (A, B, C, D)`);
        }
        
        if (correctAnswer === -1) {
          throw new Error(`Question ${questions.length + 1} must have one option marked with ✅`);
        }
        
        questions.push({
          question: questionLine,
          options,
          correct_answer: correctAnswer
        });
      }
      
      if (questions.length === 0) {
        throw new Error('No valid questions found');
      }
      
      return { title, questions };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
      setParseError(errorMessage);
      return null;
    }
  };

  const handleParsePoll = () => {
    if (!pollText.trim()) {
      toast.error('Please enter poll text to parse');
      return;
    }
    
    const parsed = parsePollText(pollText);
    if (parsed) {
      setParsedPoll(parsed);
      toast.success(`Successfully parsed ${parsed.questions.length} questions!`);
    }
  };

  const handleCreatePoll = async () => {
    if (!parsedPoll) return;
    
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('mus240_polls')
        .insert({
          title: parsedPoll.title,
          description: `Auto-generated poll with ${parsedPoll.questions.length} questions`,
          questions: parsedPoll.questions as any, // Cast to any for JSON compatibility
          is_active: false,
          is_live_session: false,
          show_results: false,
          current_question_index: 0
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Poll created successfully!');
      setPollText('');
      setParsedPoll(null);
      setParseError(null);
      
      // Call the callback to refresh the polls list
      if (onPollCreated) {
        onPollCreated();
      }
      
    } catch (error) {
      console.error('Error creating poll:', error);
      toast.error('Failed to create poll');
    } finally {
      setIsCreating(false);
    }
  };

  const fillSampleText = () => {
    setPollText(sampleText);
  };

  return (
    <div className="space-y-6">
      {/* Text Input Section */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Create Poll from Text</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-700">
                Paste your poll text below
              </label>
              <Button
                onClick={fillSampleText}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Use Sample Text
              </Button>
            </div>
            <Textarea
              placeholder={`Format:
Title: Your Poll Title

Questions:

1. Question text?
A. Option A
B. Option B ✅
C. Option C
D. Option D

2. Next question?
A. Option A ✅
B. Option B
C. Option C
D. Option D`}
              value={pollText}
              onChange={(e) => setPollText(e.target.value)}
              rows={12}
              className="border-blue-200 focus:border-blue-400 rounded-xl font-mono text-sm"
            />
          </div>
          
          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900">Parsing Error</p>
                <p className="text-red-700 text-sm">{parseError}</p>
              </div>
            </div>
          )}
          
          <Button
            onClick={handleParsePoll}
            disabled={!pollText.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 transition-all duration-300"
          >
            <Upload className="h-4 w-4 mr-2" />
            Parse Poll Text
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      {parsedPoll && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl text-gray-900">Poll Preview</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white/80 rounded-xl p-6 border border-green-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{parsedPoll.title}</h3>
              <Badge className="bg-green-600 text-white">
                {parsedPoll.questions.length} Questions Parsed
              </Badge>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {parsedPoll.questions.map((question, index) => (
                <div key={index} className="bg-white/80 rounded-xl p-4 border border-green-200">
                  <p className="font-medium text-gray-900 mb-3">
                    {index + 1}. {question.question}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {question.options.map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          optionIndex === question.correct_answer
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        {option}
                        {optionIndex === question.correct_answer && (
                          <span className="ml-2 text-green-600 font-bold">✓ Correct</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <Button
              onClick={handleCreatePoll}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all duration-300"
            >
              {isCreating ? 'Creating Poll...' : 'Create Poll'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Upload, 
  Brain, 
  MessageCircle, 
  BookOpen, 
  Trash2, 
  Loader2,
  Download,
  Lightbulb,
  Network
} from 'lucide-react';
import { useNotebookLM } from '@/hooks/useNotebookLM';
import { cn } from '@/lib/utils';

export const NotebookLM = () => {
  const {
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
  } = useNotebookLM();

  const [currentQuestion, setCurrentQuestion] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      await addDocument(selectedFiles[i]);
    }
    setSelectedFiles(null);
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim()) return;
    
    await askQuestion(currentQuestion);
    setCurrentQuestion('');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold flex items-center justify-center gap-3">
          <Brain className="h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10" />
          NotebookLM for MUS 240
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          AI-powered study companion for Music Theory & Analysis
        </p>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="study-guide" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Study Guide</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">AI Chat</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Course Materials
              </CardTitle>
              <CardDescription>
                Add PDFs, text files, or other course materials to build your knowledge base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select Files</Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handleFileUpload}
                disabled={!selectedFiles || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Document Library</CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 ? 's' : ''} in your notebook
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded yet</p>
                  <p className="text-sm">Upload some course materials to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {doc.type} • {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="study-guide" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                AI-Generated Study Guide
              </CardTitle>
              <CardDescription>
                Comprehensive study materials based on your uploaded documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={generateStudyGuide}
                disabled={documents.length === 0 || isAnalyzing}
                className="w-full mb-6"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing Documents...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate Study Guide
                  </>
                )}
              </Button>

              {studyGuide && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Summary</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {studyGuide.summary}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Key Points</h3>
                    <ul className="space-y-2">
                      {studyGuide.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 mt-1 text-yellow-500 shrink-0" />
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Study Questions</h3>
                    <div className="space-y-2">
                      {studyGuide.studyQuestions.map((question, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium">
                            {index + 1}. {question}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Concept Relationships</h3>
                    <div className="grid gap-3">
                      {Object.entries(studyGuide.conceptMap).map(([concept, related]) => (
                        <div key={concept} className="p-3 border rounded-lg">
                          <p className="font-medium mb-2">{concept}</p>
                          <div className="flex flex-wrap gap-2">
                            {related.map((item, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-6">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                AI Study Assistant
              </CardTitle>
              <CardDescription>
                Ask questions about your course materials and get AI-powered answers
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <ScrollArea className="flex-1 pr-4">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start a conversation with your AI study assistant</p>
                    <p className="text-sm">Ask about concepts, get explanations, or request clarifications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "p-3 rounded-lg max-w-[80%]",
                          message.role === 'user'
                            ? "ml-auto bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <form onSubmit={handleQuestionSubmit} className="flex gap-2">
                <Textarea
                  value={currentQuestion}
                  onChange={(e) => setCurrentQuestion(e.target.value)}
                  placeholder="Ask a question about your course materials..."
                  className="flex-1 min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleQuestionSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!currentQuestion.trim() || isLoading}
                  className="shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </form>

              {chatHistory.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  className="self-start"
                >
                  Clear Chat
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Learning Insights
              </CardTitle>
              <CardDescription>
                Track your progress and discover connections in your learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Study Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Documents Analyzed</span>
                      <Badge variant="outline">{documents.length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Questions Asked</span>
                      <Badge variant="outline">{chatHistory.filter(m => m.role === 'user').length}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Study Guide Generated</span>
                      <Badge variant="outline">{studyGuide ? 'Yes' : 'No'}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Download className="h-4 w-4 mr-2" />
                      Export Study Guide
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Save Chat History
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
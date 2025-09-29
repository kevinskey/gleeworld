import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  Brain, 
  Mic,
  Download,
  RefreshCw,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AIMusicCardProps {
  className?: string;
}

export const AIMusicCard: React.FC<AIMusicCardProps> = ({ className }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedMusic, setGeneratedMusic] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('generate');

  const musicStyles = [
    'Blues', 'Gospel', 'Jazz', 'Spirituals', 'R&B', 'Soul', 'Hip-Hop', 'Funk'
  ];

  const samplePrompts = [
    "Create a soulful blues progression in the style of Robert Johnson",
    "Generate a Gospel choir harmony with call and response",
    "Compose a Jazz melody with bebop influences",
    "Create a Spiritual with traditional African polyrhythms"
  ];

  const handleGenerateMusic = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your AI music generation.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Simulate AI music generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demo purposes, we'll simulate a generated audio URL
      setGeneratedMusic('demo-generated-music.mp3');
      
      toast({
        title: "Music Generated!",
        description: "Your AI-generated music is ready to play.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "There was an error generating your music. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!generatedMusic) return;
    setIsPlaying(!isPlaying);
    
    if (!isPlaying) {
      toast({
        title: "Playing Generated Music",
        description: "Enjoy your AI-created African American music composition!",
      });
    }
  };

  const useSamplePrompt = (samplePrompt: string) => {
    setPrompt(samplePrompt);
  };

  return (
    <Card className={`bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 border-purple-400/30 shadow-2xl ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-white text-xl font-bold flex items-center gap-2">
              AI Music Studio
              <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
            </CardTitle>
            <p className="text-white/80 text-sm">Generate African American music with AI</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
            <Music className="h-3 w-3 mr-1" />
            Cultural Music
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10">
            <TabsTrigger value="generate" className="text-white data-[state=active]:bg-white/20">
              Generate
            </TabsTrigger>
            <TabsTrigger value="analyze" className="text-white data-[state=active]:bg-white/20">
              Analyze
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-3">
              <label className="text-white font-medium text-sm">Describe your music:</label>
              <Textarea
                placeholder="e.g., Create a blues song with guitar and harmonica in the Delta blues style..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-white font-medium text-sm">Quick prompts:</label>
              <div className="grid grid-cols-1 gap-2">
                {samplePrompts.map((samplePrompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => useSamplePrompt(samplePrompt)}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-left justify-start h-auto py-2 px-3"
                  >
                    <span className="text-xs truncate">{samplePrompt}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-white font-medium text-sm">Styles:</label>
              <div className="flex flex-wrap gap-2">
                {musicStyles.map((style, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-white/10 text-white border-white/30 hover:bg-white/20 cursor-pointer"
                    onClick={() => setPrompt(prev => prev + ` in ${style} style`)}
                  >
                    {style}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerateMusic}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Music...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Music
                </>
              )}
            </Button>

            {generatedMusic && (
              <div className="bg-white/10 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Generated Music</span>
                  <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
                    Ready
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    onClick={handlePlayPause}
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-300 ${
                        isPlaying ? 'animate-pulse' : ''
                      }`}
                      style={{ width: isPlaying ? '60%' : '0%' }}
                    />
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analyze" className="space-y-4">
            <div className="space-y-3">
              <label className="text-white font-medium text-sm">Upload audio for AI analysis:</label>
              <div className="border-2 border-dashed border-white/30 rounded-lg p-6 text-center">
                <Mic className="h-8 w-8 text-white/60 mx-auto mb-2" />
                <p className="text-white/80 text-sm mb-2">Drop your audio file here</p>
                <p className="text-white/60 text-xs">AI will analyze musical elements, style, and cultural context</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 mt-3"
                >
                  Choose File
                </Button>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2">AI Analysis Features:</h4>
              <ul className="text-white/80 text-sm space-y-1">
                <li>• Style identification and classification</li>
                <li>• Cultural and historical context</li>
                <li>• Musical element breakdown</li>
                <li>• Performance technique analysis</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
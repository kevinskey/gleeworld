import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Download, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TemplateData {
  templateType: string;
  eventDetails: {
    eventName: string;
    eventDate: string;
    venue: string;
  };
  bandInfo: {
    name: string;
    genre: string;
    members: string;
  };
}

const PressKitTemplateGenerator = () => {
  const [formData, setFormData] = useState<TemplateData>({
    templateType: 'biography',
    eventDetails: {
      eventName: '',
      eventDate: '',
      venue: ''
    },
    bandInfo: {
      name: 'Spelman College Glee Club',
      genre: 'Classical, Gospel, Contemporary',
      members: '60+ talented vocalists'
    }
  });
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const templateTypes = [
    { value: 'biography', label: 'Artist Biography' },
    { value: 'fact_sheet', label: 'Fact Sheet' },
    { value: 'press_release', label: 'Press Release' },
    { value: 'social_media', label: 'Social Media Content' },
    { value: 'interview_questions', label: 'Interview Questions' }
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-press-kit-content', {
        body: formData
      });

      if (error) throw error;

      setGeneratedContent(data.content);
      toast({
        title: "Content Generated!",
        description: "Your press kit content has been generated successfully.",
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const selectedTemplate = templateTypes.find(t => t.value === formData.templateType);
    const filename = `${selectedTemplate?.label.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Content saved to your device.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Press Kit Generator
          </CardTitle>
          <CardDescription>
            Generate professional press kit content using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="templateType">Template Type</Label>
              <Select
                value={formData.templateType}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  templateType: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateTypes.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bandName">Group Name</Label>
              <Input
                id="bandName"
                value={formData.bandInfo.name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  bandInfo: { ...prev.bandInfo, name: e.target.value }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre/Style</Label>
              <Input
                id="genre"
                value={formData.bandInfo.genre}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  bandInfo: { ...prev.bandInfo, genre: e.target.value }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="members">Members</Label>
              <Input
                id="members"
                value={formData.bandInfo.members}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  bandInfo: { ...prev.bandInfo, members: e.target.value }
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name (optional)</Label>
              <Input
                id="eventName"
                value={formData.eventDetails.eventName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  eventDetails: { ...prev.eventDetails, eventName: e.target.value }
                }))}
                placeholder="Concert, performance, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue (optional)</Label>
              <Input
                id="venue"
                value={formData.eventDetails.venue}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  eventDetails: { ...prev.eventDetails, venue: e.target.value }
                }))}
                placeholder="Performance location"
              />
            </div>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Generated Content
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              className="min-h-[300px] resize-y"
              placeholder="Generated content will appear here..."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PressKitTemplateGenerator;
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MessageTemplate } from '@/types/communication';
import { FileText, Wand2 } from 'lucide-react';

interface MessageComposerProps {
  title: string;
  content: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  templates: MessageTemplate[];
  onTemplateSelect: (templateId: string) => void;
}

export const MessageComposer = ({
  title,
  content,
  onTitleChange,
  onContentChange,
  templates,
  onTemplateSelect
}: MessageComposerProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'start_fresh') {
      setSelectedTemplate('');
      onTemplateSelect('');
      return;
    }
    setSelectedTemplate(templateId);
    onTemplateSelect(templateId);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Compose Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Start with Template</label>
            <Button
              variant="ghost" 
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {/* Future: AI compose */}}
            >
              <Wand2 className="h-3 w-3 mr-1" />
              AI Compose
            </Button>
          </div>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a template or start fresh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start_fresh">Start Fresh</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{template.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {template.category}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Line */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Subject Line</label>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter a clear, descriptive subject..."
            className="text-base"
          />
        </div>

        {/* Message Content */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Message Content</label>
          <Textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Write your message here... Keep it clear and actionable."
            rows={8}
            className="text-base resize-none"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{content.length} characters</span>
            <span>
              {content.length > 160 && content.length <= 480 ? "Good length for SMS" : 
               content.length > 480 ? "Consider shortening for SMS" : 
               content.length > 0 ? "Short message" : ""}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
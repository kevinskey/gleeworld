import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Save, X, Eye, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HandbookEditorProps {
  content: string;
  sectionTitle: string;
  onSave: (newContent: string, summary: string) => Promise<boolean>;
  onCancel: () => void;
  saving: boolean;
}

export const HandbookEditor: React.FC<HandbookEditorProps> = ({
  content,
  sectionTitle,
  onSave,
  onCancel,
  saving
}) => {
  const [editedContent, setEditedContent] = useState(content);
  const [editSummary, setEditSummary] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const hasChanges = editedContent !== content;

  const handleSave = async () => {
    if (!hasChanges) return;
    const success = await onSave(editedContent, editSummary);
    if (success) {
      onCancel();
    }
  };

  // Simple preview renderer
  const renderPreview = (text: string) => {
    const blocks = text.split(/\n\n+/);
    return blocks.map((block, i) => {
      const trimmed = block.trim();
      if (!trimmed) return null;
      
      if (trimmed.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{trimmed.slice(4)}</h3>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{trimmed.slice(3)}</h2>;
      }
      if (trimmed.startsWith('# ')) {
        return <h1 key={i} className="text-2xl font-bold mt-4 mb-4">{trimmed.slice(2)}</h1>;
      }
      
      if (trimmed.startsWith('- ') || trimmed.includes('\n- ')) {
        const items = trimmed.split('\n').filter(line => line.trim().startsWith('- '));
        return (
          <ul key={i} className="list-disc pl-6 space-y-1 my-2">
            {items.map((item, j) => <li key={j} className="text-muted-foreground">{item.slice(2).trim()}</li>)}
          </ul>
        );
      }
      
      const formatted = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="text-muted-foreground my-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Editor Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Edit2 className="h-4 w-4 text-primary" />
          <span className="font-medium">Editing: {sectionTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {previewMode ? (
          <div className="flex-1 overflow-auto p-6 max-w-3xl">
            {renderPreview(editedContent)}
          </div>
        ) : (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="flex-1 resize-none rounded-none border-0 focus-visible:ring-0 font-mono text-sm"
            placeholder="Enter content using markdown..."
          />
        )}
      </div>

      {/* Edit Summary */}
      <div className="p-4 border-t bg-muted/30">
        <Label htmlFor="edit-summary" className="text-sm font-medium mb-2 block">
          Edit Summary (optional)
        </Label>
        <Input
          id="edit-summary"
          value={editSummary}
          onChange={(e) => setEditSummary(e.target.value)}
          placeholder="Briefly describe your changes..."
          className="max-w-md"
        />
        {hasChanges && (
          <p className="text-xs text-muted-foreground mt-2">
            You have unsaved changes
          </p>
        )}
      </div>
    </div>
  );
};

export default HandbookEditor;

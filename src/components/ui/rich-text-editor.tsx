import React, { useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your message...',
  className = '',
  minHeight = '200px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync external value changes to editor
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      exec('createLink', url);
    }
  }, [exec]);

  const ToolbarButton = ({ 
    onClick, 
    icon: Icon, 
    title 
  }: { 
    onClick: () => void; 
    icon: React.ElementType; 
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className={`border rounded-lg overflow-hidden bg-background ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-muted/30">
        <ToolbarButton onClick={() => exec('undo')} icon={Undo} title="Undo" />
        <ToolbarButton onClick={() => exec('redo')} icon={Redo} title="Redo" />
        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarButton onClick={() => exec('bold')} icon={Bold} title="Bold" />
        <ToolbarButton onClick={() => exec('italic')} icon={Italic} title="Italic" />
        <ToolbarButton onClick={() => exec('underline')} icon={Underline} title="Underline" />
        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} icon={List} title="Bullet List" />
        <ToolbarButton onClick={() => exec('insertOrderedList')} icon={ListOrdered} title="Numbered List" />
        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarButton onClick={() => exec('justifyLeft')} icon={AlignLeft} title="Align Left" />
        <ToolbarButton onClick={() => exec('justifyCenter')} icon={AlignCenter} title="Align Center" />
        <ToolbarButton onClick={() => exec('justifyRight')} icon={AlignRight} title="Align Right" />
        <div className="w-px h-6 bg-border mx-1" />
        <ToolbarButton onClick={insertLink} icon={LinkIcon} title="Insert Link" />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline
        aria-label="Rich text editor"
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        data-placeholder={placeholder}
        className="p-3 focus:outline-none prose prose-sm max-w-none dark:prose-invert"
        style={{ 
          minHeight,
          position: 'relative',
        }}
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          position: absolute;
        }
      `}</style>
    </div>
  );
};

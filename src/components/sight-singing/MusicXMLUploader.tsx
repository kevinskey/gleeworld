import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, FileMusic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MusicXMLUploaderProps {
  onUpload: (musicXML: string, filename: string) => void;
}

export const MusicXMLUploader: React.FC<MusicXMLUploaderProps> = ({ onUpload }) => {
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Check file type
    if (!file.name.toLowerCase().endsWith('.xml') && !file.name.toLowerCase().endsWith('.musicxml')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a MusicXML file (.xml or .musicxml)",
        variant: "destructive",
      });
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Basic validation - check if it contains MusicXML structure
        if (!content.includes('<score-partwise') && !content.includes('<score-timewise')) {
          toast({
            title: "Invalid MusicXML",
            description: "The file doesn't appear to be a valid MusicXML file.",
            variant: "destructive",
          });
          return;
        }

        onUpload(content, file.name);
      }
    };
    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "Failed to read the uploaded file.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  }, [onUpload, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/xml': ['.xml', '.musicxml'],
      'application/xml': ['.xml', '.musicxml']
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024, // 5MB limit
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-green-400 bg-green-50 dark:bg-green-950/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/20'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <FileMusic className="h-8 w-8 text-gray-400" />
          {isDragActive ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              Drop your MusicXML file here
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Drag & drop a MusicXML file here, or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Supports .xml and .musicxml files up to 5MB
              </p>
            </>
          )}
        </div>
      </div>
      
      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            input?.click();
          }}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Browse Files
        </Button>
      </div>
    </div>
  );
};
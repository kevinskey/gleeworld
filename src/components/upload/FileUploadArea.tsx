
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";

interface FileUploadAreaProps {
  uploadedFile: File | null;
  onFileUpload: (file: File | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dragOver: boolean;
  showArea: boolean;
}

export const FileUploadArea = ({
  uploadedFile,
  onFileUpload,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOver,
  showArea
}: FileUploadAreaProps) => {
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  // Window-wide drag and drop support
  useEffect(() => {
    let dragCounter = 0;

    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        onDragOver(e as any);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        onDragLeave(e as any);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      onDrop(e as any);
    };

    if (showArea) {
      window.addEventListener('dragenter', handleWindowDragEnter);
      window.addEventListener('dragleave', handleWindowDragLeave);
      window.addEventListener('dragover', handleWindowDragOver);
      window.addEventListener('drop', handleWindowDrop);
    }

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [showArea, onDragOver, onDragLeave, onDrop]);

  if (!showArea) return null;

  return (
    <div
      className={`glass-upload-zone border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        dragOver ? 'border-primary bg-secondary/10' : 'border-border hover:border-primary/50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {uploadedFile ? (
        <div className="space-y-4">
          <FileText className="h-16 w-16 text-secondary mx-auto" />
          <div>
            <p className="text-lg font-medium text-foreground">{uploadedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => onFileUpload(null)}
            className="mt-2"
          >
            <X className="h-4 w-4 mr-2" />
            Remove File
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Upload className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <p className="text-lg font-medium text-foreground">
              Drop your document here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supports all file types • Drag anywhere on the window
            </p>
          </div>
            <input
              type="file"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
          <Button asChild className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              Choose File
            </label>
          </Button>
        </div>
      )}
    </div>
  );
};


import { useCallback } from "react";
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

  if (!showArea) return null;

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {uploadedFile ? (
        <div className="space-y-4">
          <FileText className="h-16 w-16 text-green-600 mx-auto" />
          <div>
            <p className="text-lg font-medium text-gray-900">{uploadedFile.name}</p>
            <p className="text-sm text-gray-500">
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
          <Upload className="h-16 w-16 text-gray-400 mx-auto" />
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop your document here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF and Word documents (max 10MB)
            </p>
          </div>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
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

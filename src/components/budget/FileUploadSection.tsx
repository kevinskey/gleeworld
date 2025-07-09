import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, File, ExternalLink } from "lucide-react";
import { useState } from "react";

interface FileUploadSectionProps {
  attachments: any[];
  onUpload: (file: File) => void;
  eventId: string;
}

export const FileUploadSection = ({ attachments, onUpload, eventId }: FileUploadSectionProps) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Attachments
        </CardTitle>
        <CardDescription>Upload menus, quotes, receipts, or other supporting documents</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop files here, or click to select
          </p>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              Select Files
            </label>
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: PDF, JPG, PNG, DOCX
          </p>
        </div>

        {attachments.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Uploaded Files</h4>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{attachment.filename}</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
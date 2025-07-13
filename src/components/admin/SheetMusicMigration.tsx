import React, { useState } from 'react';
import { SheetMusicUpload } from "@/components/sheet-music/SheetMusicUpload";
import { SheetMusicBulkUpload } from "@/components/admin/SheetMusicBulkUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileStack } from "lucide-react";

export const SheetMusicMigration: React.FC = () => {
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('bulk');

  return (
    <div className="space-y-6">
      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Sheet Music Management</CardTitle>
          <CardDescription>
            Upload and manage your sheet music PDFs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <Button
              variant={uploadMode === 'bulk' ? 'default' : 'outline'}
              onClick={() => setUploadMode('bulk')}
              className="flex items-center space-x-2"
            >
              <FileStack className="h-4 w-4" />
              <span>Bulk Upload</span>
            </Button>
            <Button
              variant={uploadMode === 'single' ? 'default' : 'outline'}
              onClick={() => setUploadMode('single')}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Single Upload</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Component */}
      {uploadMode === 'bulk' ? (
        <SheetMusicBulkUpload />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Single File Upload</CardTitle>
            <CardDescription>
              Upload one sheet music PDF file with detailed metadata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SheetMusicUpload 
              onBack={() => {}} 
              onUploadComplete={() => {
                // Refresh the page or navigate somewhere
                window.location.reload();
              }} 
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
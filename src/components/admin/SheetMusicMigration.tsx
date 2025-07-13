import React from 'react';
import { SheetMusicUpload } from "@/components/sheet-music/SheetMusicUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const SheetMusicMigration: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sheet Music Management</CardTitle>
          <CardDescription>
            Upload and manage your sheet music PDFs manually
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
    </div>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Upload, FileAudio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const SightReadingUploader = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResults(null); // Clear previous results
      setError(null);
    }
  };

  const referenceMelody = [
    { "note": "C4", "time": 0.0 },
    { "note": "D4", "time": 0.5 },
    { "note": "E4", "time": 1.0 },
    { "note": "F4", "time": 1.5 },
    { "note": "G4", "time": 2.0 }
  ];

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('Uploading file:', selectedFile.name, selectedFile.type, selectedFile.size);
      
      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('reference', JSON.stringify(referenceMelody));

      // Use Supabase Edge Function instead of direct call to droplet
      const { data, error } = await supabase.functions.invoke('analyze-audio', {
        body: formData,
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge Function Error: ${error.message}`);
      }

      // Check if the response contains an error from the droplet server
      if (data && data.error) {
        console.error('Droplet server error:', data);
        throw new Error(`${data.error}: ${data.serverResponse || data.statusText || 'Unknown server error'}`);
      }

      setResults(data);
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Upload failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            Sight Reading Audio Submission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="audio-file" className="text-sm font-medium">
              Select Audio File (.wav or .mp3)
            </label>
            <Input
              id="audio-file"
              type="file"
              accept=".wav,.mp3,audio/wav,audio/mpeg"
              onChange={handleFileChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
              <FileAudio className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" text="Analyzing..." />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Submit for Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-destructive text-sm">
              <strong>Error:</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md text-sm overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
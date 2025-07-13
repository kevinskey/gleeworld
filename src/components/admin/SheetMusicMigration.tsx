import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MigrationResult {
  id: string;
  title: string;
  status: 'success' | 'pdf_not_found' | 'upload_failed' | 'db_update_failed' | 'error';
  error?: string;
  pdf_url?: string;
}

interface MigrationStatus {
  total_records: number;
  migrated_records: number;
  pending_records: number;
  migration_progress: number;
}

export const SheetMusicMigration: React.FC = () => {
  const [readerApiUrl, setReaderApiUrl] = useState('https://reader.gleeworld.org/api');
  const [readerApiKey, setReaderApiKey] = useState('');
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    console.log('SheetMusicMigration: Checking migration status...');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-sheet-music', {
        body: { action: 'check_status' }
      });

      console.log('SheetMusicMigration: Edge function response:', { data, error });
      
      if (error) {
        console.error('SheetMusicMigration: Edge function error:', error);
        throw new Error(`Edge function error: ${error.message || JSON.stringify(error)}`);
      }
      
      if (!data) {
        throw new Error('No data received from edge function');
      }
      
      setMigrationStatus(data);
      console.log('SheetMusicMigration: Status set:', data);
      toast.success('Migration status checked successfully');
    } catch (error) {
      console.error('SheetMusicMigration: Failed to check migration status:', error);
      toast.error(`Failed to check migration status: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const startMigration = async () => {
    if (!readerApiUrl) {
      toast.error('Please provide the reader.gleeworld.org API URL');
      return;
    }

    setIsMigrating(true);
    setMigrationResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-sheet-music', {
        body: {
          action: 'migrate_pdfs',
          reader_api_url: readerApiUrl,
          reader_api_key: readerApiKey || undefined
        }
      });

      if (error) throw error;

      setMigrationResults(data.results || []);
      toast.success(`Migration completed: ${data.summary.successful} successful, ${data.summary.failed} failed`);
      
      // Refresh status
      await checkMigrationStatus();
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  const copyFromBucket = async () => {
    setIsMigrating(true);
    setMigrationResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-sheet-music', {
        body: {
          action: 'copy_from_bucket'
        }
      });

      if (error) throw error;

      setMigrationResults(data.results || []);
      toast.success(`Copy completed: ${data.summary.successful} successful, ${data.summary.failed} failed`);
      
      // Refresh status
      await checkMigrationStatus();
    } catch (error) {
      console.error('Copy from bucket failed:', error);
      toast.error('Copy from bucket failed');
    } finally {
      setIsMigrating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'pdf_not_found':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />PDF Not Found</Badge>;
      case 'upload_failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Upload Failed</Badge>;
      case 'db_update_failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />DB Update Failed</Badge>;
      default:
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sheet Music PDF Migration</CardTitle>
          <CardDescription>
            Migrate PDF files from reader.gleeworld.org to the new Supabase storage bucket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Migration Status */}
          {migrationStatus && (
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Migration Progress</span>
                    <span>{migrationStatus.migration_progress}%</span>
                  </div>
                  <Progress value={migrationStatus.migration_progress} className="h-2" />
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>Total: {migrationStatus.total_records}</div>
                    <div>Migrated: {migrationStatus.migrated_records}</div>
                    <div>Pending: {migrationStatus.pending_records}</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reader-api-url">Reader.GleeWorld.org API URL</Label>
              <Input
                id="reader-api-url"
                value={readerApiUrl}
                onChange={(e) => setReaderApiUrl(e.target.value)}
                placeholder="https://reader.gleeworld.org/api"
              />
            </div>
            <div>
              <Label htmlFor="reader-api-key">API Key (Optional)</Label>
              <Input
                id="reader-api-key"
                type="password"
                value={readerApiKey}
                onChange={(e) => setReaderApiKey(e.target.value)}
                placeholder="Enter API key if required"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 flex-wrap">
            <Button 
              onClick={startMigration} 
              disabled={isMigrating || !readerApiUrl}
              className="flex items-center gap-2"
            >
              {isMigrating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isMigrating ? 'Migrating...' : 'Start Migration'}
            </Button>
            <Button 
              onClick={copyFromBucket} 
              disabled={isMigrating}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isMigrating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isMigrating ? 'Copying...' : 'Copy from Bucket'}
            </Button>
            <Button 
              variant="outline" 
              onClick={checkMigrationStatus}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration Results */}
      {migrationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Migration Results</CardTitle>
            <CardDescription>
              Results from the latest migration batch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {migrationResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{result.title}</h4>
                    <p className="text-sm text-gray-600">ID: {result.id}</p>
                    {result.error && (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(result.status)}
                    {result.pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={result.pdf_url} target="_blank" rel="noopener noreferrer">
                          View PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
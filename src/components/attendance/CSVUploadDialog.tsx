import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Event {
  id: string;
  title: string;
  start_date: string;
}

interface CSVUploadDialogProps {
  events: Event[];
  onUploadComplete?: () => void;
}

export const CSVUploadDialog = ({ events, onUploadComplete }: CSVUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedEventId) {
      toast({
        title: 'Missing Information',
        description: 'Please select an event and upload a CSV file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Read the file as text
      const csvData = await file.text();

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('upload-attendance-csv', {
        body: {
          csvData,
          eventId: selectedEventId,
        },
      });

      if (error) throw error;

      if (data.errors && data.errors.length > 0) {
        toast({
          title: 'Partial Success',
          description: `${data.recordsInserted} records uploaded. ${data.errors.length} errors occurred.`,
        });
      } else {
        toast({
          title: 'Success',
          description: data.message,
        });
      }

      setOpen(false);
      setFile(null);
      setSelectedEventId('');
      onUploadComplete?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload attendance records',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'email,attendance_status,notes,check_in_time\n' +
                    'user@example.com,present,On time,2024-01-01T10:00:00Z\n' +
                    'user2@example.com,absent,,\n' +
                    'user3@example.com,late,Arrived 10 minutes late,2024-01-01T10:10:00Z';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Attendance Records</DialogTitle>
          <DialogDescription>
            Upload attendance records via CSV file. Make sure your CSV follows the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>CSV Format Requirements:</strong>
              <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>Must include: <code>email</code> (or <code>user_id</code>) and <code>attendance_status</code></li>
                <li>Valid statuses: present, absent, excused, late, left_early</li>
                <li>Optional columns: <code>notes</code>, <code>check_in_time</code></li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="w-full gap-2"
          >
            <Download className="h-4 w-4" />
            Download CSV Template
          </Button>

          <div className="space-y-2">
            <Label htmlFor="event">Select Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger id="event">
                <SelectValue placeholder="Choose an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} - {new Date(event.start_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {file && <FileSpreadsheet className="h-5 w-5 text-green-600" />}
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || !selectedEventId || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Attendance'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

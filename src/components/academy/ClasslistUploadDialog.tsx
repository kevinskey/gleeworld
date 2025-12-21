import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, Download, AlertCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Course {
  id: string;
  title: string;
  course_code?: string;
  term?: string;
}

interface ClasslistUploadDialogProps {
  courses: Course[];
  selectedCourseId?: string;
  onUploadComplete?: () => void;
}

export const ClasslistUploadDialog = ({ 
  courses, 
  selectedCourseId,
  onUploadComplete 
}: ClasslistUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(selectedCourseId || '');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [crn, setCrn] = useState('');
  const [term, setTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (validTypes.includes(selectedFile.type) || 
          selectedFile.name.endsWith('.csv') || 
          selectedFile.name.endsWith('.xls') || 
          selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
        
        // Try to extract info from filename
        const match = selectedFile.name.match(/(\d{6})_(\d+)_classlist/);
        if (match) {
          setTerm(match[1]);
          setCrn(match[2]);
        }
      } else {
        toast({
          title: 'Invalid File',
          description: 'Please select a CSV or Excel file',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !courseId) {
      toast({
        title: 'Missing Information',
        description: 'Please select a course and upload a file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      const csvData = await file.text();

      const { data, error } = await supabase.functions.invoke('upload-classlist-csv', {
        body: {
          csvData,
          courseId,
          courseInfo: {
            crn: crn || null,
            term: term || null,
            startDate: startDate || null,
            endDate: endDate || null
          }
        },
      });

      if (error) throw error;

      if (data.errors && data.errors.length > 0) {
        toast({
          title: 'Import Completed with Warnings',
          description: `${data.results?.enrolled || 0} enrolled, ${data.results?.updated || 0} updated. ${data.errors.length} issues.`,
        });
      } else {
        toast({
          title: 'Success',
          description: data.message,
        });
      }

      setOpen(false);
      setFile(null);
      setCrn('');
      setTerm('');
      setStartDate('');
      setEndDate('');
      onUploadComplete?.();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload classlist',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'Student Name,ID,Registration Status,Level,Credit Hours,Class\n' +
                    '"Lastname, Firstname M.",900123456,Registered,Undergraduate,4,Sophomore\n' +
                    '"Smith, Jane A.",900789012,Web Registered,Undergraduate,4,Junior';
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classlist_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="h-4 w-4" />
          Import Classlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Banner Classlist</DialogTitle>
          <DialogDescription>
            Upload a classlist exported from Banner to enroll students in a course.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Supported Format:</strong> Banner classlist export (XLS/CSV)
              <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>Student Name, ID, Registration Status, Level, Credit Hours, Class</li>
                <li>Students will be matched by Student ID or created as new profiles</li>
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
            <Label htmlFor="course">Select Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger id="course">
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.course_code ? `${course.course_code} - ` : ''}{course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crn">CRN (optional)</Label>
              <Input 
                id="crn" 
                value={crn} 
                onChange={(e) => setCrn(e.target.value)}
                placeholder="15508"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Term (optional)</Label>
              <Input 
                id="term" 
                value={term} 
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Spring 2026"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input 
                id="start-date" 
                type="date"
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input 
                id="end-date" 
                type="date"
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classlist-file">Classlist File (CSV/XLS)</Label>
            <div className="flex items-center gap-2">
              <input
                id="classlist-file"
                type="file"
                accept=".csv,.xls,.xlsx"
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
            disabled={!file || !courseId || uploading}
          >
            {uploading ? 'Importing...' : 'Import Students'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

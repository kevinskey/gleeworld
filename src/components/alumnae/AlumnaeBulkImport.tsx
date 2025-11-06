import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
export const AlumnaeBulkImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const downloadTemplate = () => {
    const csvContent = 'email,full_name,graduation_year,major,current_occupation,location,bio,is_mentor\njane.doe@example.com,Jane Doe,2015,Music,Music Director,"Atlanta, GA",Passionate about music education,true\n';
    const blob = new Blob([csvContent], {
      type: 'text/csv'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alumnae_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };
  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }
    const headers = lines[0].split(',').map(h => h.trim());
    const users = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;
      const user: any = {};
      headers.forEach((header, index) => {
        user[header] = values[index];
      });
      users.push(user);
    }
    return users;
  };
  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }
    setImporting(true);
    setResults(null);
    try {
      const text = await file.text();
      const users = parseCSV(text);
      if (users.length === 0) {
        throw new Error('No valid users found in CSV');
      }

      // Get current user for authorization
      const {
        data: {
          user: currentUser
        }
      } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      // Prepare users for import with role = 'alumna'
      const usersToImport = users.map(user => ({
        email: user.email,
        full_name: user.full_name || '',
        role: 'alumna',
        graduation_year: user.graduation_year ? parseInt(user.graduation_year) : null,
        major: user.major || null,
        current_occupation: user.current_occupation || null,
        location: user.location || null,
        bio: user.bio || null,
        is_mentor: user.is_mentor === 'true' || user.is_mentor === '1'
      }));

      // Call the import-users edge function
      const {
        data,
        error
      } = await supabase.functions.invoke('import-users', {
        body: {
          users: usersToImport
        }
      });
      if (error) throw error;
      const successful = data.results?.filter((r: any) => r.success).length || 0;
      const failed = data.results?.filter((r: any) => !r.success).length || 0;
      const errors = data.results?.filter((r: any) => !r.success).map((r: any) => `${r.email}: ${r.error}`) || [];
      setResults({
        successful,
        failed,
        errors
      });
      if (successful > 0) {
        toast.success(`Successfully imported ${successful} alumnae users`);
      }
      if (failed > 0) {
        toast.error(`Failed to import ${failed} users`);
      }
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };
  return <Card>
      
      
    </Card>;
};
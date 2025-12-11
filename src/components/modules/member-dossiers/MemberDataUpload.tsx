import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Download, CheckCircle, XCircle, Loader2, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UploadResult {
  updated: number;
  errors: string[];
  skipped: number;
  notFound: string[];
}

export function MemberDataUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const downloadTemplate = () => {
    const csvContent = `student name,ID,class
Jane Doe,S12345678,Junior
Mary Smith,S87654321,Senior`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_data_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): Array<{ name: string; student_id: string; classification: string }> => {
    const lines = text.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const nameIdx = headers.findIndex(h => h === 'student name' || h === 'name' || h === 'student_name' || h === 'full_name');
    const studentIdIdx = headers.findIndex(h => h === 'id' || h === 'student_id' || h === 'studentid');
    const classIdx = headers.findIndex(h => h === 'class' || h === 'classification' || h === 'year');

    if (nameIdx === -1) {
      throw new Error('CSV must have a "name" column');
    }

    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      return {
        name: values[nameIdx] || '',
        student_id: studentIdIdx !== -1 ? values[studentIdIdx] : '',
        classification: classIdx !== -1 ? values[classIdx] : ''
      };
    });
  };

  const classificationToYear = (classification: string): number | null => {
    const lower = classification.toLowerCase().trim();
    if (lower === 'freshman' || lower === 'first year' || lower === '1') return 1;
    if (lower === 'sophomore' || lower === 'second year' || lower === '2') return 2;
    if (lower === 'junior' || lower === 'third year' || lower === '3') return 3;
    if (lower === 'senior' || lower === 'fourth year' || lower === '4') return 4;
    if (lower === 'graduate' || lower === 'grad' || lower === '5') return 5;
    return null;
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const records = parseCSV(text);

      const uploadResult: UploadResult = { updated: 0, errors: [], skipped: 0, notFound: [] };

      for (const record of records) {
        if (!record.name) {
          uploadResult.skipped++;
          continue;
        }

        // Find user by name (try full_name match first, then fuzzy)
        const nameLower = record.name.toLowerCase().trim();
        const { data: profiles, error: findError } = await supabase
          .from('gw_profiles')
          .select('user_id, full_name, first_name, last_name')
          .or(`full_name.ilike.%${nameLower}%,first_name.ilike.%${nameLower.split(' ')[0]}%`);

        if (findError) {
          uploadResult.errors.push(`Error finding ${record.name}: ${findError.message}`);
          continue;
        }

        // Find best match
        const exactMatch = profiles?.find(p => 
          p.full_name?.toLowerCase().trim() === nameLower ||
          `${p.first_name} ${p.last_name}`.toLowerCase().trim() === nameLower
        );
        
        const profile = exactMatch || profiles?.[0];

        if (!profile) {
          uploadResult.notFound.push(record.name);
          continue;
        }

        // Build update object
        const updates: Record<string, any> = {};
        
        if (record.student_id) {
          updates.student_id = record.student_id;
        }
        
        if (record.classification) {
          const classYear = classificationToYear(record.classification);
          if (classYear) {
            updates.class_year = classYear;
            updates.academic_year = record.classification.charAt(0).toUpperCase() + record.classification.slice(1).toLowerCase();
          }
        }

        if (Object.keys(updates).length === 0) {
          uploadResult.skipped++;
          continue;
        }

        // Update profile
        const { error: updateError } = await supabase
          .from('gw_profiles')
          .update(updates)
          .eq('user_id', profile.user_id);

        if (updateError) {
          uploadResult.errors.push(`Failed to update ${record.name}: ${updateError.message}`);
        } else {
          uploadResult.updated++;
        }
      }

      setResult(uploadResult);
      
      if (uploadResult.updated > 0) {
        toast({
          title: 'Upload Complete',
          description: `Updated ${uploadResult.updated} member(s)`,
        });
      }

    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Update Member Data via CSV
        </CardTitle>
        <CardDescription>
          Upload a CSV with name, student_id, and class (Freshman/Sophomore/Junior/Senior)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
            }}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-1" />
            Template
          </Button>
        </div>

        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Update Profiles
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3 p-3 bg-muted rounded text-sm">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              {result.updated} profile(s) updated
            </div>
            {result.skipped > 0 && (
              <div className="text-muted-foreground">
                {result.skipped} row(s) skipped (no data)
              </div>
            )}
            {result.notFound.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-600">
                  <UserX className="h-4 w-4" />
                  {result.notFound.length} incomplete dossier(s) - users not found
                </div>
                <ul className="text-xs bg-amber-50 dark:bg-amber-950/30 p-2 rounded max-h-40 overflow-y-auto border border-amber-200 dark:border-amber-800">
                  {result.notFound.map((email, i) => (
                    <li key={i} className="py-0.5">{email}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  {result.errors.length} error(s)
                </div>
                <ul className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

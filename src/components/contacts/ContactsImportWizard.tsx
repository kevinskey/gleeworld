import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ImportStep = 'upload' | 'validate' | 'confirm';

interface ValidationIssue {
  row: number;
  field?: string;
  message: string;
  level: 'error' | 'warning';
}

interface ParsedContact {
  row: number;
  data: Record<string, any>;
  issues: ValidationIssue[];
}

export const ContactsImportWizard = () => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    successful: number;
    skipped: number;
    failed: number;
    validationLog: Array<{ row: number; email: string; message: string }>;
  } | null>(null);

  const CANONICAL_HEADERS = [
    'Email', 'Status', 'StatusChangeDate', 'DateUpdated', 'DateAdded', 'Source',
    'CreatedFromIP', 'TotalSent', 'TotalFailed', 'TotalOpened', 'TotalClicked',
    'LastSent', 'LastFailed', 'LastOpened', 'LastClicked', 'ErrorCode',
    'FriendlyErrorMessage', 'ConsentDate', 'ConsentIP', 'ConsentTracking',
    'FirstName', 'LastName', 'UnsubscribeReason', 'UnsubscribeReasonNotes',
    'display_name', 'last_update', 'phone', 'address', 'city', 'state', 'zip', 'class'
  ];

  const downloadTemplate = () => {
    const headers = CANONICAL_HEADERS.join(',');
    const sample = 'jane.doe@example.com,Active,2024-01-15,2024-06-01,2023-09-01,manual,192.168.1.1,100,2,45,12,2024-05-30,2024-04-15,2024-05-29,2024-05-28,,,,2023-09-01,true,Jane,Doe,,,Jane Doe,2024-06-01,404-555-0100,"123 Main St","Atlanta",GA,30303,2015';
    const csvContent = `${headers}\n${sample}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glee_club_contacts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const downloadValidationLog = () => {
    if (!importResults) return;
    
    const headers = 'Row,Email,Message';
    const rows = importResults.validationLog
      .map(log => `${log.row},"${log.email}","${log.message}"`)
      .join('\n');
    const csvContent = `${headers}\n${rows}`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_validation_log.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Validation log downloaded');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setImportResults(null);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || !dateStr.trim()) return null;
    
    // Try multiple date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // ISO: 2024-01-15
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // US: 1/15/2024 or 01/15/2024
      /^\d{1,2}-\d{1,2}-\d{4}$/, // US with dash: 1-15-2024
    ];
    
    const date = new Date(dateStr.trim());
    return !isNaN(date.getTime()) ? date : null;
  };

  const parseIntSafe = (val: string, defaultVal: number = 0): number => {
    if (!val || !val.trim()) return defaultVal;
    const parsed = parseInt(val.trim(), 10);
    return isNaN(parsed) ? defaultVal : Math.max(0, parsed);
  };

  const parseBoolean = (val: string): boolean | null => {
    if (!val || !val.trim()) return null;
    const lower = val.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(lower)) return true;
    if (['false', '0', 'no'].includes(lower)) return false;
    return null;
  };

  const validateAndParseCSV = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      // Validate headers match canonical names (case-sensitive)
      const missingHeaders = CANONICAL_HEADERS.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing required headers: ${missingHeaders.slice(0, 3).join(', ')}${missingHeaders.length > 3 ? '...' : ''}`);
        return;
      }

      const parsed: ParsedContact[] = [];
      const emailsSeen = new Map<string, number>();

      for (let i = 1; i < lines.length; i++) {
        const rowNum = i + 1;
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        if (values.length !== headers.length) {
          continue; // Skip malformed rows
        }

        const rowData: Record<string, any> = {};
        const issues: ValidationIssue[] = [];

        headers.forEach((header, index) => {
          const value = values[index];
          rowData[header] = value;

          // Special validation for Email
          if (header === 'Email') {
            const email = value.toLowerCase().trim();
            if (!email) {
              issues.push({ row: rowNum, field: header, message: 'Email is required', level: 'error' });
            } else if (!validateEmail(email)) {
              issues.push({ row: rowNum, field: header, message: 'Invalid Email format', level: 'error' });
            } else {
              rowData[header] = email; // Store normalized
              
              // Check for duplicates within file
              if (emailsSeen.has(email)) {
                issues.push({ 
                  row: rowNum, 
                  field: header, 
                  message: `Duplicate Email in file (first seen at row ${emailsSeen.get(email)}); last instance will be kept`, 
                  level: 'warning' 
                });
              }
              emailsSeen.set(email, rowNum);
            }
          }

          // Validate Status
          if (header === 'Status' && value) {
            const validStatuses = ['Active', 'Unsubscribed', 'Bounced', 'Unknown'];
            if (!validStatuses.includes(value)) {
              issues.push({ row: rowNum, field: header, message: `Invalid Status. Must be one of: ${validStatuses.join(', ')}`, level: 'warning' });
              rowData[header] = 'Active'; // Default
            }
          }

          // Parse dates
          if (header.includes('Date') || header === 'last_update') {
            if (value) {
              const parsed = parseDate(value);
              if (!parsed) {
                issues.push({ row: rowNum, field: header, message: 'Unparsed date format', level: 'warning' });
              } else {
                rowData[header] = parsed.toISOString();
              }
            }
          }

          // Parse integers
          if (['TotalSent', 'TotalFailed', 'TotalOpened', 'TotalClicked'].includes(header)) {
            const num = parseIntSafe(value, 0);
            if (value && value.trim() && isNaN(parseInt(value.trim(), 10))) {
              issues.push({ row: rowNum, field: header, message: 'Non-numeric value set to 0', level: 'warning' });
            }
            rowData[header] = num;
          }

          // Parse boolean
          if (header === 'ConsentTracking') {
            const bool = parseBoolean(value);
            rowData[header] = bool;
          }
        });

        parsed.push({ row: rowNum, data: rowData, issues });
      }

      setParsedContacts(parsed);
      setStep('validate');
      toast.success(`Parsed ${parsed.length} rows`);
    } catch (error: any) {
      toast.error('Failed to parse CSV: ' + error.message);
      console.error('Parse error:', error);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    const validationLog: Array<{ row: number; email: string; message: string }> = [];
    let successful = 0;
    let skipped = 0;
    let failed = 0;

    try {
      // Filter out contacts with errors
      const validContacts = parsedContacts.filter(pc => {
        const hasErrors = pc.issues.some(i => i.level === 'error');
        if (hasErrors) {
          skipped++;
          validationLog.push({
            row: pc.row,
            email: pc.data.Email || 'N/A',
            message: pc.issues.filter(i => i.level === 'error').map(i => i.message).join('; ')
          });
          return false;
        }
        return true;
      });

      // Upsert logic
      for (const contact of validContacts) {
        try {
          const email = contact.data.Email;
          
          // Check if contact exists
          const { data: existing } = await supabase
            .from('glee_club_contacts')
            .select('DateUpdated')
            .eq('Email', email)
            .single();

          // Compare DateUpdated if exists
          const shouldUpdate = !existing || 
            !existing.DateUpdated || 
            !contact.data.DateUpdated ||
            new Date(contact.data.DateUpdated) > new Date(existing.DateUpdated);

          if (shouldUpdate) {
            const { error } = await supabase
              .from('glee_club_contacts')
              .upsert(contact.data as any);

            if (error) throw error;
            successful++;
          } else {
            skipped++;
            validationLog.push({
              row: contact.row,
              email,
              message: 'Skipped: existing record has newer DateUpdated'
            });
          }
        } catch (error: any) {
          failed++;
          validationLog.push({
            row: contact.row,
            email: contact.data.Email || 'N/A',
            message: error.message
          });
        }
      }

      setImportResults({ successful, skipped, failed, validationLog });
      toast.success(`Import complete: ${successful} successful, ${skipped} skipped, ${failed} failed`);
      setStep('upload');
      setFile(null);
      setParsedContacts([]);
      
      // Reset file input
      const fileInput = document.getElementById('contacts-csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      toast.error('Import failed: ' + error.message);
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const errorCount = parsedContacts.reduce((sum, pc) => sum + pc.issues.filter(i => i.level === 'error').length, 0);
  const warningCount = parsedContacts.reduce((sum, pc) => sum + pc.issues.filter(i => i.level === 'warning').length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Glee Club Contacts Import Wizard
        </CardTitle>
        <CardDescription>
          Import contacts using the exact CSV headers from your export
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={step} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" disabled={step !== 'upload'}>
              1. Upload
            </TabsTrigger>
            <TabsTrigger value="validate" disabled={step !== 'validate'}>
              2. Validate
            </TabsTrigger>
            <TabsTrigger value="confirm" disabled={step !== 'confirm'}>
              3. Confirm
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                CSV must include exact headers (case-sensitive): Email is required. All other fields are optional.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => document.getElementById('contacts-csv-upload')?.click()}
                  type="button"
                >
                  <FileCheck className="h-4 w-4" />
                  {file ? file.name : 'Choose CSV File'}
                </Button>
                <input
                  id="contacts-csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file && (
                  <Button onClick={validateAndParseCSV} className="gap-2">
                    <FileCheck className="h-4 w-4" />
                    Validate & Continue
                  </Button>
                )}
              </div>
            </div>

            {importResults && (
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-semibold">Previous Import Results</h3>
                
                <div className="grid gap-2">
                  {importResults.successful > 0 && (
                    <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        {importResults.successful} contacts imported successfully
                      </AlertDescription>
                    </Alert>
                  )}

                  {importResults.skipped > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {importResults.skipped} contacts skipped
                      </AlertDescription>
                    </Alert>
                  )}

                  {importResults.failed > 0 && (
                    <Alert variant="destructive">
                      <X className="h-4 w-4" />
                      <AlertDescription>
                        {importResults.failed} contacts failed to import
                      </AlertDescription>
                    </Alert>
                  )}

                  {importResults.validationLog.length > 0 && (
                    <Button variant="outline" onClick={downloadValidationLog} className="gap-2 w-fit">
                      <Download className="h-4 w-4" />
                      Download Validation Log
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="validate" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Validation Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{parsedContacts.length}</div>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                    <p className="text-sm text-muted-foreground">Warnings</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {parsedContacts.some(pc => pc.issues.length > 0) && (
              <div>
                <h4 className="font-semibold mb-2">Issues Found</h4>
                <ScrollArea className="h-[300px] border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedContacts
                        .filter(pc => pc.issues.length > 0)
                        .flatMap(pc => pc.issues.map(issue => ({ ...issue, email: pc.data.Email })))
                        .map((issue, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{issue.row}</TableCell>
                            <TableCell className="font-mono text-sm">{issue.email}</TableCell>
                            <TableCell>{issue.field || 'N/A'}</TableCell>
                            <TableCell>{issue.message}</TableCell>
                            <TableCell>
                              <span className={issue.level === 'error' ? 'text-red-600 font-semibold' : 'text-yellow-600'}>
                                {issue.level.toUpperCase()}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setStep('upload');
                setParsedContacts([]);
              }}>
                Back
              </Button>
              <Button 
                onClick={() => setStep('confirm')}
                disabled={errorCount > 0}
              >
                {errorCount > 0 ? 'Fix Errors to Continue' : 'Continue to Import'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="confirm" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ready to import {parsedContacts.filter(pc => !pc.issues.some(i => i.level === 'error')).length} contacts.
                {warningCount > 0 && ` ${warningCount} warnings will be logged.`}
                <br />
                <strong>Upsert Logic:</strong> Existing contacts will only be updated if the incoming DateUpdated is newer.
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('validate')}>
                Back
              </Button>
              <Button 
                onClick={handleImport}
                disabled={importing}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {importing ? 'Importing...' : 'Confirm Import'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

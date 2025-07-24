import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Archive, ArchiveRestore, Calendar, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ArchiveManagerProps {
  onArchiveToggle: (showArchived: boolean) => void;
  showArchived: boolean;
}

export const ArchiveManager = ({ onArchiveToggle, showArchived }: ArchiveManagerProps) => {
  const { toast } = useToast();
  const [showBulkArchiveDialog, setShowBulkArchiveDialog] = useState(false);
  const [archiveStats, setArchiveStats] = useState({
    totalArchived: 0,
    currentActive: 0
  });
  const [bulkArchiveForm, setBulkArchiveForm] = useState({
    dateFrom: '',
    dateTo: '',
    reason: '',
    semester: ''
  });

  useEffect(() => {
    fetchArchiveStats();
  }, []);

  const fetchArchiveStats = async () => {
    try {
      const { data: archived, error: archivedError } = await supabase
        .from('gw_sheet_music')
        .select('id')
        .eq('is_archived', true);

      const { data: active, error: activeError } = await supabase
        .from('gw_sheet_music')
        .select('id')
        .eq('is_archived', false);

      if (archivedError || activeError) throw archivedError || activeError;

      setArchiveStats({
        totalArchived: archived?.length || 0,
        currentActive: active?.length || 0
      });
    } catch (error) {
      console.error('Error fetching archive stats:', error);
    }
  };

  const handleBulkArchive = async () => {
    if (!bulkArchiveForm.dateFrom || !bulkArchiveForm.dateTo) {
      toast({
        title: "Error",
        description: "Please select both from and to dates",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .update({
          is_archived: true,
          archived_date: new Date().toISOString(),
          archive_reason: bulkArchiveForm.reason || `Bulk archive: ${bulkArchiveForm.semester || 'Date range'}`
        })
        .gte('created_at', bulkArchiveForm.dateFrom)
        .lte('created_at', bulkArchiveForm.dateTo)
        .eq('is_archived', false);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Successfully archived music from selected date range`,
      });

      setBulkArchiveForm({
        dateFrom: '',
        dateTo: '',
        reason: '',
        semester: ''
      });
      setShowBulkArchiveDialog(false);
      fetchArchiveStats();
    } catch (error) {
      console.error('Error bulk archiving:', error);
      toast({
        title: "Error",
        description: "Failed to archive music",
        variant: "destructive",
      });
    }
  };

  const generateSemesterSuggestion = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Determine semester based on current month
    if (month >= 7 && month <= 11) {
      // Fall semester (Aug-Dec)
      return `Fall ${year}`;
    } else if (month >= 0 && month <= 4) {
      // Spring semester (Jan-May)
      return `Spring ${year}`;
    } else {
      // Summer (Jun-Jul)
      return `Summer ${year}`;
    }
  };

  const setSemesterDates = (semester: string) => {
    const year = new Date().getFullYear();
    
    if (semester.includes('Fall')) {
      setBulkArchiveForm({
        ...bulkArchiveForm,
        dateFrom: `${year}-08-01`,
        dateTo: `${year}-12-31`,
        semester: semester,
        reason: `End of ${semester} semester archival`
      });
    } else if (semester.includes('Spring')) {
      setBulkArchiveForm({
        ...bulkArchiveForm,
        dateFrom: `${year}-01-01`,
        dateTo: `${year}-05-31`,
        semester: semester,
        reason: `End of ${semester} semester archival`
      });
    } else if (semester.includes('Summer')) {
      setBulkArchiveForm({
        ...bulkArchiveForm,
        dateFrom: `${year}-06-01`,
        dateTo: `${year}-07-31`,
        semester: semester,
        reason: `End of ${semester} session archival`
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archive Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Active Music</p>
                <p className="text-2xl font-bold">{archiveStats.currentActive}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Archived</p>
                <p className="text-2xl font-bold">{archiveStats.totalArchived}</p>
              </div>
              <Archive className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={showArchived}
                onCheckedChange={onArchiveToggle}
                id="show-archived"
              />
              <Label htmlFor="show-archived">Show Archived Music</Label>
            </div>
            {showArchived && (
              <Badge variant="secondary">Viewing Archived</Badge>
            )}
          </div>

          <Dialog open={showBulkArchiveDialog} onOpenChange={setShowBulkArchiveDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Archive className="h-4 w-4 mr-2" />
                Bulk Archive by Date
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Archive Music</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Quick Semester Selection</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSemesterDates(`Fall ${new Date().getFullYear()}`)}
                    >
                      Fall {new Date().getFullYear()}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSemesterDates(`Spring ${new Date().getFullYear()}`)}
                    >
                      Spring {new Date().getFullYear()}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSemesterDates(`Summer ${new Date().getFullYear()}`)}
                    >
                      Summer {new Date().getFullYear()}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateFrom">From Date</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={bulkArchiveForm.dateFrom}
                      onChange={(e) => setBulkArchiveForm({ ...bulkArchiveForm, dateFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">To Date</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={bulkArchiveForm.dateTo}
                      onChange={(e) => setBulkArchiveForm({ ...bulkArchiveForm, dateTo: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="semester">Semester/Session Name</Label>
                  <Input
                    id="semester"
                    value={bulkArchiveForm.semester}
                    onChange={(e) => setBulkArchiveForm({ ...bulkArchiveForm, semester: e.target.value })}
                    placeholder={generateSemesterSuggestion()}
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Archive Reason</Label>
                  <Textarea
                    id="reason"
                    value={bulkArchiveForm.reason}
                    onChange={(e) => setBulkArchiveForm({ ...bulkArchiveForm, reason: e.target.value })}
                    placeholder="Reason for archiving this batch of music..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowBulkArchiveDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Music
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};
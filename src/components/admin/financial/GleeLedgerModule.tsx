import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { GoogleAuth } from '@/components/google-auth/GoogleAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, ExternalLink, RefreshCw, Download, Upload, FileSpreadsheet } from 'lucide-react';

interface GleeLedgerSheet {
  id: string;
  name: string;
  description: string;
  google_sheet_id: string;
  google_sheet_url: string;
  template_type: string;
  created_at: string;
  last_synced_at: string;
  is_active: boolean;
}

export const GleeLedgerModule = () => {
  const [sheets, setSheets] = useState<GleeLedgerSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAuthRequired, setIsAuthRequired] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSheets();
  }, []);

  const loadSheets = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('glee-sheets-api', {
        body: { action: 'list_sheets' }
      });

      if (error) throw error;

      if (data.needsAuth) {
        setIsAuthRequired(true);
        setSheets([]);
      } else {
        setSheets(data.sheets || []);
        setIsAuthRequired(false);
      }
    } catch (error) {
      console.error('Error loading sheets:', error);
      toast({
        title: "Error",
        description: "Failed to load Google Sheets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async (formData: FormData) => {
    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const template_type = formData.get('template_type') as string;

      const { data, error } = await supabase.functions.invoke('glee-sheets-api', {
        body: {
          action: 'create_sheet',
          name,
          description,
          template_type,
          sheet_config: {}
        }
      });

      if (error) throw error;

      if (data.needsAuth) {
        setIsAuthRequired(true);
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Google to create sheets",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Google Sheet "${name}" created successfully`,
      });

      setIsCreateDialogOpen(false);
      loadSheets();
    } catch (error) {
      console.error('Error creating sheet:', error);
      toast({
        title: "Error",
        description: "Failed to create Google Sheet",
        variant: "destructive"
      });
    }
  };

  const handleSyncData = async (sheetId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('glee-sheets-api', {
        body: {
          action: 'sync_data',
          sheetId
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sheet data synchronized successfully",
      });

      loadSheets();
    } catch (error) {
      console.error('Error syncing data:', error);
      toast({
        title: "Error",
        description: "Failed to sync sheet data",
        variant: "destructive"
      });
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthRequired(false);
    toast({
      title: "Authentication Successful",
      description: "Google Sheets integration is now ready",
    });
    loadSheets();
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading Glee Ledger...
        </CardContent>
      </Card>
    );
  }

  if (isAuthRequired) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Glee Ledger - Google Sheets Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-4">Google Authentication Required</h3>
            <p className="text-muted-foreground mb-6">
              To create and manage Glee Ledger sheets, you need to authenticate with Google Sheets.
            </p>
            <GoogleAuth onAuthSuccess={handleAuthSuccess} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Glee Ledger</h2>
          <p className="text-muted-foreground">
            Create and manage financial ledgers using Google Sheets integration
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Sheet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Glee Ledger Sheet</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateSheet(formData);
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="name" className="text-sm font-medium">
                  Sheet Name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Monthly Ledger - January 2024"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of this ledger sheet"
                />
              </div>
              <div>
                <label htmlFor="template_type" className="text-sm font-medium">
                  Template Type
                </label>
                <Select name="template_type" defaultValue="running_ledger">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running_ledger">Running Ledger</SelectItem>
                    <SelectItem value="monthly_report">Monthly Report</SelectItem>
                    <SelectItem value="quarterly_report">Quarterly Report</SelectItem>
                    <SelectItem value="annual_report">Annual Report</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Sheet</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sheets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Ledger Sheets Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first Google Sheets ledger to get started.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Sheet
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sheets.map((sheet) => (
            <Card key={sheet.id} className="relative">
              <CardHeader>
                <CardTitle className="text-lg">{sheet.name}</CardTitle>
                {sheet.description && (
                  <p className="text-sm text-muted-foreground">{sheet.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Template: {sheet.template_type.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last synced: {
                      sheet.last_synced_at 
                        ? new Date(sheet.last_synced_at).toLocaleString()
                        : 'Never'
                    }
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(sheet.google_sheet_url, '_blank')}
                      className="flex-1"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncData(sheet.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => loadSheets()}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <RefreshCw className="h-6 w-6" />
              <span>Refresh Sheets</span>
              <span className="text-xs text-muted-foreground">
                Reload all ledger sheets
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Plus className="h-6 w-6" />
              <span>New Sheet</span>
              <span className="text-xs text-muted-foreground">
                Create new ledger sheet
              </span>
            </Button>
            <Button
              variant="outline"
              disabled
              className="h-auto p-4 flex flex-col items-center gap-2 opacity-50"
            >
              <Download className="h-6 w-6" />
              <span>Export Data</span>
              <span className="text-xs text-muted-foreground">
                Coming soon
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
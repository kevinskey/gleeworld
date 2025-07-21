
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useSetlistDiagnostics } from '@/hooks/useSetlistDiagnostics';

export const SetlistDiagnostics: React.FC = () => {
  const { diagnostics, runDiagnostics } = useSetlistDiagnostics();

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean, label: string) => {
    return (
      <Badge variant={status ? "default" : "destructive"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {label}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Setlist System Diagnostics
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runDiagnostics}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Authentication</span>
            {getStatusBadge(diagnostics.authWorking, diagnostics.authWorking ? "Working" : "Failed")}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Setlists Table</span>
            {getStatusBadge(diagnostics.setlistsTableExists, diagnostics.setlistsTableExists ? "Exists" : "Missing")}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Setlist Items Table</span>
            {getStatusBadge(diagnostics.setlistItemsTableExists, diagnostics.setlistItemsTableExists ? "Exists" : "Missing")}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <span className="font-medium">Sheet Music Table</span>
            {getStatusBadge(diagnostics.sheetMusicTableExists, diagnostics.sheetMusicTableExists ? "Exists" : "Missing")}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg md:col-span-2">
            <span className="font-medium">Database Permissions</span>
            {getStatusBadge(diagnostics.hasPermissions, diagnostics.hasPermissions ? "Granted" : "Denied")}
          </div>
        </div>

        {diagnostics.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600">Errors Found:</h4>
            <div className="space-y-1">
              {diagnostics.errors.map((error, index) => (
                <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {diagnostics.errors.length === 0 && diagnostics.authWorking && diagnostics.setlistsTableExists && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
            All systems appear to be working correctly. If you're still experiencing issues, try refreshing the page or logging out and back in.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

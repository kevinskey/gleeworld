
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, FileSpreadsheet, Download, Upload, DollarSign } from "lucide-react";
import { FinanceTable } from "./FinanceTable";
import { FinanceSummary } from "./FinanceSummary";
import { AddFinanceRecordDialog } from "./AddFinanceRecordDialog";
import { useFinanceRecords } from "@/hooks/useFinanceRecords";
import { useAuth } from "@/contexts/AuthContext";

export const FinanceManagement = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { user } = useAuth();
  const { 
    records, 
    loading, 
    error, 
    createRecord, 
    updateRecord, 
    deleteRecord,
    importStipendRecords,
    exportToExcel,
    importFromExcel 
  } = useFinanceRecords();

  console.log('FinanceManagement render - records:', records, 'loading:', loading, 'error:', error);

  const handleExport = () => {
    exportToExcel();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importFromExcel(file);
    }
  };

  const handleImportStipends = () => {
    importStipendRecords();
  };

  // Show authentication required message if user is not logged in
  if (!user) {
    return (
      <div className="space-y-6 p-6">
        <div className="glass-card p-6">
          <h2 className="text-3xl font-bold text-gradient mb-2">Finance Management</h2>
          <p className="text-lg text-white/70">Manage stipends, receipts, payments, debits, credits, and balances.</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="h-6 w-6 text-spelman-400" />
            <h3 className="text-2xl font-semibold text-white">Authentication Required</h3>
          </div>
          <p className="text-white/70 mb-4">Please sign in to access your financial records and manage your finances.</p>
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="glass-button text-white font-medium"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="glass-card p-6">
          <h2 className="text-3xl font-bold text-gradient mb-2">Finance Management</h2>
          <p className="text-lg text-white/70">Manage stipends, receipts, payments, debits, credits, and balances.</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="h-6 w-6 text-spelman-400" />
            <h3 className="text-2xl font-semibold text-white">Error Loading Finance Records</h3>
          </div>
          <p className="text-red-300">{error}</p>
          <Button 
            onClick={() => window.location.reload()}
            className="mt-4 glass-button text-white font-medium"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Controls */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gradient mb-2">Finance Management</h2>
            <p className="text-lg text-white/70">Manage stipends, receipts, payments, debits, credits, and balances with Excel-like functionality.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button 
              onClick={handleImportStipends}
              variant="outline"
              className="glass border-green-400/30 text-green-300 hover:bg-green-500/20 w-full sm:w-auto"
              disabled={loading}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Import Stipends
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImport}
                className="hidden"
                id="import-file"
              />
              <Button
                variant="outline"
                className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20 w-full sm:w-auto"
                onClick={() => document.getElementById('import-file')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
            </div>
            <Button 
              onClick={handleExport}
              variant="outline"
              className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20 w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="glass-button text-white font-medium w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <FinanceSummary records={records} loading={loading} />

      {/* Excel-like Table Section */}
      <FinanceTable 
        records={records} 
        loading={loading}
        onUpdate={updateRecord}
        onDelete={deleteRecord}
      />

      {/* Add Record Dialog */}
      <AddFinanceRecordDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={createRecord}
      />
    </div>
  );
};

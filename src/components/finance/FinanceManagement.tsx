
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, FileSpreadsheet, Download, Upload, DollarSign, Mail, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FinanceTable } from "./FinanceTable";
import { FinanceSummary } from "./FinanceSummary";
import { AddFinanceRecordDialog } from "./AddFinanceRecordDialog";
import { BulkW9EmailDialog } from "@/components/admin/BulkW9EmailDialog";
import { useFinanceRecords } from "@/hooks/useFinanceRecords";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";

export const FinanceManagement = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [bulkW9EmailOpen, setBulkW9EmailOpen] = useState(false);
  const { user } = useAuth();
  const { users } = useUsers();
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
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header with Controls */}
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gradient mb-2">Finance Management</h2>
            <p className="text-base md:text-lg text-white/70">Manage stipends, receipts, payments, debits, credits, and balances with Excel-like functionality.</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:gap-3 w-full md:w-auto">
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="glass-button text-white font-medium flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Record
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-white border-gray-200 shadow-lg text-gray-900"
              >
                <DropdownMenuItem onClick={handleImportStipends} disabled={loading} className="text-gray-900 hover:bg-gray-100">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Import Stipends
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => document.getElementById('import-file')?.click()} className="text-gray-900 hover:bg-gray-100">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} className="text-gray-900 hover:bg-gray-100">
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setBulkW9EmailOpen(true)} className="text-gray-900 hover:bg-gray-100">
                  <Mail className="h-4 w-4 mr-2" />
                  Send W9 Forms
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Hidden file input for Excel import */}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
          </div>
        </div>
      </div>

      {/* W9 Forms Management Section */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">W9 Forms Management</h3>
            <p className="text-white/70">Send W9 tax forms to users and track completion for financial reporting</p>
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

      {/* Bulk W9 Email Dialog */}
      <BulkW9EmailDialog
        open={bulkW9EmailOpen}
        onOpenChange={setBulkW9EmailOpen}
        totalUsers={users.length}
      />
    </div>
  );
};

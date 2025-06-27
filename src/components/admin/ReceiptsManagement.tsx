
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, DollarSign } from "lucide-react";
import { useReceipts } from "@/hooks/useReceipts";
import { AddReceiptDialog } from "./AddReceiptDialog";
import { ReceiptsTable } from "./ReceiptsTable";
import { ReceiptsSummary } from "./ReceiptsSummary";
import { ReceiptsTemplateAssignment } from "./ReceiptsTemplateAssignment";

export const ReceiptsManagement = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplateAssignment, setShowTemplateAssignment] = useState(false);
  const { receipts, loading, error, createReceipt, updateReceipt, deleteReceipt, uploadReceiptImage } = useReceipts();

  console.log('ReceiptsManagement render - receipts:', receipts, 'loading:', loading, 'error:', error);

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="glass-card p-6">
          <h2 className="text-3xl font-bold text-gradient mb-2">Receipts Management</h2>
          <p className="text-lg text-white/70">Track and manage purchase receipts for templates and events.</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Receipt className="h-6 w-6 text-spelman-400" />
            <h3 className="text-2xl font-semibold text-white">Error Loading Receipts</h3>
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
      {/* Header with Controls - Always visible */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gradient mb-2">Receipts Management</h2>
            <p className="text-lg text-white/70">Track and manage purchase receipts for templates and events.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button 
              onClick={() => {
                console.log('Template Stipends button clicked');
                setShowTemplateAssignment(true);
              }}
              variant="outline"
              className="glass border-spelman-400/30 text-spelman-300 hover:bg-spelman-500/20 w-full sm:w-auto"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Template Stipends
            </Button>
            <Button 
              onClick={() => {
                console.log('Add Receipt button clicked');
                setShowAddDialog(true);
              }}
              className="glass-button text-white font-medium w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <ReceiptsSummary receipts={receipts} loading={loading} />

      {/* Table Section */}
      <ReceiptsTable 
        receipts={receipts} 
        loading={loading}
        onUpdate={updateReceipt}
        onDelete={deleteReceipt}
      />

      {/* Add Receipt Dialog */}
      <AddReceiptDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          console.log('AddReceiptDialog onOpenChange:', open);
          setShowAddDialog(open);
        }}
        onSubmit={createReceipt}
        onUploadImage={uploadReceiptImage}
      />

      {/* Template Assignment Dialog */}
      <ReceiptsTemplateAssignment
        open={showTemplateAssignment}
        onOpenChange={(open) => {
          console.log('ReceiptsTemplateAssignment onOpenChange:', open);
          setShowTemplateAssignment(open);
        }}
        receipts={receipts}
        onUpdate={updateReceipt}
      />
    </div>
  );
};

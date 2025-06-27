
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Receipt } from "lucide-react";
import { useReceipts } from "@/hooks/useReceipts";
import { AddReceiptDialog } from "./AddReceiptDialog";
import { ReceiptsTable } from "./ReceiptsTable";
import { ReceiptsSummary } from "./ReceiptsSummary";

export const ReceiptsManagement = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { receipts, loading, error, createReceipt, updateReceipt, deleteReceipt, uploadReceiptImage } = useReceipts();

  if (error) {
    return (
      <div className="space-y-6">
        <div className="mb-8 glass-card p-6">
          <h2 className="text-3xl font-bold text-gradient mb-2">Receipts Management</h2>
          <p className="text-lg text-white/70">Track and manage purchase receipts for templates and events.</p>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Receipt className="h-6 w-6 text-spelman-400" />
            <h3 className="text-2xl font-semibold text-white">Error Loading Receipts</h3>
          </div>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 glass-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gradient mb-2">Receipts Management</h2>
            <p className="text-lg text-white/70">Track and manage purchase receipts for templates and events.</p>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="glass-button text-white font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Receipt
          </Button>
        </div>
      </div>

      <ReceiptsSummary receipts={receipts} loading={loading} />

      <ReceiptsTable 
        receipts={receipts} 
        loading={loading}
        onUpdate={updateReceipt}
        onDelete={deleteReceipt}
      />

      <AddReceiptDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={createReceipt}
        onUploadImage={uploadReceiptImage}
      />
    </div>
  );
};

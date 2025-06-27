
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Receipts Management
          </CardTitle>
          <CardDescription>Error loading receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Receipts Management
              </CardTitle>
              <CardDescription>
                Track and manage purchase receipts for templates and events
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </div>
        </CardHeader>
      </Card>

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

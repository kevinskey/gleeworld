import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  FileText,
  Trash2,
  Download,
  Eye,
  Receipt,
  X,
} from "lucide-react";
import { useInvoices, type InvoiceLineItem, type CreateInvoiceData } from "@/hooks/useInvoices";
import { InvoicePreview } from "./InvoicePreview";

const SPELMAN_INFO = {
  name: "Spelman College Glee Club",
  address: "350 Spelman Lane, SW",
  cityStateZip: "Atlanta, GA 30314",
  taxId: "58-0566243",
  taxStatus: "501(c)(3) Nonprofit Organization — Spelman College",
};

const emptyLineItem: InvoiceLineItem = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  amount: 0,
};

export const InvoiceMaker = () => {
  const { invoices, loading, error, createInvoice, deleteInvoice } = useInvoices();
  const [showForm, setShowForm] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [donorName, setDonorName] = useState("");
  const [donorOrg, setDonorOrg] = useState("");
  const [donorAddress, setDonorAddress] = useState("");
  const [donorCity, setDonorCity] = useState("");
  const [donorState, setDonorState] = useState("");
  const [donorZip, setDonorZip] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [directorName, setDirectorName] = useState("Dr. Kevin Phillip Johnson");
  const [directorTitle, setDirectorTitle] = useState("Director, Spelman College Glee Club");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([{ ...emptyLineItem }]);
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");

  const resetForm = () => {
    setDonorName("");
    setDonorOrg("");
    setDonorAddress("");
    setDonorCity("");
    setDonorState("");
    setDonorZip("");
    setDonorEmail("");
    setDonorPhone("");
    setDirectorName("Dr. Kevin Phillip Johnson");
    setDirectorTitle("Director, Spelman College Glee Club");
    setLineItems([{ ...emptyLineItem }]);
    setNotes("");
    setDueDate("");
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updated[index].amount = Number(updated[index].quantity) * Number(updated[index].unitPrice);
    }
    setLineItems(updated);
  };

  const addLineItem = () => setLineItems([...lineItems, { ...emptyLineItem }]);
  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleSubmit = async () => {
    if (!donorName.trim()) return;
    setSaving(true);
    try {
      const data: CreateInvoiceData = {
        donor_name: donorName.trim(),
        donor_organization: donorOrg.trim() || undefined,
        donor_address: donorAddress.trim() || undefined,
        donor_city: donorCity.trim() || undefined,
        donor_state: donorState.trim() || undefined,
        donor_zip: donorZip.trim() || undefined,
        donor_email: donorEmail.trim() || undefined,
        donor_phone: donorPhone.trim() || undefined,
        director_name: directorName,
        director_title: directorTitle,
        line_items: lineItems.filter(i => i.description.trim()),
        subtotal,
        total_amount: subtotal,
        notes: notes.trim() || undefined,
        due_date: dueDate || undefined,
      };
      await createInvoice(data);
      resetForm();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const buildPreviewData = (invoice?: any) => {
    if (invoice) return { ...invoice, line_items: invoice.line_items || [] };
    return {
      invoice_number: "PREVIEW",
      invoice_date: new Date().toISOString().split("T")[0],
      donor_name: donorName,
      donor_organization: donorOrg,
      donor_address: donorAddress,
      donor_city: donorCity,
      donor_state: donorState,
      donor_zip: donorZip,
      donor_email: donorEmail,
      director_name: directorName,
      director_title: directorTitle,
      line_items: lineItems,
      subtotal,
      total_amount: subtotal,
      notes,
      due_date: dueDate,
    };
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Receipt className="h-6 w-6 text-primary" />
                Invoice Maker
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Generate nonprofit donation invoices for the Spelman College Glee Club
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Existing Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading invoices...</p>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No invoices created yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor / Organization</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                    <TableCell>{new Date(inv.invoice_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div>{inv.donor_name}</div>
                      {inv.donor_organization && (
                        <div className="text-xs text-muted-foreground">{inv.donor_organization}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(inv.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.payment_status === "paid" ? "default" : "secondary"}>
                        {inv.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewInvoice(inv)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteInvoice(inv.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Create New Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* From - Spelman Info (read-only) */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">From</p>
                <p className="font-semibold">{SPELMAN_INFO.name}</p>
                <p className="text-sm text-muted-foreground">{SPELMAN_INFO.address}</p>
                <p className="text-sm text-muted-foreground">{SPELMAN_INFO.cityStateZip}</p>
                <p className="text-sm text-muted-foreground mt-1">EIN: {SPELMAN_INFO.taxId}</p>
                <p className="text-xs text-muted-foreground">{SPELMAN_INFO.taxStatus}</p>
              </CardContent>
            </Card>

            {/* Director Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Director Name</Label>
                <Input value={directorName} onChange={(e) => setDirectorName(e.target.value)} />
              </div>
              <div>
                <Label>Director Title</Label>
                <Input value={directorTitle} onChange={(e) => setDirectorTitle(e.target.value)} />
              </div>
            </div>

            <Separator />

            {/* Bill To */}
            <div>
              <p className="text-sm font-semibold mb-3">Bill To / Donor Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name *</Label>
                  <Input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="John Smith" />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Input value={donorOrg} onChange={(e) => setDonorOrg(e.target.value)} placeholder="Company or Organization" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Address</Label>
                  <Input value={donorAddress} onChange={(e) => setDonorAddress(e.target.value)} placeholder="123 Main St" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={donorCity} onChange={(e) => setDonorCity(e.target.value)} placeholder="City" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>State</Label>
                    <Input value={donorState} onChange={(e) => setDonorState(e.target.value)} placeholder="GA" />
                  </div>
                  <div>
                    <Label>ZIP</Label>
                    <Input value={donorZip} onChange={(e) => setDonorZip(e.target.value)} placeholder="30314" />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Line Items</p>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      {idx === 0 && <Label className="text-xs">Description</Label>}
                      <Input
                        value={item.description}
                        onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                        placeholder="Donation for Spring Concert"
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Qty</Label>}
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      {idx === 0 && <Label className="text-xs">Unit Price</Label>}
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(idx, "unitPrice", Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      {idx === 0 && <Label className="text-xs">Amount</Label>}
                      <p className="h-9 flex items-center justify-end font-medium text-sm">
                        ${(item.amount || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="col-span-1">
                      {lineItems.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(idx)} className="h-9 w-9">
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4 pr-12">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">${subtotal.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Due Date (optional)</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or instructions..."
                  rows={2}
                />
              </div>
            </div>

            {/* 501(c)(3) Notice */}
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Tax-Deductible Donation Notice:</strong> Spelman College is a 501(c)(3) nonprofit
                  organization. EIN: {SPELMAN_INFO.taxId}. No goods or services were provided in exchange for
                  this contribution unless otherwise noted above. This invoice may serve as your receipt for
                  tax purposes.
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setPreviewInvoice(buildPreviewData())}
              >
                <Eye className="h-4 w-4 mr-2" /> Preview
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!donorName.trim() || saving}>
                  {saving ? "Saving..." : "Create Invoice"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          open={!!previewInvoice}
          onOpenChange={(open) => { if (!open) setPreviewInvoice(null); }}
        />
      )}
    </div>
  );
};

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BRAND = {
  name: "Your favorite band or choir",
  address: "350 Concert Hall Drive, SW",
  cityStateZip: "Atlanta, GA 30314",
  taxId: "58-0566243",
  taxNotice:
    "Riverside Music Institute is a 501(c)(3) nonprofit organization. EIN: 58-0566243. No goods or services were provided in exchange for this contribution unless otherwise noted. This invoice serves as your receipt for tax purposes.",
};

interface InvoicePreviewProps {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoicePreview = ({ invoice, open, onOpenChange }: InvoicePreviewProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const lineItems = invoice.line_items || [];

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Invoice ${invoice.invoice_number}</title>
      <style>
        body { font-family: 'Georgia', serif; margin: 0; padding: 40px; color: #1a1a1a; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; text-align: left; }
        th { border-bottom: 2px solid #150d26; font-size: 12px; text-transform: uppercase; }
        td { border-bottom: 1px solid #e5e5e5; }
        .text-right { text-align: right; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .tax-notice { margin-top: 40px; padding: 16px; background: #f8f8f8; border-left: 4px solid #150d26; font-size: 11px; }
        @media print { body { padding: 20px; } }
      </style></head><body>${content.innerHTML}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(BRAND.name, margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(BRAND.address, margin, y);
    y += 5;
    doc.text(BRAND.cityStateZip, margin, y);
    y += 5;
    doc.text(`EIN: ${BRAND.taxId}`, margin, y);

    // Invoice number + date (right side)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 190, margin, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`#${invoice.invoice_number}`, 190, margin + 8, { align: "right" });
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 190, margin + 14, { align: "right" });
    if (invoice.due_date) {
      doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, 190, margin + 20, { align: "right" });
    }

    y += 15;

    // Director
    doc.setFont("helvetica", "bold");
    doc.text("Prepared By:", margin, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.text(invoice.director_name || "Dr. Kevin Phillip Johnson", margin, y);
    y += 5;
    doc.text(invoice.director_title || "Director, Your favorite band or choir", margin, y);
    y += 12;

    // Bill To
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", margin, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.text(invoice.donor_name, margin, y);
    y += 5;
    if (invoice.donor_organization) { doc.text(invoice.donor_organization, margin, y); y += 5; }
    if (invoice.donor_address) { doc.text(invoice.donor_address, margin, y); y += 5; }
    const csz = [invoice.donor_city, invoice.donor_state, invoice.donor_zip].filter(Boolean).join(", ");
    if (csz) { doc.text(csz, margin, y); y += 5; }
    if (invoice.donor_email) { doc.text(invoice.donor_email, margin, y); y += 5; }
    y += 10;

    // Line items table
    doc.setFont("helvetica", "bold");
    doc.setFillColor(0, 54, 102); // Brand navy
    doc.rect(margin, y, 170, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("DESCRIPTION", margin + 2, y + 6);
    doc.text("QTY", 120, y + 6);
    doc.text("UNIT PRICE", 140, y + 6);
    doc.text("AMOUNT", 170, y + 6, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    lineItems.forEach((item: any) => {
      doc.text(item.description || "", margin + 2, y);
      doc.text(String(item.quantity || 1), 122, y);
      doc.text(`$${Number(item.unitPrice || 0).toFixed(2)}`, 142, y);
      doc.text(`$${Number(item.amount || 0).toFixed(2)}`, 188, y, { align: "right" });
      y += 7;
    });

    // Total
    y += 5;
    doc.setDrawColor(0, 54, 102);
    doc.line(130, y, 190, y);
    y += 7;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", 130, y);
    doc.text(`$${Number(invoice.total_amount || 0).toFixed(2)}`, 188, y, { align: "right" });
    y += 15;

    // Notes
    if (invoice.notes) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", margin, y);
      doc.setFont("helvetica", "normal");
      y += 5;
      const lines = doc.splitTextToSize(invoice.notes, 170);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 10;
    }

    // Tax notice
    doc.setFillColor(248, 248, 248);
    doc.rect(margin, y, 170, 25, "F");
    doc.setDrawColor(0, 54, 102);
    doc.line(margin, y, margin, y + 25);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    const taxLines = doc.splitTextToSize(BRAND.taxNotice, 165);
    doc.text(taxLines, margin + 3, y + 5);

    // Save + optionally store in media library
    const pdfBlob = doc.output("blob");
    const fileName = `Invoice_${invoice.invoice_number}_${invoice.donor_name.replace(/\s+/g, "_")}.pdf`;
    
    // Download locally
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    // Also upload to media library
    try {
      const filePath = `invoices/${fileName}`;
      const { error: uploadErr } = await supabase.storage
        .from("media-library")
        .upload(filePath, pdfBlob, { contentType: "application/pdf", upsert: true });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from("media-library")
          .getPublicUrl(filePath);

        await supabase.from("gw_media_library").insert({
          title: `Invoice ${invoice.invoice_number} - ${invoice.donor_name}`,
          file_url: urlData.publicUrl,
          file_path: filePath,
          file_type: "application/pdf",
          file_size: pdfBlob.size,
          category: "invoice",
          bucket_id: "media-library",
          is_public: false,
        } as any);

        // Link media to invoice if it has an ID
        if (invoice.id) {
          const { data: mediaData } = await supabase
            .from("gw_media_library")
            .select("id")
            .eq("file_path", filePath)
            .single();

          if (mediaData) {
            await supabase
              .from("gw_invoices")
              .update({ media_id: mediaData.id, pdf_url: urlData.publicUrl } as any)
              .eq("id", invoice.id);
          }
        }

        toast.success("Invoice PDF saved to Media Library");
      }
    } catch (err) {
      console.error("Media library upload error:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice Preview</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
              <Button size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-1" /> Download PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="bg-white text-black p-8 rounded border" style={{ fontFamily: "Georgia, serif" }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-xl font-bold text-[#150d26]">{BRAND.name}</h1>
              <p className="text-sm text-gray-600">{BRAND.address}</p>
              <p className="text-sm text-gray-600">{BRAND.cityStateZip}</p>
              <p className="text-sm text-gray-600 mt-1">EIN: {BRAND.taxId}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-[#150d26]">INVOICE</h2>
              <p className="text-sm font-mono">#{invoice.invoice_number}</p>
              <p className="text-sm text-gray-600">
                Date: {new Date(invoice.invoice_date).toLocaleDateString()}
              </p>
              {invoice.due_date && (
                <p className="text-sm text-gray-600">
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Prepared By & Bill To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-1">Prepared By</p>
              <p className="font-semibold">{invoice.director_name}</p>
              <p className="text-sm text-gray-600">{invoice.director_title}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-gray-500 mb-1">Bill To</p>
              <p className="font-semibold">{invoice.donor_name}</p>
              {invoice.donor_organization && <p className="text-sm">{invoice.donor_organization}</p>}
              {invoice.donor_address && <p className="text-sm text-gray-600">{invoice.donor_address}</p>}
              {(invoice.donor_city || invoice.donor_state || invoice.donor_zip) && (
                <p className="text-sm text-gray-600">
                  {[invoice.donor_city, invoice.donor_state, invoice.donor_zip].filter(Boolean).join(", ")}
                </p>
              )}
              {invoice.donor_email && <p className="text-sm text-gray-600">{invoice.donor_email}</p>}
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-[#150d26] text-white">
                <th className="text-left py-2 px-3 text-xs uppercase">Description</th>
                <th className="text-center py-2 px-3 text-xs uppercase w-16">Qty</th>
                <th className="text-right py-2 px-3 text-xs uppercase w-24">Unit Price</th>
                <th className="text-right py-2 px-3 text-xs uppercase w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-2 px-3 text-sm">{item.description}</td>
                  <td className="text-center py-2 px-3 text-sm">{item.quantity}</td>
                  <td className="text-right py-2 px-3 text-sm">${Number(item.unitPrice || 0).toFixed(2)}</td>
                  <td className="text-right py-2 px-3 text-sm font-medium">${Number(item.amount || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="flex justify-end mb-8">
            <div className="w-48 border-t-2 border-[#150d26] pt-2">
              <div className="flex justify-between">
                <span className="font-bold text-lg">TOTAL</span>
                <span className="font-bold text-lg">${Number(invoice.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-6">
              <p className="text-xs font-bold uppercase text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {/* Tax Notice */}
          <div className="border-l-4 border-[#150d26] bg-gray-50 p-4 mt-8">
            <p className="text-xs text-gray-600 italic">{BRAND.taxNotice}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

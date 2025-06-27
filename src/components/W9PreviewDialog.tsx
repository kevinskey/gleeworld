
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText } from "lucide-react";

interface W9PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: any;
  onDownload: () => void;
}

export const W9PreviewDialog = ({ open, onOpenChange, form, onDownload }: W9PreviewDialogProps) => {
  if (!form) return null;

  const formData = form.form_data || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            W9 Form Preview
          </DialogTitle>
          <DialogDescription>
            Form submitted on {new Date(form.submitted_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6 p-4">
            {/* Form Header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold">Form W-9</h1>
              <p className="text-lg">Request for Taxpayer Identification Number and Certification</p>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-sm">Name:</label>
                <p className="border rounded p-2 bg-gray-50">{formData.name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm">Business Name:</label>
                <p className="border rounded p-2 bg-gray-50">{formData.businessName || 'N/A'}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="font-semibold text-sm">Address:</label>
                <p className="border rounded p-2 bg-gray-50">{formData.address || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm">City:</label>
                <p className="border rounded p-2 bg-gray-50">{formData.city || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm">State:</label>
                <p className="border rounded p-2 bg-gray-50">{formData.state || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm">ZIP Code:</label>
                <p className="border rounded p-2 bg-gray-50">{formData.zipCode || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm">Email:</label>
                <p className="border rounded p-2 bg-gray-50">{formData.email || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm">Taxpayer ID Number:</label>
                <p className="border rounded p-2 bg-gray-50">{formData.tin || 'N/A'}</p>
              </div>
            </div>

            {/* Certification Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b pb-2">Certification</h3>
              <div className="p-4 bg-blue-50 rounded-lg border">
                <p className="font-semibold mb-2">Under penalties of perjury, I certify that:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>The number shown on this form is my correct taxpayer identification number, and</li>
                  <li>I am not subject to backup withholding, and</li>
                  <li>I am a U.S. citizen or other U.S. person, and</li>
                  <li>The FATCA code(s) entered on this form (if any) is correct.</li>
                </ol>
                <div className="mt-4 flex items-center gap-2">
                  <span className="font-semibold">Certified:</span>
                  <span className={`px-2 py-1 rounded text-sm ${formData.certification ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {formData.certification ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b pb-2">Signature</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-sm">Signature:</label>
                  <div className="border rounded p-4 bg-gray-50 h-20 flex items-center justify-center">
                    {formData.signature ? (
                      <img 
                        src={formData.signature} 
                        alt="Signature" 
                        className="max-h-16 max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-500">No signature provided</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="font-semibold text-sm">Date:</label>
                  <p className="border rounded p-2 bg-gray-50">{formData.signatureDate || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Form Metadata */}
            <div className="border-t pt-4 text-sm text-gray-600">
              <p>Form ID: {form.id}</p>
              <p>Status: {form.status}</p>
              <p>Created: {new Date(form.created_at).toLocaleString()}</p>
              <p>Submitted: {new Date(form.submitted_at).toLocaleString()}</p>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onDownload} className="bg-blue-600 hover:bg-blue-700">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface W9PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: any;
  onDownload: () => void;
}

export const W9PreviewDialog = ({ open, onOpenChange, form, onDownload }: W9PreviewDialogProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!form) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Form Selected</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const formData = form.form_data || {};
  const hasJpgFile = form.storage_path && formData.jpg_generated && formData.jpg_storage_path;
  const hasPdfFile = form.storage_path && formData.pdf_generated;
  const hasFile = hasJpgFile || hasPdfFile;

  useEffect(() => {
    const loadFile = async () => {
      if (hasFile && open) {
        setLoading(true);
        try {
          // Prefer JPG over PDF if available
          const filePath = hasJpgFile ? formData.jpg_storage_path : form.storage_path;
          
          const { data, error } = await supabase.storage
            .from('w9-forms')
            .download(filePath);

          if (error) throw error;

          const url = URL.createObjectURL(data);
          setPdfUrl(url);
        } catch (error) {
          console.error('Error loading file:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    };
  }, [hasFile, hasJpgFile, open, form.storage_path, pdfUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white">
        <DialogHeader className="bg-white">
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <FileText className="h-5 w-5 text-gray-900" />
            W9 Form Preview
          </DialogTitle>
          <DialogDescription className="text-gray-700">
            Form submitted on {new Date(form.submitted_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          {hasFile ? (
            <div className="p-4 bg-white">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading {hasJpgFile ? 'image' : 'PDF'}...</span>
                </div>
              ) : pdfUrl ? (
                hasJpgFile ? (
                  <img
                    src={pdfUrl}
                    alt="W9 Form"
                    className="w-full max-h-[60vh] object-contain border rounded"
                  />
                ) : (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-[60vh] border rounded"
                    title="W9 Form PDF"
                  />
                )
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Unable to load file preview</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 p-4 bg-white">
              {/* Form Header */}
              <div className="text-center border-b border-gray-300 pb-4">
                <h1 className="text-2xl font-bold text-gray-900">Form W-9</h1>
                <p className="text-lg text-gray-800">Request for Taxpayer Identification Number and Certification</p>
              </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-sm text-gray-900">Name:</label>
                <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm text-gray-900">Business Name:</label>
                <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.businessName || 'N/A'}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="font-semibold text-sm text-gray-900">Address:</label>
                <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.address || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm text-gray-900">City:</label>
                <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.city || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm text-gray-900">State:</label>
                <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.state || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm text-gray-900">ZIP Code:</label>
                <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.zipCode || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm text-gray-900">Email:</label>
                <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.email || 'N/A'}</p>
              </div>
              
              <div>
                <label className="font-semibold text-sm text-gray-900">Taxpayer ID Number:</label>
                <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.tin || 'N/A'}</p>
              </div>
            </div>

            {/* Certification Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b border-gray-300 pb-2 text-gray-900">Certification</h3>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold mb-2 text-gray-900">Under penalties of perjury, I certify that:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-800">
                  <li>The number shown on this form is my correct taxpayer identification number, and</li>
                  <li>I am not subject to backup withholding, and</li>
                  <li>I am a U.S. citizen or other U.S. person, and</li>
                  <li>The FATCA code(s) entered on this form (if any) is correct.</li>
                </ol>
                <div className="mt-4 flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Certified:</span>
                  <span className={`px-2 py-1 rounded text-sm ${formData.certification ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {formData.certification ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Signature Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold border-b border-gray-300 pb-2 text-gray-900">Signature</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-sm text-gray-900">Signature:</label>
                  <div className="border border-gray-300 rounded p-4 bg-gray-50 h-20 flex items-center justify-center">
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
                  <label className="font-semibold text-sm text-gray-900">Date:</label>
                  <p className="border border-gray-300 rounded p-2 bg-gray-50 text-gray-900">{formData.signatureDate || 'N/A'}</p>
                </div>
              </div>
            </div>

              {/* Form Metadata */}
              <div className="border-t border-gray-300 pt-4 text-sm text-gray-600">
                <p className="text-gray-700">Form ID: {form.id}</p>
                <p className="text-gray-700">Status: {form.status}</p>
                <p className="text-gray-700">Created: {new Date(form.created_at).toLocaleString()}</p>
                <p className="text-gray-700">Submitted: {new Date(form.submitted_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-300 bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300 text-gray-700 hover:bg-gray-50">
            Close
          </Button>
          <Button onClick={onDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

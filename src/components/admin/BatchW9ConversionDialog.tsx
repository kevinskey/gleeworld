import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Image, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ConversionResult {
  id: string;
  storage_path: string;
  success: boolean;
  error?: string;
}

export const BatchW9ConversionDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    converted: number;
    failed: number;
    results: ConversionResult[];
  } | null>(null);
  
  const { toast } = useToast();

  const handleBatchConversion = async () => {
    try {
      setIsConverting(true);
      setProgress(0);
      setResults(null);

      console.log('Starting batch W9 conversion to JPG...');

      const { data, error } = await supabase.functions.invoke('batch-convert-w9-to-jpg', {
        body: {}
      });

      if (error) {
        throw new Error(error.message);
      }

      setResults(data);
      setProgress(100);

      toast({
        title: "Batch Conversion Completed",
        description: `Converted ${data.converted} out of ${data.total} W9 forms to JPG format.`,
      });

    } catch (error) {
      console.error('Batch conversion error:', error);
      toast({
        title: "Conversion Failed",
        description: error instanceof Error ? error.message : "Failed to perform batch conversion",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const resetDialog = () => {
    setResults(null);
    setProgress(0);
    setIsConverting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        resetDialog();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Image className="h-4 w-4" />
          Convert All W9s to JPG
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Batch Convert W9 Forms to JPG
          </DialogTitle>
          <DialogDescription>
            Convert all existing W9 PDF forms to JPG format for easier viewing and processing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!results && !isConverting && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                This will convert all W9 forms that don't already have JPG versions.
                The process may take a few minutes depending on the number of forms.
              </p>
              <Button 
                onClick={handleBatchConversion}
                disabled={isConverting}
                className="w-full"
              >
                Start Batch Conversion
              </Button>
            </div>
          )}

          {isConverting && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Converting W9 forms to JPG...</span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-600">
                Please wait while we process your forms...
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                  <div className="text-xs text-blue-600">Total Forms</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{results.converted}</div>
                  <div className="text-xs text-green-600">Converted</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
              </div>

              {results.results.length > 0 && (
                <div className="max-h-64 overflow-y-auto">
                  <h4 className="font-medium mb-2">Conversion Results:</h4>
                  <div className="space-y-2">
                    {results.results.map((result, index) => (
                      <div key={result.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-mono text-xs">
                            {result.id.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={result.success ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {result.success ? "Success" : "Failed"}
                          </Badge>
                          {result.error && (
                            <span className="text-xs text-red-600 max-w-32 truncate" title={result.error}>
                              {result.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button 
                  onClick={resetDialog}
                  variant="outline"
                  className="flex-1"
                >
                  Run Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
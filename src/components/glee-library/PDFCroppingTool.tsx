import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Scissors, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CropRecommendation {
  page: number;
  crop: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    confidence: number;
    reasoning?: string;
  };
  error?: string;
}

interface PDFCroppingToolProps {
  sheetMusicId?: string;
  pdfUrl?: string;
  title?: string;
  onComplete?: (recommendations: CropRecommendation[]) => void;
}

export const PDFCroppingTool = ({ 
  sheetMusicId, 
  pdfUrl, 
  title = "Sheet Music",
  onComplete 
}: PDFCroppingToolProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recommendations, setRecommendations] = useState<CropRecommendation[] | null>(null);
  const [currentPage, setCurrentPage] = useState<string>("");

  const convertPDFToImages = async (pdfUrl: string): Promise<string[]> => {
    try {
      const response = await fetch(pdfUrl);
      const pdfArrayBuffer = await response.arrayBuffer();
      
      // Create canvas elements to render PDF pages as images
      // This is a simplified version - in practice you'd use pdf.js
      const images: string[] = [];
      
      // For now, we'll simulate PDF page extraction
      // In a real implementation, you'd use pdf.js to render each page to canvas
      // and convert to base64 images
      
      console.log("PDF conversion simulation - returning placeholder images");
      return images;
    } catch (error) {
      console.error("Error converting PDF to images:", error);
      throw error;
    }
  };

  const analyzePDF = async () => {
    if (!pdfUrl) {
      toast.error("No PDF URL provided");
      return;
    }

    setIsAnalyzing(true);
    setProgress(10);
    setCurrentPage("Converting PDF to images...");

    try {
      // Convert PDF to images (this would need pdf.js integration)
      setProgress(30);
      const pdfImages = await convertPDFToImages(pdfUrl);
      
      if (pdfImages.length === 0) {
        toast.error("Could not extract images from PDF");
        return;
      }

      setProgress(50);
      setCurrentPage("Analyzing pages with AI...");

      // Call the edge function to analyze the PDF
      const { data, error } = await supabase.functions.invoke('analyze-pdf-for-cropping', {
        body: {
          pdfImages,
          sheetMusicId
        }
      });

      if (error) {
        console.error("Error analyzing PDF:", error);
        toast.error("Failed to analyze PDF");
        return;
      }

      setProgress(100);
      setCurrentPage("Analysis complete!");
      setRecommendations(data.cropRecommendations);
      
      toast.success(`Analysis complete! Found ${data.cropRecommendations.length} pages with average ${data.summary.averageConfidence}% confidence.`);
      
      if (onComplete) {
        onComplete(data.cropRecommendations);
      }

    } catch (error) {
      console.error("Error during PDF analysis:", error);
      toast.error("Failed to analyze PDF");
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
      setCurrentPage("");
    }
  };

  const getCropSummary = (crop: CropRecommendation['crop']) => {
    const total = crop.top + crop.bottom + crop.left + crop.right;
    if (total === 0) return "No cropping needed";
    if (total < 20) return "Minimal cropping";
    if (total < 50) return "Moderate cropping";
    return "Significant cropping";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          AI PDF Cropping Tool
        </CardTitle>
        <CardDescription>
          Use AI to analyze and optimize PDF margins for better viewing
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* PDF Info */}
        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">
              {pdfUrl ? "PDF loaded" : "No PDF selected"}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          onClick={analyzePDF}
          disabled={!pdfUrl || isAnalyzing}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Scissors className="h-4 w-4 mr-2" />
              Analyze & Generate Crop Recommendations
            </>
          )}
        </Button>

        {/* Progress */}
        {isAnalyzing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {currentPage}
            </p>
          </div>
        )}

        {/* Results */}
        {recommendations && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Crop Recommendations</h3>
            </div>
            
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {recommendations.map((rec) => (
                <Card key={rec.page} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Page {rec.page}</Badge>
                      {rec.error && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <Badge 
                      className={`text-white ${getConfidenceColor(rec.crop?.confidence || 0)}`}
                    >
                      {rec.crop?.confidence || 0}% confidence
                    </Badge>
                  </div>
                  
                  {rec.error ? (
                    <p className="text-sm text-red-600">{rec.error}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {getCropSummary(rec.crop)}
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>Top: {rec.crop.top}%</div>
                        <div>Bottom: {rec.crop.bottom}%</div>
                        <div>Left: {rec.crop.left}%</div>
                        <div>Right: {rec.crop.right}%</div>
                      </div>
                      {rec.crop.reasoning && (
                        <p className="text-xs text-muted-foreground italic">
                          {rec.crop.reasoning}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
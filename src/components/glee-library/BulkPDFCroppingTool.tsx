import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Scissors, FileText, Loader2, CheckCircle, AlertTriangle, Play, Pause, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { applyUniformCropToPDF } from "@/utils/pdfCropApply";

interface SheetMusic {
  id: string;
  title: string;
  composer?: string;
  pdf_url?: string;
  crop_recommendations?: any;
}

interface BulkCropStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  recommendations?: any;
}

interface CropSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
  rotation: number;
}

export const BulkPDFCroppingTool = () => {
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Map<string, BulkCropStatus>>(new Map());
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState<string>("");
  
  // Crop settings state
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    rotation: 0,
  });

  useEffect(() => {
    loadSheetMusic();
  }, []);

  const loadSheetMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url, crop_recommendations')
        .not('pdf_url', 'is', null)
        .order('title');

      if (error) {
        console.error('Error loading sheet music:', error);
        toast.error('Failed to load sheet music');
        return;
      }

      setSheetMusic(data || []);
      
      // Initialize status for all items
      const statusMap = new Map<string, BulkCropStatus>();
      data?.forEach(item => {
        const cropRec = item.crop_recommendations as Record<string, unknown> | null;
        statusMap.set(item.id, {
          id: item.id,
          status: cropRec?.applied ? 'completed' : 'pending',
          progress: 0,
          recommendations: item.crop_recommendations
        });
      });
      setBulkStatus(statusMap);

    } catch (error) {
      console.error('Error loading sheet music:', error);
      toast.error('Failed to load sheet music');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allIds = sheetMusic.filter(item => item.pdf_url).map(item => item.id);
    setSelectedItems(new Set(allIds));
  };

  const selectNone = () => {
    setSelectedItems(new Set());
  };

  const selectUnprocessed = () => {
    const unprocessedIds = sheetMusic
      .filter(item => {
        const cropRec = item.crop_recommendations as Record<string, unknown> | null;
        return item.pdf_url && !cropRec?.applied;
      })
      .map(item => item.id);
    setSelectedItems(new Set(unprocessedIds));
  };

  const processMassCrop = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select items to crop');
      return;
    }

    // Check if any crop settings are applied
    const hasCropSettings = cropSettings.top > 0 || cropSettings.bottom > 0 || 
                           cropSettings.left > 0 || cropSettings.right > 0 || 
                           cropSettings.rotation !== 0;
    
    if (!hasCropSettings) {
      toast.error('Please set at least one crop margin or rotation');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    const selectedList = Array.from(selectedItems);
    let completed = 0;
    let errors = 0;

    for (const itemId of selectedList) {
      if (isPaused) {
        toast.info('Processing paused');
        break;
      }

      const item = sheetMusic.find(sm => sm.id === itemId);
      if (!item || !item.pdf_url) continue;

      setCurrentItem(item.title);
      
      // Update status to processing
      setBulkStatus(prev => new Map(prev.set(itemId, {
        ...prev.get(itemId)!,
        status: 'processing',
        progress: 0
      })));

      try {
        // Update progress - fetching PDF
        setBulkStatus(prev => new Map(prev.set(itemId, {
          ...prev.get(itemId)!,
          progress: 10
        })));

        // Apply crop settings to the PDF
        const result = await applyUniformCropToPDF(item.pdf_url, cropSettings, {
          onProgress: (current, total) => {
            const progress = 10 + ((current / total) * 60);
            setBulkStatus(prev => new Map(prev.set(itemId, {
              ...prev.get(itemId)!,
              progress
            })));
          },
        });

        // Update progress - uploading
        setBulkStatus(prev => new Map(prev.set(itemId, {
          ...prev.get(itemId)!,
          progress: 75
        })));

        // Upload the cropped PDF to storage
        const fileName = `${itemId}_cropped_${Date.now()}.pdf`;

        const { error: uploadError } = await supabase.storage
          .from('sheet-music')
          .upload(fileName, result.blob, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Update progress - updating database
        setBulkStatus(prev => new Map(prev.set(itemId, {
          ...prev.get(itemId)!,
          progress: 90
        })));

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('sheet-music')
          .getPublicUrl(fileName);

        // Update the sheet music record with new PDF URL
        const cropRecommendationsData = {
          applied: true,
          appliedAt: new Date().toISOString(),
          settings: {
            top: cropSettings.top,
            bottom: cropSettings.bottom,
            left: cropSettings.left,
            right: cropSettings.right,
            rotation: cropSettings.rotation,
          },
          pageCount: result.pageCount,
        };

        const { error: updateError } = await supabase
          .from('gw_sheet_music')
          .update({
            pdf_url: urlData.publicUrl,
            crop_recommendations: cropRecommendationsData,
          })
          .eq('id', itemId);

        if (updateError) throw updateError;

        // Mark as completed
        setBulkStatus(prev => new Map(prev.set(itemId, {
          ...prev.get(itemId)!,
          status: 'completed',
          progress: 100,
          recommendations: {
            applied: true,
            appliedAt: new Date().toISOString(),
            settings: cropSettings,
          }
        })));

        completed++;

      } catch (error) {
        console.error(`Error processing ${item.title}:`, error);
        errors++;
        setBulkStatus(prev => new Map(prev.set(itemId, {
          ...prev.get(itemId)!,
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })));
      }

      setOverallProgress(((completed + errors) / selectedList.length) * 100);
    }

    setIsProcessing(false);
    setCurrentItem("");
    
    if (!isPaused) {
      if (errors > 0) {
        toast.warning(`Completed ${completed} items, ${errors} errors`);
      } else {
        toast.success(`Successfully cropped ${completed} PDFs!`);
      }
    }
  };

  const pauseProcessing = () => {
    setIsPaused(true);
  };

  const resetSettings = () => {
    setCropSettings({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      rotation: 0,
    });
  };

  const getStatusBadge = (status: BulkCropStatus) => {
    switch (status.status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Cropped</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500 text-white">Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-500 text-white">Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading sheet music...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Mass PDF Cropping Tool
        </CardTitle>
        <CardDescription>
          Apply the same crop settings to multiple PDFs at once
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Crop Settings */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Crop Settings</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetSettings}>
                <RotateCw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
            <CardDescription className="text-xs">
              Set margins (%) to crop from each edge. These settings will apply to all selected PDFs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Top</Label>
                  <span className="text-sm text-muted-foreground">{cropSettings.top}%</span>
                </div>
                <Slider
                  value={[cropSettings.top]}
                  onValueChange={([v]) => setCropSettings(prev => ({ ...prev, top: v }))}
                  max={50}
                  step={0.5}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Bottom</Label>
                  <span className="text-sm text-muted-foreground">{cropSettings.bottom}%</span>
                </div>
                <Slider
                  value={[cropSettings.bottom]}
                  onValueChange={([v]) => setCropSettings(prev => ({ ...prev, bottom: v }))}
                  max={50}
                  step={0.5}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Left</Label>
                  <span className="text-sm text-muted-foreground">{cropSettings.left}%</span>
                </div>
                <Slider
                  value={[cropSettings.left]}
                  onValueChange={([v]) => setCropSettings(prev => ({ ...prev, left: v }))}
                  max={50}
                  step={0.5}
                  disabled={isProcessing}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Right</Label>
                  <span className="text-sm text-muted-foreground">{cropSettings.right}%</span>
                </div>
                <Slider
                  value={[cropSettings.right]}
                  onValueChange={([v]) => setCropSettings(prev => ({ ...prev, right: v }))}
                  max={50}
                  step={0.5}
                  disabled={isProcessing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">Rotation</Label>
                <span className="text-sm text-muted-foreground">{cropSettings.rotation}°</span>
              </div>
              <Slider
                value={[cropSettings.rotation]}
                onValueChange={([v]) => setCropSettings(prev => ({ ...prev, rotation: v }))}
                min={-180}
                max={180}
                step={1}
                disabled={isProcessing}
              />
            </div>
          </CardContent>
        </Card>

        {/* Selection Controls */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAll} disabled={isProcessing}>
            Select All ({sheetMusic.filter(s => s.pdf_url).length})
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone} disabled={isProcessing}>
            Select None
          </Button>
          <Button variant="outline" size="sm" onClick={selectUnprocessed} disabled={isProcessing}>
            Select Uncropped ({sheetMusic.filter(sm => {
              const cropRec = sm.crop_recommendations as Record<string, unknown> | null;
              return sm.pdf_url && !cropRec?.applied;
            }).length})
          </Button>
        </div>

        {/* Processing Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={processMassCrop}
            disabled={isProcessing || selectedItems.size === 0}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cropping...
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4 mr-2" />
                Crop Selected ({selectedItems.size})
              </>
            )}
          </Button>
          
          {isProcessing && (
            <Button variant="outline" onClick={pauseProcessing}>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
        </div>

        {/* Overall Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <Progress value={overallProgress} />
            {currentItem && (
              <p className="text-sm text-muted-foreground">
                Currently processing: {currentItem}
              </p>
            )}
          </div>
        )}

        {/* Sheet Music List */}
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {sheetMusic.map((item) => {
              const status = bulkStatus.get(item.id);
              const isSelected = selectedItems.has(item.id);
              
              if (!item.pdf_url) return null;
              
              return (
                <Card key={item.id} className={`p-3 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(item.id)}
                      disabled={isProcessing}
                    />
                    
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      {item.composer && (
                        <p className="text-sm text-muted-foreground truncate">
                          by {item.composer}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {status && getStatusBadge(status)}
                      
                      {status?.status === 'processing' && (
                        <div className="w-16">
                          <Progress value={status.progress} className="h-2" />
                        </div>
                      )}
                      
                      {status?.error && (
                        <div title={status.error}>
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">
              {Array.from(bulkStatus.values()).filter(s => s.status === 'completed').length}
            </p>
            <p className="text-sm text-muted-foreground">Cropped</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">
              {Array.from(bulkStatus.values()).filter(s => s.status === 'processing').length}
            </p>
            <p className="text-sm text-muted-foreground">Processing</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">
              {Array.from(bulkStatus.values()).filter(s => s.status === 'error').length}
            </p>
            <p className="text-sm text-muted-foreground">Errors</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-600">
              {Array.from(bulkStatus.values()).filter(s => s.status === 'pending').length}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

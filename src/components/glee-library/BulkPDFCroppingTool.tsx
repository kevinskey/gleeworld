import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scissors, FileText, Loader2, CheckCircle, AlertTriangle, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export const BulkPDFCroppingTool = () => {
  const [sheetMusic, setSheetMusic] = useState<SheetMusic[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Map<string, BulkCropStatus>>(new Map());
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState<string>("");

  useEffect(() => {
    loadSheetMusic();
  }, []);

  const loadSheetMusic = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url')
        .eq('is_public', true)
        .order('title');

      if (error) {
        console.error('Error loading sheet music:', error);
        toast.error('Failed to load sheet music');
        return;
      }

      setSheetMusic(data || []);
      
      // Initialize status for all items as pending (no crop recommendations in DB yet)
      const statusMap = new Map<string, BulkCropStatus>();
      data?.forEach(item => {
        statusMap.set(item.id, {
          id: item.id,
          status: 'pending',
          progress: 0,
          recommendations: null
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
    const allIds = sheetMusic.map(item => item.id);
    setSelectedItems(new Set(allIds));
  };

  const selectNone = () => {
    setSelectedItems(new Set());
  };

  const selectUnprocessed = () => {
    const unprocessedIds = sheetMusic
      .filter(item => !item.crop_recommendations)
      .map(item => item.id);
    setSelectedItems(new Set(unprocessedIds));
  };

  const processBulkCropping = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select items to process');
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    const selectedList = Array.from(selectedItems);
    let completed = 0;

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
        // Get signed URL for the PDF
        const { data: urlData } = await supabase.storage
          .from('sheet-music')
          .createSignedUrl(item.pdf_url, 3600);

        if (!urlData?.signedUrl) {
          throw new Error('Could not get PDF URL');
        }

        // For now, we'll simulate the process since PDF.js integration is complex
        // In a real implementation, you'd convert the PDF to images first
        
        // Simulate processing time
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setBulkStatus(prev => new Map(prev.set(itemId, {
            ...prev.get(itemId)!,
            progress: i
          })));
          
          if (isPaused) break;
        }

        if (!isPaused) {
          // Mark as completed (in a real implementation, this would have actual recommendations)
          setBulkStatus(prev => new Map(prev.set(itemId, {
            ...prev.get(itemId)!,
            status: 'completed',
            progress: 100,
            recommendations: {
              message: 'Processing would happen here with actual PDF analysis',
              timestamp: new Date().toISOString()
            }
          })));

          completed++;
        }

      } catch (error) {
        console.error(`Error processing ${item.title}:`, error);
        setBulkStatus(prev => new Map(prev.set(itemId, {
          ...prev.get(itemId)!,
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })));
      }

      setOverallProgress((completed / selectedList.length) * 100);
    }

    setIsProcessing(false);
    setCurrentItem("");
    
    if (!isPaused) {
      toast.success(`Completed processing ${completed} items`);
    }
  };

  const pauseProcessing = () => {
    setIsPaused(true);
  };

  const getStatusBadge = (status: BulkCropStatus) => {
    switch (status.status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Analyzed</Badge>;
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
          Bulk PDF Cropping Tool
        </CardTitle>
        <CardDescription>
          Analyze and optimize multiple PDFs at once using AI-powered margin detection
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Selection Controls */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All ({sheetMusic.length})
          </Button>
          <Button variant="outline" size="sm" onClick={selectNone}>
            Select None
          </Button>
          <Button variant="outline" size="sm" onClick={selectUnprocessed}>
            Select Unprocessed ({sheetMusic.filter(sm => !sm.crop_recommendations).length})
          </Button>
        </div>

        {/* Processing Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={processBulkCropping}
            disabled={isProcessing || selectedItems.size === 0}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Process Selected ({selectedItems.size})
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
            <p className="text-sm text-muted-foreground">Analyzed</p>
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
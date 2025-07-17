import React, { useState, useEffect } from 'react';
import { PDFViewer } from './PDFViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

export const PDFViewerDemo: React.FC = () => {
  const [sheetMusicList, setSheetMusicList] = useState<SheetMusic[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<SheetMusic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load sheet music from Supabase
  useEffect(() => {
    const loadSheetMusic = async () => {
      try {
        const { data, error } = await supabase
          .from('gw_sheet_music')
          .select('*')
          .not('pdf_url', 'is', null)
          .limit(10);

        if (error) throw error;
        
        setSheetMusicList(data || []);
        if (data && data.length > 0) {
          setSelectedSheet(data[0]);
        }
      } catch (error) {
        console.error('Error loading sheet music:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSheetMusic();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading sheet music...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sheet Music PDF Viewer</CardTitle>
          <CardDescription>
            View and interact with your sheet music collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Features:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Multi-page navigation with previous/next buttons</li>
              <li>Zoom in/out controls (25% increments, 50%-300% range)</li>
              <li>Rotation support (90-degree increments)</li>
              <li>Loading spinner with progress indication</li>
              <li>Error handling with retry functionality</li>
              <li>Mobile-responsive design</li>
              <li>Keyboard shortcuts (Ctrl/Cmd + Plus/Minus for zoom, Arrow keys for navigation)</li>
              <li>Direct page input for quick navigation</li>
              <li>Download functionality</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Sheet Music Selection */}
      {sheetMusicList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Sheet Music</CardTitle>
            <CardDescription>
              Choose from your available sheet music collection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sheetMusicList.map((sheet) => (
                <Button
                  key={sheet.id}
                  variant={selectedSheet?.id === sheet.id ? "default" : "outline"}
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => setSelectedSheet(sheet)}
                >
                  <div className="space-y-1">
                    <div className="font-medium">{sheet.title}</div>
                    {sheet.composer && (
                      <div className="text-sm text-muted-foreground">
                        by {sheet.composer}
                      </div>
                    )}
                    {sheet.difficulty_level && (
                      <div className="text-xs text-muted-foreground">
                        Level: {sheet.difficulty_level}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Viewer */}
      {selectedSheet && selectedSheet.pdf_url ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{selectedSheet.title}</h2>
            {selectedSheet.composer && (
              <p className="text-muted-foreground">by {selectedSheet.composer}</p>
            )}
          </div>
          
          <PDFViewer 
            pdfUrl={selectedSheet.pdf_url}
            className="border-2 border-dashed border-border"
            initialScale={1.0}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {sheetMusicList.length === 0 ? (
                <p>No sheet music found with PDF files.</p>
              ) : (
                <p>Please select a sheet music to view.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Basic Usage:</h4>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { PDFViewer } from './components/PDFViewer';

function App() {
  return (
    <PDFViewer 
      pdfUrl="your-supabase-storage-url"
      className="custom-class" // optional
      initialScale={1.0} // optional, defaults to 1.0
    />
  );
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Sheet Music Integration:</h4>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// Load from Supabase sheet music storage
const { data } = await supabase
  .from('gw_sheet_music')
  .select('*')
  .not('pdf_url', 'is', null);

// Use with PDFViewer
<PDFViewer pdfUrl={data[0].pdf_url} />`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Keyboard Shortcuts:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code>Ctrl/Cmd + Plus</code> - Zoom in</li>
                <li><code>Ctrl/Cmd + Minus</code> - Zoom out</li>
                <li><code>Ctrl/Cmd + 0</code> - Reset zoom to 100%</li>
                <li><code>Left Arrow</code> - Previous page</li>
                <li><code>Right Arrow</code> - Next page</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFViewerDemo;
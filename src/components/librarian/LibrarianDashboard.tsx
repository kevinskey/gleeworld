import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Upload, Camera, FileSpreadsheet, Package, BarChart3, FileText, MapPin, Clock, AlertCircle, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PDFImportManager } from './PDFImportManager';
import { PhysicalInventoryManager } from './PhysicalInventoryManager';
import { LibrarianStats } from './LibrarianStats';
import { CSVImportExport } from './CSVImportExport';
import { DocumentScanner } from './DocumentScanner';
export const LibrarianDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  console.log('🔍 LibrarianDashboard component rendering');
  return <div className="container mx-auto p-4 space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Metal Plate Header */}
        <div className="relative bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-500 dark:from-zinc-600 dark:via-zinc-700 dark:to-zinc-800 rounded-lg shadow-lg p-5 border border-zinc-400 dark:border-zinc-600">
          {/* Left Rivet */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gradient-radial from-zinc-200 to-zinc-500 dark:from-zinc-500 dark:to-zinc-800 rounded-full shadow-inner border border-zinc-600 dark:border-zinc-400"></div>
          
          {/* Right Rivet */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-gradient-radial from-zinc-200 to-zinc-500 dark:from-zinc-500 dark:to-zinc-800 rounded-full shadow-inner border border-zinc-600 dark:border-zinc-400"></div>
          
          {/* Header Content */}
          <div className="flex items-center justify-center">
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 tracking-wider">
              <BookOpen className="h-7 w-7" />
              Music Librarian Dashboard
            </h1>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setActiveTab('pdf-import')} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import PDFs
          </Button>
          <Button onClick={() => setActiveTab('inventory')} size="sm" variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Physical Inventory
          </Button>
          <Button onClick={() => setActiveTab('csv')} size="sm" variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV Tools
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <LibrarianStats />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pdf-import">PDF Import</TabsTrigger>
          <TabsTrigger value="inventory">Physical Inventory</TabsTrigger>
          <TabsTrigger value="csv">CSV Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" className="w-full" onClick={() => setShowScanner(true)}>
                  <Camera className="h-4 w-4 mr-2" />
                  Scan New Score
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setActiveTab('inventory')}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Update Location
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setActiveTab('csv')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>5 PDFs uploaded</span>
                    <Badge variant="secondary">Today</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Inventory updated</span>
                    <Badge variant="secondary">Yesterday</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>CSV exported</span>
                    <Badge variant="secondary">2 days ago</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Inventory Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Low stock items</span>
                    <Badge variant="destructive">3</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Missing location</span>
                    <Badge variant="outline">12</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Needs inventory check</span>
                    <Badge variant="outline">8</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pdf-import">
          <PDFImportManager />
        </TabsContent>

        <TabsContent value="inventory">
          <PhysicalInventoryManager />
        </TabsContent>

        <TabsContent value="csv">
          <CSVImportExport />
        </TabsContent>
      </Tabs>

      {/* Document Scanner Modal */}
      {showScanner && <DocumentScanner onClose={() => setShowScanner(false)} onComplete={(pdfUrl, metadata) => {
      setShowScanner(false);
      toast({
        title: "Document Scanned Successfully",
        description: `"${metadata.title}" has been scanned and saved to the music library.`
      });
      // Optionally switch to PDF import tab to show the completed upload
      setActiveTab('pdf-import');
    }} />}
    </div>;
};
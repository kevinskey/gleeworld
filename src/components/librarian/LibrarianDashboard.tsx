import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Upload, 
  Camera, 
  FileSpreadsheet, 
  Package, 
  BarChart3,
  FileText,
  MapPin,
  Clock,
  AlertCircle 
} from 'lucide-react';
import { PDFImportManager } from './PDFImportManager';
import { PhysicalInventoryManager } from './PhysicalInventoryManager';
import { LibrarianStats } from './LibrarianStats';
import { CSVImportExport } from './CSVImportExport';

export const LibrarianDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Music Librarian Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage both digital PDFs and physical hard copy scores
          </p>
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

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button size="sm" className="w-full" onClick={() => setActiveTab('pdf-import')}>
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
    </div>
  );
};
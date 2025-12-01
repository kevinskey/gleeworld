import React from 'react';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { QRScanHistory } from '@/components/qr/QRScanHistory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const QRGeneratorPage = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">QR Code Management</h1>
          <p className="text-muted-foreground">
            Generate QR codes and view scan history for GleeWorld attendance tracking.
          </p>
        </div>
        
        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generator">QR Generator</TabsTrigger>
            <TabsTrigger value="history">Scan History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generator" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <QRCodeGenerator 
                defaultText="https://gleeworld.org"
                title="GleeWorld Website"
              />
              
              <QRCodeGenerator 
                defaultText=""
                title="Custom QR Code"
              />
            </div>
            
            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Quick Access</h3>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <QRCodeGenerator 
                  defaultText="https://gleeworld.org/concert-ticket-request"
                  title="Concert Ticket Request"
                />
                <QRCodeGenerator 
                  defaultText="https://gleeworld.org/dashboard"
                  title="Dashboard"
                />
                <QRCodeGenerator 
                  defaultText="https://gleeworld.org/qr-scanner"
                  title="QR Scanner"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <QRScanHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default QRGeneratorPage;
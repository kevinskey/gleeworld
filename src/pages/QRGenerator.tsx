import React from 'react';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';

const QRGeneratorPage = () => {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">QR Code Generator</h1>
          <p className="text-muted-foreground">
            Generate QR codes for GleeWorld or any custom content to share with others.
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <QRCodeGenerator 
            defaultText={window.location.origin}
            title="GleeWorld Website"
          />
          
          <QRCodeGenerator 
            defaultText=""
            title="Custom QR Code"
          />
        </div>
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Quick Access</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <QRCodeGenerator 
              defaultText={`${window.location.origin}/dashboard`}
              title="Dashboard"
            />
            <QRCodeGenerator 
              defaultText={`${window.location.origin}/qr-scanner`}
              title="QR Scanner"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGeneratorPage;
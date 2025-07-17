import React from 'react';
import { PDFViewer } from './PDFViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const PDFViewerDemo: React.FC = () => {
  // Example PDF URL - you can replace this with any PDF from your public folder
  // For example: "/sample-document.pdf" if you have a PDF in public/sample-document.pdf
  const pdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>React PDF Viewer Component</CardTitle>
          <CardDescription>
            A complete, mobile-responsive PDF viewer built with react-pdf library
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

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">PDF Viewer Demo</h2>
        <PDFViewer 
          pdfUrl={pdfUrl}
          className="border-2 border-dashed border-border"
          initialScale={1.0}
        />
      </div>

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
      pdfUrl="/path-to-your-pdf.pdf"
      className="custom-class" // optional
      initialScale={1.0} // optional, defaults to 1.0
    />
  );
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Required Dependencies:</h4>
              <pre className="bg-muted p-4 rounded-lg text-sm">
{`npm install react-pdf
# or
yarn add react-pdf`}
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

            <div>
              <h4 className="font-semibold mb-2">Adding Your Own PDF:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Place your PDF file in the <code>public</code> folder</li>
                <li>Update the <code>pdfUrl</code> prop to <code>"/your-filename.pdf"</code></li>
                <li>The component will automatically handle loading and display</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PDFViewerDemo;
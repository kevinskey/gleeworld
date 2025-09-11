import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GrandStaves = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = 'Grand Staves | GleeWorld';
    // Meta description
    const desc = 'Grand Staves — Interactive music staves for theory class instruction and whiteboard use.';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (meta) meta.setAttribute('content', desc);

    // Canonical link
    const href = `${window.location.origin}/grand-staves`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    if (link) link.setAttribute('href', href);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Simple Staff Lines Component - No clefs, braces, or brackets
  const StaffLines = ({ className = '' }: { className?: string }) => (
    <svg 
      viewBox="0 0 800 200" 
      className={`w-full border border-border/20 bg-white ${className}`}
      style={{ height: '200px' }}
    >
      {/* Treble Staff Lines - 5 lines */}
      {[0, 1, 2, 3, 4].map(line => (
        <line
          key={`treble-${line}`}
          x1="40"
          y1={40 + line * 15}
          x2="760"
          y2={40 + line * 15}
          stroke="hsl(var(--foreground))"
          strokeWidth="1.5"
        />
      ))}
      
      {/* Bass Staff Lines - 5 lines */}
      {[0, 1, 2, 3, 4].map(line => (
        <line
          key={`bass-${line}`}
          x1="40"
          y1={120 + line * 15}
          x2="760"
          y2={120 + line * 15}
          stroke="hsl(var(--foreground))"
          strokeWidth="1.5"
        />
      ))}
      
      {/* Measure lines - light guidelines every 150px */}
      {[190, 340, 490, 640].map((x, index) => (
        <line
          key={`measure-${index}`}
          x1={x}
          y1="35"
          x2={x}
          y2="180"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="0.5"
          strokeDasharray="2,2"
          opacity="0.3"
        />
      ))}
    </svg>
  );

  return (
    <div className="min-h-screen bg-white print:bg-white">
      {/* Header - hidden when printing */}
      <header className="bg-background border-b border-border p-4 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={handleBack} variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Staff Lines</h1>
              <p className="text-sm text-muted-foreground">Clean staff lines for theory class</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 print:p-2">
        <div className="max-w-7xl mx-auto space-y-6 print:space-y-4">
          {/* Generate 8 staff line sets for a full page */}
          {Array.from({ length: 8 }, (_, index) => (
            <StaffLines key={index} className="print:mb-4" />
          ))}
        </div>
      </main>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:bg-white {
            background-color: white !important;
          }
          
          .print\\:p-2 {
            padding: 0.5rem !important;
          }
          
          .print\\:space-y-4 > * + * {
            margin-top: 1rem !important;
          }
          
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default GrandStaves;
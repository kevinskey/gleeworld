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
      viewBox="0 0 800 220" 
      className={`w-full border border-border/10 bg-white ${className}`}
      style={{ height: '220px' }}
    >
      {/* Treble Staff Lines - 5 lines with proper spacing */}
      {[0, 1, 2, 3, 4].map(line => (
        <line
          key={`treble-${line}`}
          x1="20"
          y1={35 + line * 18}
          x2="780"
          y2={35 + line * 18}
          stroke="hsl(var(--foreground))"
          strokeWidth="1.2"
        />
      ))}
      
      {/* Bass Staff Lines - 5 lines with proper spacing */}
      {[0, 1, 2, 3, 4].map(line => (
        <line
          key={`bass-${line}`}
          x1="20"
          y1={140 + line * 18}
          x2="780"
          y2={140 + line * 18}
          stroke="hsl(var(--foreground))"
          strokeWidth="1.2"
        />
      ))}
      
      {/* Measure lines - very subtle guidelines */}
      {[160, 320, 480, 640].map((x, index) => (
        <line
          key={`measure-${index}`}
          x1={x}
          y1="30"
          x2={x}
          y2="210"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="0.3"
          strokeDasharray="1,3"
          opacity="0.2"
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
        <div className="max-w-7xl mx-auto space-y-8 print:space-y-6">
          {/* Generate 10 staff line sets for a full page */}
          {Array.from({ length: 10 }, (_, index) => (
            <StaffLines key={index} className="print:mb-6" />
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
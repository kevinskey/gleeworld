import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, RotateCcw } from 'lucide-react';

const GrandStaves = () => {
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

  // SVG Grand Staff Component
  const GrandStaff = ({ className = '' }: { className?: string }) => (
    <svg 
      viewBox="0 0 800 200" 
      className={`w-full border border-border/20 bg-white ${className}`}
      style={{ height: '200px' }}
    >
      {/* Treble Clef Staff Lines */}
      {[0, 1, 2, 3, 4].map(line => (
        <line
          key={`treble-${line}`}
          x1="60"
          y1={40 + line * 15}
          x2="740"
          y2={40 + line * 15}
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
        />
      ))}
      
      {/* Bass Clef Staff Lines */}
      {[0, 1, 2, 3, 4].map(line => (
        <line
          key={`bass-${line}`}
          x1="60"
          y1={120 + line * 15}
          x2="740"
          y2={120 + line * 15}
          stroke="hsl(var(--foreground))"
          strokeWidth="1"
        />
      ))}
      
      {/* Brace connecting the staves */}
      <path
        d="M 30 35 Q 20 50 30 65 Q 25 75 25 85 Q 25 95 30 105 Q 20 120 30 135 Q 35 150 40 165"
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth="2"
      />
      
      {/* Treble Clef */}
      <g transform="translate(65, 45)">
        <path
          d="M 0 30 Q -5 25 0 20 Q 10 15 15 25 Q 20 35 15 45 Q 10 55 0 50 Q -10 45 -5 35 Q 0 25 10 30 Q 15 35 10 40 Q 5 45 0 40 Q -5 35 0 30 M 10 5 Q 15 0 20 5 Q 25 15 20 25 Q 15 35 5 30 Q -5 25 0 15 Q 5 5 15 10 Q 20 15 15 20"
          fill="hsl(var(--foreground))"
        />
      </g>
      
      {/* Bass Clef */}
      <g transform="translate(65, 125)">
        <circle cx="0" cy="15" r="8" fill="hsl(var(--foreground))"/>
        <circle cx="0" cy="35" r="8" fill="hsl(var(--foreground))"/>
        <circle cx="12" cy="20" r="2" fill="hsl(var(--foreground))"/>
        <circle cx="12" cy="30" r="2" fill="hsl(var(--foreground))"/>
      </g>
      
      {/* Measure lines - light guidelines */}
      {[200, 350, 500, 650].map((x, index) => (
        <line
          key={`measure-${index}`}
          x1={x}
          y1="35"
          x2={x}
          y2="165"
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Grand Staves</h1>
            <p className="text-sm text-muted-foreground">Theory class whiteboard staves</p>
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
          {/* Generate 8 grand staves for a full page */}
          {Array.from({ length: 8 }, (_, index) => (
            <GrandStaff key={index} className="print:mb-4" />
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
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const GrandStaffClassroom = () => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  useEffect(() => {
    document.title = 'Grand Staff Classroom | GleeWorld Academy';
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Simple 5-line staff component
  const Staff = () => (
    <svg viewBox="0 0 800 80" className="w-full h-auto">
      {/* 5 horizontal lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={`line-${i}`}
          x1="0"
          y1={20 + i * 15}
          x2="800"
          y2={20 + i * 15}
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
    </svg>
  );

  return (
    <div className="min-h-screen bg-white p-2 sm:p-4 md:p-8 print:p-0">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4 sm:mb-6 print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <Link to="/music-theory-fundamentals">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto text-gray-700 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Fundamentals
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={toggleFullscreen} className="w-full sm:w-auto text-gray-700 hover:text-gray-900">
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4 mr-2" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 mr-2" />
                Fullscreen
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content - Music Staves */}
      <div className="max-w-7xl mx-auto">
        {/* Multiple staves for classroom use */}
        <div className="space-y-12 sm:space-y-16 text-gray-800">
          {[...Array(12)].map((_, index) => (
            <div key={index}>
              <Staff />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GrandStaffClassroom;

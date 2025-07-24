import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

export const SimpleHomePage = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  useEffect(() => {
    console.log('SimpleHomePage: Component mounted');
    setDebugInfo(prev => [...prev, 'Component mounted']);
    
    const timer = setTimeout(() => {
      console.log('SimpleHomePage: Timer completed');
      setDebugInfo(prev => [...prev, 'Timer completed after 2s']);
    }, 2000);

    return () => {
      clearTimeout(timer);
      console.log('SimpleHomePage: Component unmounted');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GleeWorld Debug Page
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Troubleshooting the home page loading issue
          </p>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <div className="text-left space-y-2">
              <p><strong>User:</strong> {user ? `Logged in (${user.id})` : 'Not logged in'}</p>
              <p><strong>Current URL:</strong> {window.location.href}</p>
              <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Component Events</h2>
            <div className="text-left space-y-1">
              {debugInfo.map((info, index) => (
                <p key={index} className="text-sm text-gray-600">
                  {index + 1}. {info}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Link to="/landing">
                <Button size="lg" variant="default">
                  Try Original Landing Page
                </Button>
              </Link>
            </div>

            <div>
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" variant="outline">
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
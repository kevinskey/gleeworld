
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ContractErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ContractErrorBoundaryProps {
  children: React.ReactNode;
}

export class ContractErrorBoundary extends React.Component<ContractErrorBoundaryProps, ContractErrorBoundaryState> {
  constructor(props: ContractErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ContractErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ContractErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-red-700 mb-2">Something went wrong</h2>
              <p className="text-red-600 mb-4">There was an error rendering the contract content.</p>
              <div className="text-sm text-red-500 bg-red-100 p-3 rounded">
                {this.state.error?.message || 'Unknown error occurred'}
              </div>
            </div>
            
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

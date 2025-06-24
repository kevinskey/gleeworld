
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";

interface HeaderProps {
  displayName: string;
  onSignOut: () => void;
  onNewContract: () => void;
}

export const Header = ({ displayName, onSignOut, onNewContract }: HeaderProps) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Manager</h1>
            <p className="text-sm text-gray-500">Welcome back, {displayName}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              onClick={onNewContract}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
            
            <Button 
              onClick={onSignOut} 
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

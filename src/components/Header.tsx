
import { Button } from "@/components/ui/button";
import { FileText, Settings, LogOut, Plus } from "lucide-react";

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
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">ContractFlow</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {displayName}</span>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            <Button size="sm" onClick={onNewContract}>
              <Plus className="h-4 w-4 mr-2" />
              New Contract
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

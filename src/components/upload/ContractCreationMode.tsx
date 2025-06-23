
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, Plus } from "lucide-react";

interface ContractCreationModeProps {
  mode: 'upload' | 'create' | 'template';
  onModeChange: (mode: 'upload' | 'create' | 'template') => void;
  hasTemplate: boolean;
}

export const ContractCreationMode = ({ mode, onModeChange, hasTemplate }: ContractCreationModeProps) => {
  if (hasTemplate) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <FileText className="h-5 w-5" />
            Template Applied
          </CardTitle>
          <CardDescription>
            You're using a template. You can edit the content below or select a different creation method.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="creation-mode">Creation Method</Label>
            <Select value={mode} onValueChange={onModeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose how to create your contract" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template">Use Template (Current)</SelectItem>
                <SelectItem value="create">Create New Contract</SelectItem>
                <SelectItem value="upload">Upload Document</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="creation-mode">How would you like to create your contract?</Label>
        <Select value={mode} onValueChange={onModeChange}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Choose creation method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="create">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New Contract
              </div>
            </SelectItem>
            <SelectItem value="upload">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Document
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === 'create' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-700">
              <Plus className="h-5 w-5" />
              <span className="font-medium">Create New Contract</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Start with a blank contract and build it from scratch
            </p>
          </CardContent>
        </Card>
      )}

      {mode === 'upload' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-700">
              <Upload className="h-5 w-5" />
              <span className="font-medium">Upload Document</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Upload an existing PDF or Word document
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

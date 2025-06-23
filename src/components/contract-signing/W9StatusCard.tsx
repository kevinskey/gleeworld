
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useParams } from "react-router-dom";

interface W9StatusCardProps {
  w9Status: 'required' | 'completed' | 'not_required';
  w9Form?: any;
  onW9Complete?: () => void;
  onDownloadCombinedPDF?: () => void;
  canDownloadPDF: boolean;
}

export const W9StatusCard = ({ 
  w9Status, 
  w9Form, 
  onW9Complete, 
  onDownloadCombinedPDF,
  canDownloadPDF 
}: W9StatusCardProps) => {
  const { contractId } = useParams();

  if (w9Status === 'not_required') return null;

  const getStatusIcon = () => {
    switch (w9Status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'required':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (w9Status) {
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'required':
        return <Badge variant="destructive">Required</Badge>;
      default:
        return <Badge variant="outline">Not Required</Badge>;
    }
  };

  const handleW9Complete = () => {
    if (contractId) {
      // Navigate to W9 form with return parameter
      window.location.href = `/w9-form?return=${contractId}`;
    } else if (onW9Complete) {
      onW9Complete();
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          <span>W9 Tax Form</span>
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          {w9Status === 'completed' 
            ? "Your W9 form is on file and will be included with your contract."
            : "You must complete a W9 form before signing this contract."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {w9Status === 'completed' && w9Form && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Submitted on: {new Date(w9Form.submitted_at).toLocaleDateString()}
            </p>
            {canDownloadPDF && (
              <Button 
                onClick={onDownloadCombinedPDF}
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Contract + W9 PDF
              </Button>
            )}
          </div>
        )}
        {w9Status === 'required' && (
          <Button onClick={handleW9Complete} variant="default" size="sm">
            Complete W9 Form
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

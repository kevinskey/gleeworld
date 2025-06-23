
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  // W9 functionality has been removed - this component now returns null
  return null;
};

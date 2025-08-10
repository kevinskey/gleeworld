import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CongratulationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CongratulationsDialog: React.FC<CongratulationsDialogProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const navigate = useNavigate();

  const handleContinue = () => {
    onOpenChange(false);
    navigate("/dashboard/auditioner");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm sm:max-w-md mx-4 text-center">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          </div>
          <DialogTitle className="text-2xl font-bold text-primary">
            Congratulations!
          </DialogTitle>
          <div className="space-y-3">
            <p className="text-lg font-semibold">
              Your audition is scheduled with the
            </p>
            <p className="text-xl font-bold text-primary bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              World Renowned Spelman College Glee Club
            </p>
            <p className="text-muted-foreground">
              We look forward to hearing your beautiful voice and welcoming you to our musical family.
            </p>
          </div>
        </DialogHeader>
        <div className="mt-6">
          <Button 
            onClick={handleContinue} 
            className="w-full"
            size="lg"
          >
            Go to Auditioner Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
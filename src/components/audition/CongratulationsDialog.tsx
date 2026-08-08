import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getOrgName } from '@/lib/orgName';

interface CongratulationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Set only on the anonymous submit path (public-intake). 'existing' means
  // the email already had an account — the visitor's application still went
  // through, but they should sign in with their existing credentials rather
  // than assume the password they just typed took effect.
  accountStatus?: 'created' | 'existing';
}

export const CongratulationsDialog: React.FC<CongratulationsDialogProps> = ({
  open,
  onOpenChange,
  accountStatus,
}) => {
  const navigate = useNavigate();

  const handleContinue = () => {
    onOpenChange(false);
    navigate("/auditioner");
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
              World Renowned {getOrgName()}
            </p>
            <p className="text-muted-foreground">
              We look forward to hearing your beautiful voice and welcoming you to our musical family.
            </p>
            {accountStatus === 'existing' && (
              <p className="text-sm text-muted-foreground">
                We found an existing account for that email address —{' '}
                <Link to="/auth" className="underline font-medium text-foreground">
                  sign in
                </Link>{' '}
                to track your application.
              </p>
            )}
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
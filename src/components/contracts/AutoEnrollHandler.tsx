
import { useEffect } from "react";
import { useAutoEnrollUser } from "@/hooks/useAutoEnrollUser";

interface AutoEnrollHandlerProps {
  recipientEmail: string;
  recipientName?: string;
  contractId?: string;
  onEnrollmentComplete?: (enrolled: boolean, userId?: string) => void;
}

export const AutoEnrollHandler = ({ 
  recipientEmail, 
  recipientName, 
  contractId,
  onEnrollmentComplete 
}: AutoEnrollHandlerProps) => {
  const { autoEnrollUser } = useAutoEnrollUser();

  useEffect(() => {
    const handleAutoEnrollment = async () => {
      if (!recipientEmail) return;

      try {
        const result = await autoEnrollUser(recipientEmail, recipientName, contractId);
        
        if (onEnrollmentComplete) {
          onEnrollmentComplete(result.enrolled, result.user_id);
        }
      } catch (error) {
        console.error('Auto-enrollment failed:', error);
        if (onEnrollmentComplete) {
          onEnrollmentComplete(false);
        }
      }
    };

    handleAutoEnrollment();
  }, [recipientEmail, recipientName, contractId, autoEnrollUser, onEnrollmentComplete]);

  return null; // This component doesn't render anything
};

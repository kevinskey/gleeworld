
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export const LoadingSpinner = ({
  size = "md",
  text = "Loading...",
  className = "",
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className={`flex items-center justify-center py-4 sm:py-6 md:py-8 text-foreground ${className}`}>
      <div className="text-center px-2">
        <Loader2
          className={`${sizeClasses[size]} animate-spin text-current mx-auto mb-2 sm:mb-3 md:mb-4`}
        />
        <p className={`${textSizeClasses[size]} leading-relaxed text-current opacity-70`}>{text}</p>
      </div>
    </div>
  );
};

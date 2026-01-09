import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode;
  showBackButton?: boolean;
  backTo?: string;
  backgroundVariant?: "default" | "gradient" | "white";
}

export const PageHeader = ({ 
  title, 
  description, 
  children, 
  showBackButton = true,
  backTo = "/dashboard",
  backgroundVariant = "default"
}: PageHeaderProps) => {
  const navigate = useNavigate();

  const getBackgroundClass = () => {
    switch (backgroundVariant) {
      case "gradient":
        return "bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700";
      case "white":
        return "bg-white border-b border-gray-200";
      default:
        return "bg-white/10 backdrop-blur-sm border-b border-white/20";
    }
  };

  const getTextColorClass = () => {
    switch (backgroundVariant) {
      case "gradient":
        return "text-white";
      case "white":
        return "text-gray-900";
      default:
        return "text-gray-900";
    }
  };

  const getDescriptionColorClass = () => {
    switch (backgroundVariant) {
      case "gradient":
        return "text-white/80";
      case "white":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getButtonClass = () => {
    switch (backgroundVariant) {
      case "gradient":
        return "bg-white/20 hover:bg-white/30 text-white border-white/20";
      case "white":
        return "hover:bg-gray-50 text-gray-700";
      default:
        return "hover:bg-white/10 text-gray-700";
    }
  };

  return (
    <div className={`${getBackgroundClass()} rounded-3xl shadow-lg h-12 sm:h-14 px-3 sm:px-6 flex items-center`}>
      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backTo)}
              className={`flex items-center gap-1 h-8 px-2 ${getButtonClass()}`}
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}
          
          <div>
            <h1 className={`text-sm sm:text-xl md:text-2xl font-medium ${getTextColorClass()}`}>
              {title}
            </h1>
            {description && (
              <p className={`text-xs sm:text-sm ${getDescriptionColorClass()}`}>
                {description}
              </p>
            )}
          </div>
        </div>
        
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
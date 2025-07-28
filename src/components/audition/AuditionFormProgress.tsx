import { useAuditionForm } from "./AuditionFormProvider";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function AuditionFormProgress() {
  const { currentPage, totalPages } = useAuditionForm();

  const pageNames = [
    "Basic Info",
    "Musical Background", 
    "Music Skills",
    "Personal Info",
    "Schedule & Photo"
  ];

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page, index) => (
          <div key={page} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors",
                page < currentPage
                  ? "bg-green-500 border-green-500 text-white"
                  : page === currentPage
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-gray-100 border-gray-300 text-gray-500"
              )}
            >
              {page < currentPage ? (
                <Check className="w-4 h-4" />
              ) : (
                page
              )}
            </div>
            
            <div className="ml-2 hidden sm:block">
              <p className={cn(
                "text-xs font-medium",
                page <= currentPage ? "text-gray-900" : "text-gray-500"
              )}>
                {pageNames[index]}
              </p>
            </div>
            
            {index < totalPages - 1 && (
              <div 
                className={cn(
                  "h-px w-8 sm:w-16 mx-2 sm:mx-4 transition-colors",
                  page < currentPage ? "bg-green-500" : "bg-gray-300"
                )}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Step {currentPage} of {totalPages}
        </p>
      </div>
    </div>
  );
}
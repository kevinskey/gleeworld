import { useAuditionForm } from "./AuditionFormProvider";
import type { AuditionPageId } from "./auditionPages";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Labels keyed by page id, not position — the account step moved to the end
// of the anonymous flow (auditionPages.ts) and isn't shown at all for
// signed-in visitors. Deriving from `pages` here instead of a hardcoded
// array keeps this indicator honest about whichever order is actually
// rendered, rather than a second, independently-maintained copy of it.
const PAGE_LABELS: Record<AuditionPageId, string> = {
  basic: "Basic Info",
  background: "Musical Background",
  skills: "Music Skills",
  personal: "Personal Info",
  scheduling: "Schedule & Photo",
  account: "Create Account",
};

export function AuditionFormProgress() {
  const { currentPage, totalPages, pages } = useAuditionForm();

  const pageNames = pages.map((pageId) => PAGE_LABELS[pageId]);

  return (
    <div className="w-full mb-3 md:mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page, index) => (
          <div key={page} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full border-2 text-xs md:text-sm font-medium transition-colors",
                page < currentPage
                  ? "bg-green-500 border-green-500 text-white"
                  : page === currentPage
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-gray-100 border-gray-300 text-gray-500"
              )}
            >
              {page < currentPage ? (
                <Check className="w-3 h-3 md:w-4 md:h-4" />
              ) : (
                page
              )}
            </div>
            
            <div className="ml-1 md:ml-2 hidden sm:block">
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
                  "h-px w-4 sm:w-8 md:w-16 mx-1 sm:mx-2 md:mx-4 transition-colors",
                  page < currentPage ? "bg-green-500" : "bg-gray-300"
                )}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-2 md:mt-4 text-center">
        <p className="text-xs md:text-sm text-gray-600">
          Step {currentPage} of {totalPages}
        </p>
      </div>
    </div>
  );
}
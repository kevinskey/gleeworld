import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface SheetMusicSeekBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export const SheetMusicSeekBar = ({
  currentPage,
  totalPages,
  onPageChange,
  onPreviousPage,
  onNextPage,
}: SheetMusicSeekBarProps) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="bg-background border-t border-border p-4">
      <div className="flex items-center justify-center space-x-4 max-w-2xl mx-auto">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Info */}
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </div>

        {/* Seek Slider */}
        <div className="flex-1 max-w-md">
          <Slider
            value={[currentPage]}
            onValueChange={(value) => onPageChange(value[0])}
            max={totalPages}
            min={1}
            step={1}
            className="w-full"
          />
        </div>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
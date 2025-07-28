import { Button } from "@/components/ui/button";

interface MusicStaffMenuProps {
  onClick?: () => void;
  className?: string;
}

export const MusicStaffMenu = ({ onClick, className = "" }: MusicStaffMenuProps) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={`text-gray-700 hover:bg-gray-100/50 transition-all duration-200 p-2 ${className}`}
      onClick={onClick}
    >
      <div className="flex flex-col justify-center items-center w-6 h-6 gap-1">
        {/* 5 lines like music staff */}
        <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
        <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
        <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
        <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
        <div className="w-7 h-0.5 bg-current transition-all duration-200 hover:w-8"></div>
      </div>
      <span className="sr-only">Toggle menu</span>
    </Button>
  );
};
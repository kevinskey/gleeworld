import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  className
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [timeValue, setTimeValue] = React.useState(() =>
    value ? format(value, "HH:mm") : "12:00"
  );

  // Sync timeValue when value changes externally, but don't fight user typing
  React.useEffect(() => {
    if (value) setTimeValue(format(value, "HH:mm"));
  }, [value?.getTime()]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes] = timeValue.split(":");
      selectedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onChange(selectedDate);
      setOpen(false);
    }
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    const [hours, minutes] = time.split(":");
    const base = value ? new Date(value) : new Date();
    base.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    onChange(base);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPp") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={4}>
        <div className="p-2 border-b">
          <Input
            type="time"
            value={timeValue}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full h-8 text-sm"
          />
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          initialFocus
          className="pointer-events-auto p-2 text-sm"
          classNames={{
            months: "flex flex-col space-y-2",
            month: "space-y-2",
            caption: "flex justify-center pt-1 relative items-center mb-2",
            caption_label: "text-sm font-medium",
            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            table: "w-full border-collapse",
            head_row: "flex",
            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-xs",
            row: "flex w-full mt-1",
            cell: "relative w-8 h-8 p-0 text-center text-sm focus-within:relative focus-within:z-20",
            day: "h-8 w-8 p-0 font-normal text-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground rounded-md",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground font-semibold",
            day_outside: "text-muted-foreground opacity-50",
            day_disabled: "text-muted-foreground opacity-50",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

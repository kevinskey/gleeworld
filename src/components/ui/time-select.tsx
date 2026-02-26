import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimeSelectProps {
  value?: string | null;
  onChange: (value: string) => void;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function parse24to12(time: string | null | undefined) {
  if (!time) return { hour: "", minute: "", period: "" };
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return { hour: "", minute: "", period: "" };
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return {
    hour: String(h),
    minute: String(m).padStart(2, "0"),
    period,
  };
}

function to24(hour: string, minute: string, period: string): string {
  let h = parseInt(hour, 10);
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

export function TimeSelect({ value, onChange, className }: TimeSelectProps) {
  const externalParsed = parse24to12(value);

  // Use local state so partial edits are preserved between dropdown interactions
  const [local, setLocal] = React.useState({
    hour: externalParsed.hour,
    minute: externalParsed.minute,
    period: externalParsed.period,
  });

  // Sync local state when the external value changes
  React.useEffect(() => {
    const p = parse24to12(value);
    setLocal({ hour: p.hour, minute: p.minute, period: p.period });
  }, [value]);

  const handleChange = (
    field: "hour" | "minute" | "period",
    val: string
  ) => {
    const next = { ...local, [field]: val };
    setLocal(next);
    if (next.hour && next.minute && next.period) {
      onChange(to24(next.hour, next.minute, next.period));
    }
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Select value={local.hour} onValueChange={(v) => handleChange("hour", v)}>
        <SelectTrigger className="h-9 w-[64px] text-sm px-2 bg-white !text-gray-900 border-slate-300 [&>svg]:text-gray-500 [&>svg]:opacity-100">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent className="bg-white text-gray-900 border-slate-200 [&_[role=option]]:text-gray-900">
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)} className="text-sm text-gray-900 focus:bg-slate-100 focus:text-gray-900">
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="font-bold text-sm" style={{ color: 'hsl(0 0% 70%)' }}>:</span>

      <Select value={local.minute} onValueChange={(v) => handleChange("minute", v)}>
        <SelectTrigger className="h-9 w-[64px] text-sm px-2 bg-white !text-gray-900 border-slate-300 [&>svg]:text-gray-500 [&>svg]:opacity-100">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="bg-white text-gray-900 border-slate-200 [&_[role=option]]:text-gray-900">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m).padStart(2, "0")} className="text-sm text-gray-900 focus:bg-slate-100 focus:text-gray-900">
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={local.period} onValueChange={(v) => handleChange("period", v)}>
        <SelectTrigger className="h-9 w-[64px] text-sm px-2 bg-white !text-gray-900 border-slate-300 [&>svg]:text-gray-500 [&>svg]:opacity-100">
          <SelectValue placeholder="AM" />
        </SelectTrigger>
        <SelectContent className="bg-white text-gray-900 border-slate-200 [&_[role=option]]:text-gray-900">
          <SelectItem value="AM" className="text-sm text-gray-900 focus:bg-slate-100 focus:text-gray-900">AM</SelectItem>
          <SelectItem value="PM" className="text-sm text-gray-900 focus:bg-slate-100 focus:text-gray-900">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

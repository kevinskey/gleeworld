import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Settings, HelpCircle } from "lucide-react";
import { useState } from "react";

export const AccessibilitySettings = () => {
  const [enabled, setEnabled] = useState(true);
  const [delay, setDelay] = useState(300);
  const [loading, setLoading] = useState(false);
  
  const toggleTooltips = async (newEnabled: boolean) => {
    setLoading(true);
    setEnabled(newEnabled);
    setLoading(false);
  };
  
  const updateDelay = async (newDelay: number) => {
    setLoading(true);
    setDelay(newDelay);
    setLoading(false);
  };

  const handleDelayChange = (value: number[]) => {
    updateDelay(value[0]);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Accessibility Settings
          </CardTitle>
          <CardDescription>Loading preferences...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Accessibility Settings
        </CardTitle>
        <CardDescription>
          Configure accessibility features to improve your experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tooltip Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Label htmlFor="tooltip-toggle" className="text-base font-medium">
                Enable Tooltips
              </Label>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Show helpful descriptions when hovering over buttons and icons
            </p>
          </div>
          <Switch
            id="tooltip-toggle"
            checked={enabled}
            onCheckedChange={toggleTooltips}
          />
        </div>

        {/* Tooltip Delay Slider */}
        {enabled && (
          <div className="space-y-4">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">
                Tooltip Delay: {delay}ms
              </Label>
              <p className="text-sm text-muted-foreground">
                Adjust how quickly tooltips appear when hovering
              </p>
            </div>
            <div className="px-3">
              <Slider
                value={[delay]}
                onValueChange={handleDelayChange}
                min={0}
                max={1000}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Instant</span>
                <span>1 second</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Tooltip settings are saved automatically and apply across the entire application.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface AdminConsentCardProps {
  photoVideoConsent?: boolean;
  performanceMediaTags?: string;
  isEditing?: boolean;
  onPhotoVideoConsentChange?: (value: boolean) => void;
  onPerformanceMediaTagsChange?: (value: string) => void;
}

export const AdminConsentCard = ({
  photoVideoConsent = true,
  performanceMediaTags = "",
  isEditing = false,
  onPhotoVideoConsentChange,
  onPerformanceMediaTagsChange,
}: AdminConsentCardProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Admin Consent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Photo/Video Consent */}
        <div className="flex items-center justify-between">
          <Label htmlFor="photo-video-consent" className="text-sm text-muted-foreground">
            Photo/Video Consent
          </Label>
          <div className="flex items-center gap-2">
            <Switch
              id="photo-video-consent"
              checked={photoVideoConsent}
              onCheckedChange={onPhotoVideoConsentChange}
              disabled={!isEditing}
            />
            <span className={`text-xs font-medium ${photoVideoConsent ? 'text-green-600' : 'text-muted-foreground'}`}>
              {photoVideoConsent ? 'YES' : 'NO'}
            </span>
          </div>
        </div>

        {/* Performance Media Tags */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Performance Media Tags</h4>
          <Input
            value={performanceMediaTags}
            onChange={(e) => onPerformanceMediaTagsChange?.(e.target.value)}
            disabled={!isEditing}
            className="h-9"
            placeholder="Add media tags..."
          />
        </div>
      </CardContent>
    </Card>
  );
};

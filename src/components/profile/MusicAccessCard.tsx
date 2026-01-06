import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronRight } from "lucide-react";

interface MusicAccessCardProps {
  folderAssignment?: string | number;
  sheetMusicAccess?: string;
  voiceCheckRecord?: string;
  soloRoles?: string;
  isEditing?: boolean;
  onFolderAssignmentChange?: (value: string) => void;
  onVoiceCheckRecordChange?: (value: string) => void;
  onSoloRolesChange?: (value: string) => void;
}

export const MusicAccessCard = ({
  folderAssignment = "25",
  sheetMusicAccess = "Soprano | Folder",
  voiceCheckRecord = "",
  soloRoles = "",
  isEditing = false,
  onFolderAssignmentChange,
  onVoiceCheckRecordChange,
  onSoloRolesChange,
}: MusicAccessCardProps) => {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Music Access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Folder Assignment */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Folder Assignment</h4>
          <Input
            value={folderAssignment?.toString() || ""}
            onChange={(e) => onFolderAssignmentChange?.(e.target.value)}
            disabled={!isEditing}
            className="h-9"
            placeholder="Folder number"
          />
        </div>

        {/* Sheet Music PDF Access */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Sheet Music PDF Access</h4>
          <div className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-background">
            <span className="text-sm text-foreground">{sheetMusicAccess}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Voice Check Record */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Voice Check Record</h4>
          <Input
            value={voiceCheckRecord}
            onChange={(e) => onVoiceCheckRecordChange?.(e.target.value)}
            disabled={!isEditing}
            className="h-9"
            placeholder="Voice check details"
          />
        </div>

        {/* Solo Roles */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Solo Roles</h4>
          <Input
            value={soloRoles}
            onChange={(e) => onSoloRolesChange?.(e.target.value)}
            disabled={!isEditing}
            className="h-9"
            placeholder="List solo roles"
          />
        </div>
      </CardContent>
    </Card>
  );
};

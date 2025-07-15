import { useState } from "react";
import { Search, Music, List, Volume2, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SheetMusicNavProps {
  currentTitle: string;
  onSongSelect: (songId: string) => void;
  onSetlistSelect: (setlistId: string) => void;
  onSearchSelect: (documentId: string) => void;
  onAudioUtilitySelect: (utility: string) => void;
  onToolSelect: (tool: string) => void;
}

export const SheetMusicNav = ({
  currentTitle,
  onSongSelect,
  onSetlistSelect,
  onSearchSelect,
  onAudioUtilitySelect,
  onToolSelect,
}: SheetMusicNavProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Mock data - these would come from your database
  const availableSongs = [
    { id: "1", title: "Ave Maria", composer: "Schubert" },
    { id: "2", title: "Hallelujah", composer: "Cohen" },
    { id: "3", title: "Amazing Grace", composer: "Newton" },
  ];

  const availableSetlists = [
    { id: "1", title: "Christmas Concert 2024", creator: "Admin" },
    { id: "2", title: "Spring Performance", creator: "User" },
  ];

  const recentDocuments = [
    { id: "1", title: "Ave Maria", lastOpened: "2 hours ago" },
    { id: "2", title: "Hallelujah", lastOpened: "1 day ago" },
  ];

  const audioUtilities = [
    { id: "metronome", title: "Metronome", icon: "🎵" },
    { id: "pitch-pipe", title: "Pitch Pipe", icon: "🎼" },
    { id: "tuner", title: "Tuner", icon: "🎹" },
  ];

  const tools = [
    { id: "annotate", title: "Annotations", icon: "✏️" },
    { id: "transpose", title: "Transpose", icon: "🔄" },
    { id: "zoom", title: "Zoom Controls", icon: "🔍" },
  ];

  return (
    <div className="bg-background border-b border-border p-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left Section - Songs */}
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Music className="h-4 w-4" />
                Songs
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 max-h-64 overflow-y-auto">
              {availableSongs.map((song) => (
                <DropdownMenuItem
                  key={song.id}
                  onClick={() => onSongSelect(song.id)}
                  className="flex flex-col items-start"
                >
                  <span className="font-medium">{song.title}</span>
                  <span className="text-xs text-muted-foreground">{song.composer}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Setlists */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <List className="h-4 w-4" />
                Setlists
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 max-h-64 overflow-y-auto">
              {availableSetlists.map((setlist) => (
                <DropdownMenuItem
                  key={setlist.id}
                  onClick={() => onSetlistSelect(setlist.id)}
                  className="flex flex-col items-start"
                >
                  <span className="font-medium">{setlist.title}</span>
                  <span className="text-xs text-muted-foreground">by {setlist.creator}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center Section - Current Title */}
        <div className="flex-1 text-center">
          <h2 className="text-lg font-semibold text-foreground truncate max-w-md mx-auto">
            {currentTitle}
          </h2>
        </div>

        {/* Right Section - Search, Audio, Tools */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <DropdownMenu open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                Search
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <div className="p-2">
                <div className="text-sm font-medium mb-2">Recent Documents</div>
                {recentDocuments.map((doc) => (
                  <DropdownMenuItem
                    key={doc.id}
                    onClick={() => onSearchSelect(doc.id)}
                    className="flex flex-col items-start"
                  >
                    <span className="font-medium">{doc.title}</span>
                    <span className="text-xs text-muted-foreground">{doc.lastOpened}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Audio Utilities */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Volume2 className="h-4 w-4" />
                Audio
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {audioUtilities.map((utility) => (
                <DropdownMenuItem
                  key={utility.id}
                  onClick={() => onAudioUtilitySelect(utility.id)}
                  className="gap-2"
                >
                  <span>{utility.icon}</span>
                  {utility.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tools */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                Tools
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {tools.map((tool) => (
                <DropdownMenuItem
                  key={tool.id}
                  onClick={() => onToolSelect(tool.id)}
                  className="gap-2"
                >
                  <span>{tool.icon}</span>
                  {tool.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
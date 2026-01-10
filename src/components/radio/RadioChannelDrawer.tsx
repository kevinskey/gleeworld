import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Radio,
  Search,
  Plus,
  Check,
  Music2,
  Church,
  Sparkles,
  Bell,
  MapPin,
  Mic,
  Disc,
  Clock,
  Music,
  Users,
  Shield,
  Heart,
  Star,
  Globe,
  Film,
  MoreHorizontal,
  Play,
} from 'lucide-react';
import { type RadioChannel } from '@/hooks/useRadioChannels';
import { type UserRadioPreset } from '@/hooks/useUserRadioPresets';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface RadioChannelDrawerProps {
  channels: RadioChannel[];
  selectedChannel: RadioChannel | null;
  presets: UserRadioPreset[];
  onChannelSelect: (channel: RadioChannel) => void;
  onAddToPreset: (slot: number, channel: RadioChannel) => Promise<boolean>;
  isPlaying: boolean;
}

const getChannelIcon = (iconName: string | null) => {
  switch (iconName) {
    case 'Church': return Church;
    case 'Music2': return Music2;
    case 'Sparkles': return Sparkles;
    case 'Bell': return Bell;
    case 'MapPin': return MapPin;
    case 'Mic': return Mic;
    case 'Disc': return Disc;
    case 'Clock': return Clock;
    case 'Music': return Music;
    case 'Users': return Users;
    case 'Shield': return Shield;
    case 'Heart': return Heart;
    case 'Star': return Star;
    case 'Globe': return Globe;
    case 'Film': return Film;
    default: return Radio;
  }
};

export const RadioChannelDrawer: React.FC<RadioChannelDrawerProps> = ({
  channels,
  selectedChannel,
  presets,
  onChannelSelect,
  onAddToPreset,
  isPlaying,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningChannel, setAssigningChannel] = useState<RadioChannel | null>(null);
  const { user } = useAuth();

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (channel.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group channels by type if available (type field exists on RadioChannel)
  const groupedChannels = filteredChannels.reduce((acc, channel) => {
    const category = channel.type || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(channel);
    return acc;
  }, {} as Record<string, RadioChannel[]>);

  const isChannelInPresets = (channelId: string) => {
    return presets.some(p => p.channel_id === channelId);
  };

  const handleAddToPreset = async (channel: RadioChannel, slot: number) => {
    const success = await onAddToPreset(slot, channel);
    if (success) {
      setAssigningChannel(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[8px] sm:text-[9px] font-bold transition-all",
            "bg-gradient-to-b border shadow-sm",
            "from-zinc-500 to-zinc-700 border-zinc-600 text-zinc-200 hover:from-zinc-400 hover:to-zinc-600"
          )}
          title="Browse all channels"
        >
          <MoreHorizontal className="h-3 w-3 mx-auto" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary" />
            Glee World Radio Channels
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Channel List */}
        <ScrollArea className="h-[calc(100%-8rem)]">
          <div className="space-y-6 pr-4">
            {Object.entries(groupedChannels).map(([category, categoryChannels]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  {category}
                </h3>
                <div className="grid gap-2">
                  {categoryChannels.map((channel) => {
                    const Icon = getChannelIcon(channel.icon);
                    const isSelected = selectedChannel?.id === channel.id;
                    const inPresets = isChannelInPresets(channel.id);

                    return (
                      <div
                        key={channel.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-muted border-border"
                        )}
                        onClick={() => {
                          onChannelSelect(channel);
                          setIsOpen(false);
                        }}
                      >
                        {/* Channel Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Channel Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{channel.name}</span>
                            {isSelected && isPlaying && (
                              <Badge variant="secondary" className="text-xs">
                                <Play className="h-3 w-3 mr-1" />
                                Playing
                              </Badge>
                            )}
                          </div>
                          {channel.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {channel.description}
                            </p>
                          )}
                        </div>

                        {/* Add to Presets Button */}
                        {user && (
                          <div className="flex-shrink-0">
                            {assigningChannel?.id === channel.id ? (
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5, 6].map((slot) => (
                                  <button
                                    key={slot}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToPreset(channel, slot);
                                    }}
                                    className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/80 transition-colors"
                                  >
                                    {slot}
                                  </button>
                                ))}
                              </div>
                            ) : inPresets ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAssigningChannel(channel);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredChannels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No channels found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

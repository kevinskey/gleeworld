import React, { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="end" 
        sideOffset={8}
        className="w-64 p-0 bg-zinc-800 border-zinc-600 shadow-xl z-[10000]"
      >
        {/* Mini Search */}
        <div className="p-2 border-b border-zinc-700">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Compact Channel List */}
        <ScrollArea className="h-48">
          <div className="p-1">
            {filteredChannels.map((channel) => {
              const Icon = getChannelIcon(channel.icon);
              const isSelected = selectedChannel?.id === channel.id;
              const inPresets = isChannelInPresets(channel.id);

              return (
                <div
                  key={channel.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors",
                    isSelected
                      ? "bg-amber-500/20 text-amber-300"
                      : "hover:bg-zinc-700 text-zinc-300"
                  )}
                  onClick={() => {
                    onChannelSelect(channel);
                    setIsOpen(false);
                  }}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                    isSelected ? "bg-amber-500/30" : "bg-zinc-700"
                  )}>
                    <Icon className="h-3 w-3" />
                  </div>

                  {/* Name */}
                  <span className="text-[10px] font-medium truncate flex-1">
                    {channel.name}
                  </span>

                  {/* Playing indicator */}
                  {isSelected && isPlaying && (
                    <Play className="h-2.5 w-2.5 text-green-400 flex-shrink-0" />
                  )}

                  {/* Add to Preset */}
                  {user && (
                    <div className="flex-shrink-0">
                      {assigningChannel?.id === channel.id ? (
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5, 6].map((slot) => (
                            <button
                              key={slot}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToPreset(channel, slot);
                              }}
                              className="w-4 h-4 rounded-full bg-amber-500 text-zinc-900 text-[8px] font-bold hover:bg-amber-400 transition-colors"
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      ) : inPresets ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningChannel(channel);
                          }}
                          className="p-0.5 hover:bg-zinc-600 rounded"
                        >
                          <Plus className="h-3 w-3 text-zinc-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredChannels.length === 0 && (
              <div className="text-center py-4 text-zinc-500 text-[10px]">
                No channels found
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-2 py-1.5 border-t border-zinc-700 text-center">
          <span className="text-[8px] text-zinc-500 uppercase tracking-wider">
            {channels.length} Channels Available
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
};

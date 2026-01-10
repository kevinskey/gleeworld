import React from 'react';
import {
  Radio,
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
} from 'lucide-react';
import { type UserRadioPreset } from '@/hooks/useUserRadioPresets';
import { type RadioChannel } from '@/hooks/useRadioChannels';
import { cn } from '@/lib/utils';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';

interface RadioPresetButtonProps {
  preset: UserRadioPreset | undefined;
  slotNumber: number;
  isSelected: boolean;
  isLoading: boolean;
  onClick: () => void;
}

const getChannelIcon = (iconName: string | null | undefined) => {
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

export const RadioPresetButton: React.FC<RadioPresetButtonProps> = ({
  preset,
  slotNumber,
  isSelected,
  isLoading,
  onClick,
}) => {
  const channel = preset?.channel;
  const Icon = channel ? getChannelIcon(channel.icon) : Radio;
  const channelName = channel?.name || `Preset ${slotNumber}`;

  return (
    <EnhancedTooltip content={channelName}>
      <button
        onClick={onClick}
        disabled={isLoading || !channel}
        className={cn(
          "w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[8px] sm:text-[9px] font-bold transition-all flex items-center justify-center",
          "bg-gradient-to-b border shadow-sm",
          isSelected
            ? "from-amber-400 to-amber-600 border-amber-700 text-amber-900 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
            : channel
              ? "from-zinc-500 to-zinc-700 border-zinc-600 text-zinc-200 hover:from-zinc-400 hover:to-zinc-600"
              : "from-zinc-600 to-zinc-800 border-zinc-700 text-zinc-400 opacity-50 cursor-not-allowed"
        )}
      >
        {channel ? (
          <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        ) : (
          slotNumber
        )}
      </button>
    </EnhancedTooltip>
  );
};

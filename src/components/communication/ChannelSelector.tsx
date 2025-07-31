import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { COMMUNICATION_CHANNELS } from '@/types/communication';
import { Send, Mail, MessageSquare, Smartphone, Users } from 'lucide-react';

interface ChannelSelectorProps {
  selectedChannels: string[];
  onChannelToggle: (channelId: string) => void;
  recipientCount: number;
}

export const ChannelSelector = ({
  selectedChannels,
  onChannelToggle,
  recipientCount
}: ChannelSelectorProps) => {
  const getChannelIcon = (channelId: string) => {
    switch (channelId) {
      case 'email': return <Mail className="h-5 w-5" />;
      case 'mass_email': return <Users className="h-5 w-5" />;
      case 'sms': return <Smartphone className="h-5 w-5" />;
      case 'in_app': return <MessageSquare className="h-5 w-5" />;
      default: return <Send className="h-5 w-5" />;
    }
  };

  const getEstimatedCost = (channelId: string) => {
    if (channelId === 'sms') {
      const cost = recipientCount * 0.01; // Approximate SMS cost
      return `~$${cost.toFixed(2)}`;
    }
    return 'Free';
  };

  const getDeliveryTime = (channelId: string) => {
    switch (channelId) {
      case 'in_app': return 'Instant';
      case 'email': return '< 1 min';
      case 'mass_email': return '< 5 min';
      case 'sms': return '< 30 sec';
      default: return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Delivery Channels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {COMMUNICATION_CHANNELS.map((channel) => (
            <div 
              key={channel.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedChannels.includes(channel.id) 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-muted-foreground'
              } ${!channel.enabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={channel.id}
                  checked={selectedChannels.includes(channel.id)}
                  onCheckedChange={() => onChannelToggle(channel.id)}
                  disabled={!channel.enabled}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {getChannelIcon(channel.id)}
                    <label
                      htmlFor={channel.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {channel.label}
                    </label>
                    {!channel.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {channel.description}
                  </p>
                  
                  {channel.enabled && recipientCount > 0 && (
                    <div className="flex gap-4 text-xs">
                      <span className="text-green-600">
                        📞 {getDeliveryTime(channel.id)}
                      </span>
                      <span className="text-blue-600">
                        💰 {getEstimatedCost(channel.id)}
                      </span>
                      {channel.id === 'sms' && (
                        <span className="text-orange-600">
                          📏 160 char limit
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedChannels.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select at least one delivery channel</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
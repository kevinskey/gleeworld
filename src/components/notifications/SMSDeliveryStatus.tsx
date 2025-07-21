
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Check, X, Clock, AlertCircle } from 'lucide-react';

interface SMSDeliveryStatusProps {
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  errorMessage?: string;
  sentAt?: string;
  deliveredAt?: string;
}

const SMSDeliveryStatus: React.FC<SMSDeliveryStatusProps> = ({
  status,
  errorMessage,
  sentAt,
  deliveredAt
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-3 w-3" />,
          label: 'Pending',
          variant: 'secondary' as const,
          className: 'text-yellow-600 bg-yellow-50'
        };
      case 'sent':
        return {
          icon: <MessageSquare className="h-3 w-3" />,
          label: 'Sent',
          variant: 'default' as const,
          className: 'text-blue-600 bg-blue-50'
        };
      case 'delivered':
        return {
          icon: <Check className="h-3 w-3" />,
          label: 'Delivered',
          variant: 'default' as const,
          className: 'text-green-600 bg-green-50'
        };
      case 'failed':
        return {
          icon: <X className="h-3 w-3" />,
          label: 'Failed',
          variant: 'destructive' as const,
          className: 'text-red-600 bg-red-50'
        };
      default:
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Unknown',
          variant: 'secondary' as const,
          className: 'text-gray-600 bg-gray-50'
        };
    }
  };

  const config = getStatusConfig();
  
  return (
    <div className="space-y-2">
      <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        SMS {config.label}
      </Badge>
      
      {status === 'failed' && errorMessage && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {errorMessage}
        </p>
      )}
      
      {sentAt && (
        <p className="text-xs text-muted-foreground">
          Sent: {new Date(sentAt).toLocaleString()}
        </p>
      )}
      
      {deliveredAt && (
        <p className="text-xs text-muted-foreground">
          Delivered: {new Date(deliveredAt).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default SMSDeliveryStatus;

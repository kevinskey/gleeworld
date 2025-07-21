import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SMSDeliveryStatusProps {
  notification_id: string;
  delivery_method: string;
}

interface DeliveryStatus {
  status: string;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
  external_id?: string;
}

const SMSDeliveryStatus: React.FC<SMSDeliveryStatusProps> = ({
  notification_id,
  delivery_method
}) => {
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveryStatus();
  }, [notification_id, delivery_method]);

  const loadDeliveryStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_notification_delivery_log' as any)
        .select('*')
        .eq('notification_id', notification_id)
        .eq('delivery_method', delivery_method)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setDeliveryStatus(data as any);
    } catch (error) {
      console.error('Error loading delivery status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return <div className="animate-pulse h-4 w-20 bg-gray-200 rounded"></div>;
  }

  if (!deliveryStatus) {
    return <Badge variant="outline">Unknown Status</Badge>;
  }

  return (
    <div className="flex items-center gap-2">
      {getStatusIcon(deliveryStatus.status)}
      <Badge className={getStatusColor(deliveryStatus.status)}>
        {deliveryStatus.status.toUpperCase()}
      </Badge>
      {deliveryStatus.external_id && (
        <span className="text-xs text-muted-foreground font-mono">
          ID: {deliveryStatus.external_id.substring(0, 8)}...
        </span>
      )}
    </div>
  );
};

export default SMSDeliveryStatus;
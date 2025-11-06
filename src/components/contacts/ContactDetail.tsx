import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Activity, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ContactDetailProps {
  contactId: string;
  onBack: () => void;
}

export const ContactDetail = ({ contactId, onBack }: ContactDetailProps) => {
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContact();
  }, [contactId]);

  const fetchContact = async () => {
    try {
      const { data, error } = await supabase
        .from('glee_club_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) throw error;
      setContact(data);
    } catch (error: any) {
      toast.error('Failed to load contact: ' + error.message);
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFullName = () => {
    if (!contact) return 'N/A';
    if (contact.display_name) return contact.display_name;
    const parts = [contact.FirstName, contact.LastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'N/A';
  };

  const getLocation = () => {
    if (!contact) return 'N/A';
    const parts = [contact.address, contact.city, contact.state, contact.zip].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Unsubscribed':
        return 'bg-gray-500';
      case 'Bounced':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading contact...</p>
        </CardContent>
      </Card>
    );
  }

  if (!contact) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Contact not found</p>
          <Button onClick={onBack} className="mt-4">Back to List</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to List
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{getFullName()}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 font-mono">{contact.Email}</p>
            </div>
            <Badge className={getStatusColor(contact.Status)}>
              {contact.Status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-muted-foreground">First Name</p>
              <p>{contact.FirstName || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-muted-foreground">Last Name</p>
              <p>{contact.LastName || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-muted-foreground">Display Name</p>
              <p>{contact.display_name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-muted-foreground">Graduation Year</p>
              <p>{contact.class || 'N/A'}</p>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </p>
                <p>{contact.phone || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location
                </p>
                <p>{getLocation()}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Email Metrics */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Email Metrics
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">{contact.TotalSent}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Opened</p>
                <p className="text-2xl font-bold">{contact.TotalOpened}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Clicked</p>
                <p className="text-2xl font-bold">{contact.TotalClicked}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold">{contact.TotalFailed}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Last Sent</p>
                <p>{formatDate(contact.LastSent)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Last Opened</p>
                <p>{formatDate(contact.LastOpened)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Last Clicked</p>
                <p>{formatDate(contact.LastClicked)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Last Failed</p>
                <p>{formatDate(contact.LastFailed)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status & Dates */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Status & Tracking
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Status Change Date</p>
                <p>{formatDate(contact.StatusChangeDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Date Added</p>
                <p>{formatDate(contact.DateAdded)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Date Updated</p>
                <p>{formatDate(contact.DateUpdated)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Last Update (custom)</p>
                <p>{formatDate(contact.last_update)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Source</p>
                <p>{contact.Source || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Created From IP</p>
                <p className="font-mono text-xs">{contact.CreatedFromIP || 'N/A'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Consent */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Consent & Compliance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Consent Date</p>
                <p>{formatDate(contact.ConsentDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Consent IP</p>
                <p className="font-mono text-xs">{contact.ConsentIP || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-muted-foreground">Consent Tracking</p>
                <p>{contact.ConsentTracking === null ? 'N/A' : contact.ConsentTracking ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          {(contact.UnsubscribeReason || contact.UnsubscribeReasonNotes) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold">Unsubscribe Information</h3>
                {contact.UnsubscribeReason && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-muted-foreground">Reason</p>
                    <p>{contact.UnsubscribeReason}</p>
                  </div>
                )}
                {contact.UnsubscribeReasonNotes && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-muted-foreground">Notes</p>
                    <p className="text-sm">{contact.UnsubscribeReasonNotes}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {(contact.ErrorCode || contact.FriendlyErrorMessage) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-red-600">Error Information</h3>
                {contact.ErrorCode && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-muted-foreground">Error Code</p>
                    <p className="font-mono text-sm">{contact.ErrorCode}</p>
                  </div>
                )}
                {contact.FriendlyErrorMessage && (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-muted-foreground">Error Message</p>
                    <p className="text-sm">{contact.FriendlyErrorMessage}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

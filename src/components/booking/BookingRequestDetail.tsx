import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, MapPin, Clock, Users, DollarSign, Music, Settings, 
  Plane, Camera, FileText, Mail, Phone, Globe, CheckCircle, 
  XCircle, AlertCircle, Eye 
} from 'lucide-react';
import { format } from 'date-fns';

interface BookingRequest {
  id: string;
  organization_name: string;
  contact_person_name: string;
  contact_title?: string;
  contact_email: string;
  contact_phone: string;
  website?: string;
  event_name: string;
  event_description?: string;
  event_date_start: string;
  event_date_end?: string;
  performance_time?: string;
  performance_duration: string;
  venue_name: string;
  venue_address: string;
  venue_type: string;
  expected_attendance?: number;
  theme_occasion?: string;
  stage_dimensions?: string;
  sound_system_available: boolean;
  sound_system_description?: string;
  lighting_available: boolean;
  lighting_description?: string;
  piano_available: boolean;
  piano_type?: string;
  dressing_rooms_available: boolean;
  rehearsal_time_provided?: string;
  load_in_soundcheck_time?: string;
  av_capabilities?: string;
  honorarium_offered: boolean;
  honorarium_amount?: number;
  travel_expenses_covered?: string[];
  lodging_provided: boolean;
  lodging_nights?: number;
  meals_provided: boolean;
  dietary_restrictions?: string;
  preferred_arrival_point?: string;
  event_recorded_livestreamed: boolean;
  recording_description?: string;
  photo_video_permission: boolean;
  promotional_assets_requested?: string[];
  formal_contract_required: boolean;
  notes_for_director?: string;
  notes_for_choir?: string;
  how_heard_about_us?: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'declined';
  created_at: string;
}

interface Props {
  request: BookingRequest;
  onStatusUpdate: (id: string, status: string) => void;
}

export const BookingRequestDetail: React.FC<Props> = ({ request, onStatusUpdate }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'declined': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, MMMM dd, yyyy');
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'EEEE, MMMM dd, yyyy \'at\' h:mm a');
  };

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold">{request.event_name}</h3>
          <p className="text-muted-foreground">{request.organization_name}</p>
          <p className="text-sm text-muted-foreground">
            Submitted {format(new Date(request.created_at), 'PPp')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(request.status)}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
          <Select 
            value={request.status} 
            onValueChange={(value) => onStatusUpdate(request.id, value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium">{request.contact_person_name}</p>
            {request.contact_title && (
              <p className="text-sm text-muted-foreground">{request.contact_title}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${request.contact_email}`} className="text-primary hover:underline">
                {request.contact_email}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${request.contact_phone}`} className="text-primary hover:underline">
                {request.contact_phone}
              </a>
            </div>
            {request.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a 
                  href={request.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {request.website}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Event Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.event_description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground">{request.event_description}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Event Date</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(request.event_date_start)}
                  {request.event_date_end && (
                    <> to {formatDate(request.event_date_end)}</>
                  )}
                </p>
              </div>
            </div>

            {request.performance_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Performance Time</p>
                  <p className="text-sm text-muted-foreground">{request.performance_time}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Duration</p>
                <p className="text-sm text-muted-foreground">{request.performance_duration}</p>
              </div>
            </div>

            {request.expected_attendance && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Expected Attendance</p>
                  <p className="text-sm text-muted-foreground">{request.expected_attendance}</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Venue Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-medium">{request.venue_name}</p>
                <p className="text-sm text-muted-foreground">{request.venue_address}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Venue Type: {request.venue_type}</p>
              </div>
            </div>
          </div>

          {request.theme_occasion && (
            <div>
              <h4 className="font-medium mb-2">Theme/Occasion</h4>
              <p className="text-muted-foreground">{request.theme_occasion}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical & Logistical */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Technical & Logistical Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.stage_dimensions && (
            <div>
              <h4 className="font-medium mb-2">Stage Dimensions</h4>
              <p className="text-muted-foreground">{request.stage_dimensions}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {request.sound_system_available ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Sound System</span>
              </div>
              {request.sound_system_available && request.sound_system_description && (
                <p className="text-sm text-muted-foreground ml-6">
                  {request.sound_system_description}
                </p>
              )}

              <div className="flex items-center gap-2">
                {request.lighting_available ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Lighting</span>
              </div>
              {request.lighting_available && request.lighting_description && (
                <p className="text-sm text-muted-foreground ml-6">
                  {request.lighting_description}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {request.piano_available ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Piano/Keyboard</span>
              </div>
              {request.piano_available && request.piano_type && (
                <p className="text-sm text-muted-foreground ml-6">
                  {request.piano_type}
                </p>
              )}

              <div className="flex items-center gap-2">
                {request.dressing_rooms_available ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Dressing Rooms</span>
              </div>
            </div>
          </div>

          {request.rehearsal_time_provided && (
            <div>
              <h4 className="font-medium mb-2">Rehearsal Time</h4>
              <p className="text-muted-foreground">
                {formatDateTime(request.rehearsal_time_provided)}
              </p>
            </div>
          )}

          {request.load_in_soundcheck_time && (
            <div>
              <h4 className="font-medium mb-2">Load-in & Soundcheck Time</h4>
              <p className="text-muted-foreground">{request.load_in_soundcheck_time}</p>
            </div>
          )}

          {request.av_capabilities && (
            <div>
              <h4 className="font-medium mb-2">A/V Capabilities</h4>
              <p className="text-muted-foreground">{request.av_capabilities}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hospitality & Travel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Hospitality & Travel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {request.honorarium_offered ? (
                  <DollarSign className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Honorarium</span>
              </div>
              {request.honorarium_offered && request.honorarium_amount && (
                <p className="text-sm text-green-600 font-medium ml-6">
                  ${request.honorarium_amount.toLocaleString()}
                </p>
              )}

              <div className="flex items-center gap-2">
                {request.lodging_provided ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Lodging</span>
              </div>
              {request.lodging_provided && request.lodging_nights && (
                <p className="text-sm text-muted-foreground ml-6">
                  {request.lodging_nights} nights
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {request.meals_provided ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Meals</span>
              </div>
              {request.meals_provided && request.dietary_restrictions && (
                <p className="text-sm text-muted-foreground ml-6">
                  Dietary accommodations: {request.dietary_restrictions}
                </p>
              )}
            </div>
          </div>

          {request.travel_expenses_covered && request.travel_expenses_covered.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Travel Expenses Covered</h4>
              <div className="flex flex-wrap gap-2">
                {request.travel_expenses_covered.map((expense, index) => (
                  <Badge key={index} variant="outline">
                    {expense}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {request.preferred_arrival_point && (
            <div>
              <h4 className="font-medium mb-2">Preferred Arrival Point</h4>
              <p className="text-muted-foreground">{request.preferred_arrival_point}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions & Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Permissions & Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {request.event_recorded_livestreamed ? (
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Recording/Livestreaming</span>
              </div>
              {request.event_recorded_livestreamed && request.recording_description && (
                <p className="text-sm text-muted-foreground ml-6">
                  {request.recording_description}
                </p>
              )}

              <div className="flex items-center gap-2">
                {request.photo_video_permission ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Photo/Video Permission</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {request.formal_contract_required ? (
                  <FileText className="h-4 w-4 text-blue-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium">Formal Contract Required</span>
              </div>
            </div>
          </div>

          {request.promotional_assets_requested && request.promotional_assets_requested.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Promotional Assets Requested</h4>
              <div className="flex flex-wrap gap-2">
                {request.promotional_assets_requested.map((asset, index) => (
                  <Badge key={index} variant="outline">
                    {asset}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      {(request.notes_for_director || request.notes_for_choir || request.how_heard_about_us) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.notes_for_director && (
              <div>
                <h4 className="font-medium mb-2">Notes for Director</h4>
                <p className="text-muted-foreground">{request.notes_for_director}</p>
              </div>
            )}

            {request.notes_for_choir && (
              <div>
                <h4 className="font-medium mb-2">Notes for Choir Members</h4>
                <p className="text-muted-foreground">{request.notes_for_choir}</p>
              </div>
            )}

            {request.how_heard_about_us && (
              <div>
                <h4 className="font-medium mb-2">How They Heard About Us</h4>
                <p className="text-muted-foreground">{request.how_heard_about_us}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
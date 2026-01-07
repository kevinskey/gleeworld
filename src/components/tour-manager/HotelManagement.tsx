import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Hotel, 
  MapPin, 
  Phone, 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Star,
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Users,
  DollarSign,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface TourCity {
  id: string;
  city_name: string;
  state_code?: string;
  arrival_date?: string;
}

interface HotelInfo {
  id: string;
  tour_city_id: string;
  hotel_name: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  phone?: string;
  website?: string;
  confirmation_number?: string;
  check_in_date?: string;
  check_out_date?: string;
  check_in_time?: string;
  check_out_time?: string;
  room_count?: number;
  room_rate?: number;
  total_cost?: number;
  amenities?: string[];
  notes?: string;
  contact_name?: string;
  contact_email?: string;
  parking_info?: string;
  breakfast_included?: boolean;
  created_at: string;
  updated_at: string;
  tour_city?: TourCity;
}

const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'Free WiFi', icon: Wifi },
  { value: 'parking', label: 'Free Parking', icon: Car },
  { value: 'breakfast', label: 'Breakfast', icon: Coffee },
  { value: 'fitness', label: 'Fitness Center', icon: Dumbbell },
  { value: 'pool', label: 'Pool', icon: Users },
];

export const HotelManagement = () => {
  const [hotels, setHotels] = useState<HotelInfo[]>([]);
  const [tourCities, setTourCities] = useState<TourCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<HotelInfo | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    tour_city_id: '',
    hotel_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    website: '',
    confirmation_number: '',
    check_in_date: '',
    check_out_date: '',
    check_in_time: '15:00',
    check_out_time: '11:00',
    room_count: '',
    room_rate: '',
    amenities: [] as string[],
    notes: '',
    contact_name: '',
    contact_email: '',
    parking_info: '',
    breakfast_included: false
  });

  useEffect(() => {
    loadHotels();
    loadTourCities();
  }, []);

  const loadHotels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('gw_tour_hotels')
        .select(`
          *,
          tour_city:gw_tour_cities(id, city_name, state_code)
        `)
        .order('check_in_date', { ascending: true });

      if (error) throw error;
      setHotels((data || []) as unknown as HotelInfo[]);
    } catch (error) {
      console.error('Error loading hotels:', error);
      // Table might not exist yet, that's okay
    } finally {
      setLoading(false);
    }
  };

  const loadTourCities = async () => {
    try {
      const { data, error } = await supabase
        .from('gw_tour_cities')
        .select('id, city_name, state_code')
        .order('city_name');

      if (error) throw error;
      setTourCities((data || []) as unknown as TourCity[]);
    } catch (error) {
      console.error('Error loading tour cities:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      tour_city_id: '',
      hotel_name: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      phone: '',
      website: '',
      confirmation_number: '',
      check_in_date: '',
      check_out_date: '',
      check_in_time: '15:00',
      check_out_time: '11:00',
      room_count: '',
      room_rate: '',
      amenities: [],
      notes: '',
      contact_name: '',
      contact_email: '',
      parking_info: '',
      breakfast_included: false
    });
    setEditingHotel(null);
  };

  const handleEdit = (hotel: HotelInfo) => {
    setEditingHotel(hotel);
    setFormData({
      tour_city_id: hotel.tour_city_id || '',
      hotel_name: hotel.hotel_name || '',
      address: hotel.address || '',
      city: hotel.city || '',
      state: hotel.state || '',
      zip_code: hotel.zip_code || '',
      phone: hotel.phone || '',
      website: hotel.website || '',
      confirmation_number: hotel.confirmation_number || '',
      check_in_date: hotel.check_in_date || '',
      check_out_date: hotel.check_out_date || '',
      check_in_time: hotel.check_in_time || '15:00',
      check_out_time: hotel.check_out_time || '11:00',
      room_count: hotel.room_count?.toString() || '',
      room_rate: hotel.room_rate?.toString() || '',
      amenities: hotel.amenities || [],
      notes: hotel.notes || '',
      contact_name: hotel.contact_name || '',
      contact_email: hotel.contact_email || '',
      parking_info: hotel.parking_info || '',
      breakfast_included: hotel.breakfast_included || false
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.hotel_name || !formData.city) {
      toast({
        title: "Missing required fields",
        description: "Please fill in at least the hotel name and city.",
        variant: "destructive"
      });
      return;
    }

    try {
      const hotelData = {
        tour_city_id: formData.tour_city_id || null,
        hotel_name: formData.hotel_name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code || null,
        phone: formData.phone || null,
        website: formData.website || null,
        confirmation_number: formData.confirmation_number || null,
        check_in_date: formData.check_in_date || null,
        check_out_date: formData.check_out_date || null,
        check_in_time: formData.check_in_time || null,
        check_out_time: formData.check_out_time || null,
        room_count: formData.room_count ? parseInt(formData.room_count) : null,
        room_rate: formData.room_rate ? parseFloat(formData.room_rate) : null,
        total_cost: formData.room_count && formData.room_rate 
          ? parseInt(formData.room_count) * parseFloat(formData.room_rate) 
          : null,
        amenities: formData.amenities,
        notes: formData.notes || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        parking_info: formData.parking_info || null,
        breakfast_included: formData.breakfast_included,
        updated_at: new Date().toISOString()
      };

      if (editingHotel) {
        const { error } = await supabase
          .from('gw_tour_hotels')
          .update(hotelData)
          .eq('id', editingHotel.id);

        if (error) throw error;
        toast({ title: "Hotel updated", description: "Hotel information has been updated." });
      } else {
        const { error } = await supabase
          .from('gw_tour_hotels')
          .insert(hotelData);

        if (error) throw error;
        toast({ title: "Hotel added", description: "New hotel has been added to the tour." });
      }

      setIsDialogOpen(false);
      resetForm();
      loadHotels();
    } catch (error: any) {
      console.error('Error saving hotel:', error);
      toast({
        title: "Error saving hotel",
        description: error.message || "Could not save hotel information.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (hotelId: string) => {
    try {
      const { error } = await supabase
        .from('gw_tour_hotels')
        .delete()
        .eq('id', hotelId);

      if (error) throw error;
      setHotels(prev => prev.filter(h => h.id !== hotelId));
      toast({ title: "Hotel deleted", description: "Hotel has been removed." });
    } catch (error) {
      console.error('Error deleting hotel:', error);
      toast({
        title: "Error deleting hotel",
        description: "Could not delete hotel.",
        variant: "destructive"
      });
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Hotel Information</h2>
          <p className="text-sm text-muted-foreground">Manage accommodations for tour cities</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Hotel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingHotel ? 'Edit Hotel' : 'Add New Hotel'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Tour City Selection */}
              {tourCities.length > 0 && (
                <div className="space-y-2">
                  <Label>Tour City (Optional)</Label>
                  <Select value={formData.tour_city_id} onValueChange={(value) => setFormData(prev => ({ ...prev, tour_city_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Link to a tour city..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tourCities.map(city => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.city_name}, {city.state_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hotel Name *</Label>
                  <Input 
                    value={formData.hotel_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, hotel_name: e.target.value }))}
                    placeholder="e.g., Hilton Garden Inn"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmation #</Label>
                  <Input 
                    value={formData.confirmation_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmation_number: e.target.value }))}
                    placeholder="Booking confirmation"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input 
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input 
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input 
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="GA"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input 
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="30314"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input 
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Check-in/out Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check-in Date</Label>
                  <Input 
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-out Date</Label>
                  <Input 
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Check-in/out Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check-in Time</Label>
                  <Input 
                    type="time"
                    value={formData.check_in_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in_time: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Check-out Time</Label>
                  <Input 
                    type="time"
                    value={formData.check_out_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out_time: e.target.value }))}
                  />
                </div>
              </div>

              {/* Rooms & Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Number of Rooms</Label>
                  <Input 
                    type="number"
                    value={formData.room_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, room_count: e.target.value }))}
                    placeholder="14"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate per Room ($)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.room_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, room_rate: e.target.value }))}
                    placeholder="129.00"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map(amenity => (
                    <Button
                      key={amenity.value}
                      type="button"
                      variant={formData.amenities.includes(amenity.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleAmenity(amenity.value)}
                      className="gap-1"
                    >
                      <amenity.icon className="h-3.5 w-3.5" />
                      {amenity.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Parking */}
              <div className="space-y-2">
                <Label>Parking Information</Label>
                <Input 
                  value={formData.parking_info}
                  onChange={(e) => setFormData(prev => ({ ...prev, parking_info: e.target.value }))}
                  placeholder="Free parking, Valet available, etc."
                />
              </div>

              {/* Contact Person */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input 
                    value={formData.contact_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="Hotel contact person"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input 
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="contact@hotel.com"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions, group code, etc."
                  rows={3}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingHotel ? 'Update Hotel' : 'Add Hotel'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      {hotels.length === 0 && (
        <Card className="p-12 text-center">
          <Hotel className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Hotels Added</h3>
          <p className="text-muted-foreground mb-4">
            Add hotel information for your tour cities to keep everything organized.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Hotel
          </Button>
        </Card>
      )}

      {/* Hotels Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hotels.map(hotel => (
          <Card key={hotel.id} className="overflow-hidden">
            <CardHeader className="pb-2 bg-primary/5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="truncate">{hotel.hotel_name}</span>
                  </CardTitle>
                  {hotel.tour_city && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {hotel.tour_city.city_name}, {hotel.tour_city.state_code}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(hotel)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Hotel</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {hotel.hotel_name}? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(hotel.id)} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              {/* Address */}
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  {hotel.address && <p>{hotel.address}</p>}
                  <p>{hotel.city}, {hotel.state} {hotel.zip_code}</p>
                </div>
              </div>

              {/* Dates */}
              {(hotel.check_in_date || hotel.check_out_date) && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(hotel.check_in_date)} - {formatDate(hotel.check_out_date)}</span>
                </div>
              )}

              {/* Times */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  In: {hotel.check_in_time || '3:00 PM'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Out: {hotel.check_out_time || '11:00 AM'}
                </span>
              </div>

              {/* Phone */}
              {hotel.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${hotel.phone}`} className="text-primary hover:underline">{hotel.phone}</a>
                </div>
              )}

              {/* Rooms & Cost */}
              {(hotel.room_count || hotel.room_rate) && (
                <div className="flex items-center gap-4 text-sm">
                  {hotel.room_count && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {hotel.room_count} rooms
                    </span>
                  )}
                  {hotel.room_rate && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      ${hotel.room_rate}/night
                    </span>
                  )}
                </div>
              )}

              {/* Confirmation */}
              {hotel.confirmation_number && (
                <div className="text-sm bg-muted/50 p-2 rounded">
                  <span className="text-muted-foreground">Confirmation: </span>
                  <span className="font-mono font-medium">{hotel.confirmation_number}</span>
                </div>
              )}

              {/* Amenities */}
              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {hotel.amenities.map(amenity => {
                    const amenityInfo = AMENITY_OPTIONS.find(a => a.value === amenity);
                    return amenityInfo ? (
                      <Badge key={amenity} variant="outline" className="text-xs gap-1">
                        <amenityInfo.icon className="h-3 w-3" />
                        {amenityInfo.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Website Link */}
              {hotel.website && (
                <a 
                  href={hotel.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Visit Website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

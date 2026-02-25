import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { HotelDetailView } from './HotelDetailView';
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
  Wifi,
  Car,
  Coffee,
  Dumbbell,
  Users,
  DollarSign,
  ExternalLink,
  Calendar,
  Search,
  Star,
  Loader2,
  CheckCircle2
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

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
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
  const [viewingHotel, setViewingHotel] = useState<HotelInfo | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();

  // Google search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceResult | null>(null);
  const [step, setStep] = useState<'search' | 'details'>('search');

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
    breakfast_included: false,
    google_place_id: '',
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
      breakfast_included: false,
      google_place_id: '',
    });
    setEditingHotel(null);
    setSearchQuery('');
    setSearchCity('');
    setSearchState('');
    setSearchResults([]);
    setSelectedPlace(null);
    setStep('search');
  };

  const handleSearchHotels = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-hotels', {
        body: { query: searchQuery, city: searchCity, state: searchState },
      });
      if (error) throw error;
      setSearchResults(data?.results || []);
    } catch (err: any) {
      console.error('Hotel search error:', err);
      toast({ title: 'Search failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchCity, searchState, toast]);

  const handleSelectPlace = (place: GooglePlaceResult) => {
    setSelectedPlace(place);
    setFormData(prev => ({
      ...prev,
      hotel_name: place.name,
      address: place.address,
      city: place.city,
      state: place.state,
      zip_code: place.zip_code,
      phone: place.phone || '',
      website: place.website || '',
      google_place_id: place.place_id,
    }));
    setStep('details');
  };

  const handleTourCityChange = (cityId: string) => {
    const city = tourCities.find(c => c.id === cityId);
    setFormData(prev => ({ ...prev, tour_city_id: cityId }));
    if (city) {
      setSearchCity(city.city_name);
      setSearchState(city.state_code || '');
    }
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
      breakfast_included: hotel.breakfast_included || false,
      google_place_id: '',
    });
    setStep('details'); // Skip search when editing
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

  // Show detail view when a hotel is selected
  if (viewingHotel) {
    return (
      <HotelDetailView
        hotel={viewingHotel}
        onBack={() => setViewingHotel(null)}
      />
    );
  }


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Hotel className="h-4 w-4 text-primary" />
                <span>Hotel Information</span>
                <span className="text-xs font-normal text-muted-foreground ml-1">Search & verify hotels via Google before adding</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
    <div className="space-y-4">
      <div className="flex items-center justify-end">
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
              <DialogTitle>
                {editingHotel ? 'Edit Hotel' : step === 'search' ? 'Search for a Hotel' : 'Hotel Details'}
              </DialogTitle>
            </DialogHeader>

            {/* Step 1: Google Search */}
            {step === 'search' && !editingHotel && (
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Search Google to find and verify the hotel. Only verified hotels with real addresses can be added.
                </p>

                {/* Tour City Selection — pre-fills city/state for search */}
                {tourCities.length > 0 && (
                  <div className="space-y-2">
                    <Label>Tour City (narrows search)</Label>
                    <Select value={formData.tour_city_id} onValueChange={handleTourCityChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tour city..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tourCities.map(city => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.city_name}{city.state_code ? `, ${city.state_code}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Search hotel name (e.g. Marriott, Hilton)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchHotels()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearchHotels} disabled={isSearching || searchQuery.length < 2} className="gap-2">
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>

                {!formData.tour_city_id && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">City (optional filter)</Label>
                      <Input
                        placeholder="e.g. Chicago"
                        value={searchCity}
                        onChange={(e) => setSearchCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State (optional filter)</Label>
                      <Input
                        placeholder="e.g. IL"
                        value={searchState}
                        onChange={(e) => setSearchState(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {searchResults.map((place) => (
                      <button
                        key={place.place_id}
                        onClick={() => handleSelectPlace(place)}
                        className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900 truncate">{place.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {place.formatted_address}
                            </p>
                            {place.phone && (
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                <Phone className="h-3 w-3 flex-shrink-0" />
                                {place.phone}
                              </p>
                            )}
                          </div>
                          {place.rating && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs shrink-0 bg-slate-100 text-slate-700">
                              <Star className="h-3 w-3 fill-current text-amber-500" />
                              {place.rating}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No hotels found. Try a different search term.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Hotel Details (after selecting from Google or editing) */}
            {step === 'details' && (
              <div className="grid gap-4 py-4">
                {/* Selected hotel badge */}
                {selectedPlace && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{selectedPlace.name}</p>
                      <p className="text-xs text-slate-500 truncate">{selectedPlace.formatted_address}</p>
                    </div>
                    {!editingHotel && (
                      <Button variant="ghost" size="sm" className="text-xs shrink-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100" onClick={() => {
                        setStep('search');
                        setSelectedPlace(null);
                      }}>
                        Change
                      </Button>
                    )}
                  </div>
                )}

                {/* Tour City Selection */}
                {tourCities.length > 0 && !formData.tour_city_id && (
                  <div className="space-y-2">
                    <Label>Link to Tour City</Label>
                    <Select value={formData.tour_city_id} onValueChange={(value) => setFormData(prev => ({ ...prev, tour_city_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Link to a tour city..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tourCities.map(city => (
                          <SelectItem key={city.id} value={city.id}>
                            {city.city_name}{city.state_code ? `, ${city.state_code}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Read-only verified info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hotel Name</Label>
                    <Input value={formData.hotel_name} readOnly={!!selectedPlace} className={selectedPlace ? 'bg-slate-100 text-slate-700' : ''} onChange={(e) => !selectedPlace && setFormData(prev => ({ ...prev, hotel_name: e.target.value }))} />
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

                {/* Address — read only from Google */}
                <div className="space-y-2">
                  <Label>Street Address {selectedPlace && <span className="text-xs text-slate-500">(verified by Google)</span>}</Label>
                  <Input value={formData.address} readOnly={!!selectedPlace} className={selectedPlace ? 'bg-slate-100 text-slate-700' : ''} onChange={(e) => !selectedPlace && setFormData(prev => ({ ...prev, address: e.target.value }))} />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={formData.city} readOnly={!!selectedPlace} className={selectedPlace ? 'bg-slate-100 text-slate-700' : ''} onChange={(e) => !selectedPlace && setFormData(prev => ({ ...prev, city: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input value={formData.state} readOnly={!!selectedPlace} className={selectedPlace ? 'bg-slate-100 text-slate-700' : ''} onChange={(e) => !selectedPlace && setFormData(prev => ({ ...prev, state: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP Code</Label>
                    <Input value={formData.zip_code} readOnly={!!selectedPlace} className={selectedPlace ? 'bg-slate-100 text-slate-700' : ''} onChange={(e) => !selectedPlace && setFormData(prev => ({ ...prev, zip_code: e.target.value }))} />
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      value={formData.phone}
                      readOnly={!!selectedPlace && !!formData.phone}
                      className={selectedPlace && formData.phone ? 'bg-slate-100 text-slate-700' : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input 
                      value={formData.website}
                      readOnly={!!selectedPlace && !!formData.website}
                      className={selectedPlace && formData.website ? 'bg-slate-100 text-slate-700' : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Check-in/out Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in Date</Label>
                    <Input type="date" value={formData.check_in_date} onChange={(e) => setFormData(prev => ({ ...prev, check_in_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out Date</Label>
                    <Input type="date" value={formData.check_out_date} onChange={(e) => setFormData(prev => ({ ...prev, check_out_date: e.target.value }))} />
                  </div>
                </div>

                {/* Check-in/out Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Check-in Time</Label>
                    <Input type="time" value={formData.check_in_time} onChange={(e) => setFormData(prev => ({ ...prev, check_in_time: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Check-out Time</Label>
                    <Input type="time" value={formData.check_out_time} onChange={(e) => setFormData(prev => ({ ...prev, check_out_time: e.target.value }))} />
                  </div>
                </div>

                {/* Rooms & Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Rooms</Label>
                    <Input type="number" value={formData.room_count} onChange={(e) => setFormData(prev => ({ ...prev, room_count: e.target.value }))} placeholder="14" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate per Room ($)</Label>
                    <Input type="number" step="0.01" value={formData.room_rate} onChange={(e) => setFormData(prev => ({ ...prev, room_rate: e.target.value }))} placeholder="129.00" />
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
                  <Input value={formData.parking_info} onChange={(e) => setFormData(prev => ({ ...prev, parking_info: e.target.value }))} placeholder="Free parking, Valet available, etc." />
                </div>

                {/* Contact Person */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input value={formData.contact_name} onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))} placeholder="Hotel contact person" />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input type="email" value={formData.contact_email} onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))} placeholder="contact@hotel.com" />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Special instructions, group code, etc." rows={3} />
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingHotel ? 'Update Hotel' : 'Add Hotel'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      {hotels.length === 0 && (
        <Card className="p-12 text-center">
          <Hotel className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Hotels Added</h3>
          <p className="text-muted-foreground mb-4">
            Search Google to find verified hotels for your tour cities.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            Search & Add Hotel
          </Button>
        </Card>
      )}

      {/* Hotels Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hotels.map(hotel => (
          <Card key={hotel.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setViewingHotel(hotel)}>
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
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

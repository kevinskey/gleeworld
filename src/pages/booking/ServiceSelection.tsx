import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Music, Clock, Filter, ChevronDown, Star, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServices } from '@/hooks/useServices';
import { useNavigate } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

type DurationFilter = 'all' | 'up-to-30' | '31-60' | '60-plus';
type SortOption = 'recommended' | 'price-low' | 'price-high' | 'duration-short' | 'duration-long';

export default function ServiceSelection() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState<DurationFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recommended');
  const [showFilters, setShowFilters] = useState(false);

  const { data: services = [], isLoading: servicesLoading } = useServices();

  // Filter and sort services
  const filteredAndSortedServices = useMemo(() => {
    let result = services.filter(service =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply duration filter
    switch (durationFilter) {
      case 'up-to-30':
        result = result.filter(s => s.duration_minutes <= 30);
        break;
      case '31-60':
        result = result.filter(s => s.duration_minutes > 30 && s.duration_minutes <= 60);
        break;
      case '60-plus':
        result = result.filter(s => s.duration_minutes > 60);
        break;
    }

    // Apply sorting
    switch (sortOption) {
      case 'price-low':
        result = [...result].sort((a, b) => (a.price_amount || 0) - (b.price_amount || 0));
        break;
      case 'price-high':
        result = [...result].sort((a, b) => (b.price_amount || 0) - (a.price_amount || 0));
        break;
      case 'duration-short':
        result = [...result].sort((a, b) => a.duration_minutes - b.duration_minutes);
        break;
      case 'duration-long':
        result = [...result].sort((a, b) => b.duration_minutes - a.duration_minutes);
        break;
      default:
        // Keep original order for 'recommended'
        break;
    }

    return result;
  }, [services, searchTerm, durationFilter, sortOption]);

  const handleBookNow = (serviceId: string) => {
    navigate(`/booking/datetime?service=${serviceId}`);
  };

  const handleViewDetails = (serviceId: string) => {
    // Could open a modal or navigate to details page
    navigate(`/booking/datetime?service=${serviceId}`);
  };

  const activeFiltersCount = (durationFilter !== 'all' ? 1 : 0) + (sortOption !== 'recommended' ? 1 : 0);

  return (
    <UniversalLayout>
      <div className="min-h-screen bg-background">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mx-auto mb-4 flex items-center justify-center">
              <Music className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">Book an Appointment</h1>
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto">
              Schedule office hours, lessons, and consultations with our talented instructors
            </p>
            <Button 
              size="lg" 
              className="mt-6 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-8"
              onClick={() => document.getElementById('services-list')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Book Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8" id="services-list">
          {/* Search and Filters Bar */}
          <div className="mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-full border-2 focus:border-primary"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Duration Filter */}
              <Select value={durationFilter} onValueChange={(v) => setDurationFilter(v as DurationFilter)}>
                <SelectTrigger className="w-auto min-w-[140px] h-10 rounded-full border-2 bg-card">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All durations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All durations</SelectItem>
                  <SelectItem value="up-to-30">Up to 30 min</SelectItem>
                  <SelectItem value="31-60">31–60 min</SelectItem>
                  <SelectItem value="60-plus">60+ min</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Option */}
              <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                <SelectTrigger className="w-auto min-w-[180px] h-10 rounded-full border-2 bg-card">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recommended</SelectItem>
                  <SelectItem value="price-low">Price: low to high</SelectItem>
                  <SelectItem value="price-high">Price: high to low</SelectItem>
                  <SelectItem value="duration-short">Duration: shortest</SelectItem>
                  <SelectItem value="duration-long">Duration: longest</SelectItem>
                </SelectContent>
              </Select>

              {/* Active filters badge */}
              {activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setDurationFilter('all'); setSortOption('recommended'); }}
                  className="text-primary hover:text-primary/80"
                >
                  Clear filters ({activeFiltersCount})
                </Button>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-muted-foreground">
            {filteredAndSortedServices.length} service{filteredAndSortedServices.length !== 1 ? 's' : ''} available
          </div>

          {/* Services List */}
          <div className="space-y-4">
            {servicesLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading services...</p>
              </div>
            ) : filteredAndSortedServices.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-muted-foreground">
                  <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No services found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or search term</p>
                </div>
              </Card>
            ) : (
              filteredAndSortedServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onBookNow={() => handleBookNow(service.id)}
                  onViewDetails={() => handleViewDetails(service.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
}

interface ServiceCardProps {
  service: {
    id: string;
    name: string;
    description?: string | null;
    duration_minutes: number;
    booking_buffer_minutes?: number | null;
    price_amount?: number | null;
    price_display?: string | null;
    category?: string | null;
    badge_text?: string | null;
    image_url?: string | null;
  };
  onBookNow: () => void;
  onViewDetails: () => void;
}

function ServiceCard({ service, onBookNow, onViewDetails }: ServiceCardProps) {
  const isPremium = service.price_amount && service.price_amount > 0;
  const isFree = !service.price_amount || service.price_amount === 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 group">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Service Image */}
          <div className="sm:w-48 h-40 sm:h-auto bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex items-center justify-center relative overflow-hidden">
            {service.image_url ? (
              <img 
                src={service.image_url} 
                alt={service.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <Music className="w-16 h-16 text-primary/40" />
              </div>
            )}
            
            {/* Premium Badge Overlay */}
            {isPremium && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              </div>
            )}
          </div>

          {/* Service Info */}
          <div className="flex-1 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                {/* Badges Row */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {service.badge_text && (
                    <Badge variant="secondary" className="text-xs">
                      {service.badge_text}
                    </Badge>
                  )}
                  {service.category && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {service.category}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {service.name}
                </h3>

                {/* Duration & Buffer */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Duration {service.duration_minutes} min
                  </span>
                  {service.booking_buffer_minutes && service.booking_buffer_minutes > 0 && (
                    <span className="text-muted-foreground/70">
                      • {service.booking_buffer_minutes} min buffer
                    </span>
                  )}
                </div>

                {/* Description */}
                {service.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.description}
                  </p>
                )}
              </div>

              {/* Price & Actions */}
              <div className="flex flex-col items-end gap-3 min-w-[120px]">
                {/* Price */}
                <div className="text-right">
                  {isFree ? (
                    <span className="text-lg font-bold text-green-600">Free</span>
                  ) : (
                    <span className="text-2xl font-bold text-foreground">
                      {service.price_display || `$${((service.price_amount || 0) / 100).toFixed(2)}`}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onViewDetails}
                    className="text-xs"
                  >
                    View details
                  </Button>
                  <Button 
                    size="sm"
                    onClick={onBookNow}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Book now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

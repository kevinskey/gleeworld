import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Bus, Search, MapPin, Star, 
  Loader2, Building2, DollarSign, ExternalLink 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BusCompany {
  id: string;
  name: string;
  address: string;
  rating?: number;
  totalRatings?: number;
  priceLevel?: number;
  isOpen?: boolean;
  types?: string[];
  location?: { lat: number; lng: number };
  photoReference?: string;
}

export const BusInfoSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [companies, setCompanies] = useState<BusCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchBusCompanies = async () => {
    if (!searchQuery && !location) {
      toast.error('Please enter a search term or location');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('search-bus-companies', {
        body: { query: searchQuery, location }
      });

      if (error) throw error;

      if (data.success) {
        setCompanies(data.companies);
        if (data.companies.length === 0) {
          toast.info('No bus companies found. Try a different search.');
        } else {
          toast.success(`Found ${data.companies.length} bus companies`);
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || 'Failed to search for bus companies');
    } finally {
      setLoading(false);
    }
  };

  const getPriceLevelText = (level?: number) => {
    if (!level) return null;
    return '$'.repeat(level);
  };

  const openInMaps = (company: BusCompany) => {
    const query = encodeURIComponent(`${company.name} ${company.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Search Bus Companies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name or Type</label>
              <Input
                placeholder="e.g., luxury charter, school bus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchBusCompanies()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location / City</label>
              <Input
                placeholder="e.g., Atlanta, GA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchBusCompanies()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={searchBusCompanies} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {companies.length > 0 ? `${companies.length} Results` : 'No Results'}
            </h2>
          </div>

          {companies.length === 0 && !loading && (
            <Card className="p-8 text-center">
              <Bus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No bus companies found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search terms or location</p>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-2">{company.name}</h3>
                      {company.isOpen !== undefined && (
                        <Badge variant={company.isOpen ? 'default' : 'secondary'} className="shrink-0">
                          {company.isOpen ? 'Open' : 'Closed'}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="line-clamp-2">{company.address}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      {company.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{company.rating}</span>
                          {company.totalRatings && (
                            <span className="text-muted-foreground">({company.totalRatings})</span>
                          )}
                        </div>
                      )}
                      {company.priceLevel && (
                        <div className="flex items-center gap-1 text-green-600">
                          <DollarSign className="h-4 w-4" />
                          <span>{getPriceLevelText(company.priceLevel)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openInMaps(company)}
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        View on Map
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(company.name + ' phone number')}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tips Section */}
      {!hasSearched && (
        <Card className="border-dashed">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">Search Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Bus className="h-4 w-4" />
                Search by type: "luxury charter", "coach bus", "mini bus"
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Include city and state for best results: "Atlanta, GA"
              </li>
              <li className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Search specific companies by name if you know them
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Spotlight {
  id: string;
  name: string;
  title?: string;
  description?: string;
  photo_url?: string;
  spotlight_type: string;
  display_order: number;
}

export const SpotlightSection = () => {
  const [spotlights, setSpotlights] = useState<Spotlight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpotlights();
  }, []);

  const fetchSpotlights = async () => {
    try {
      const { data, error } = await supabase
        .from('alumnae_newsletter_spotlights')
        .select('*')
        .order('display_order', { ascending: true })
        .limit(6);

      if (error) throw error;
      setSpotlights(data || []);
    } catch (error) {
      console.error('Error fetching spotlights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="w-full h-48 bg-muted rounded-lg mb-4" />
              <div className="h-6 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (spotlights.length === 0) {
    return null;
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Alumnae Spotlights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spotlights.map((spotlight) => (
            <div 
              key={spotlight.id} 
              className="group relative overflow-hidden rounded-lg border bg-card hover:shadow-lg transition-all"
            >
              {spotlight.photo_url && (
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={spotlight.photo_url}
                    alt={spotlight.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                <Badge variant="secondary" className="mb-2">
                  {spotlight.spotlight_type}
                </Badge>
                <h3 className="font-semibold text-lg mb-1">{spotlight.name}</h3>
                {spotlight.title && (
                  <p className="text-sm text-muted-foreground mb-2">{spotlight.title}</p>
                )}
                {spotlight.description && (
                  <p className="text-sm line-clamp-3">{spotlight.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

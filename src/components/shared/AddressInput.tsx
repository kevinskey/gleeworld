import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AddressSuggestion {
  description: string;
  place_id: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: any) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

export const AddressInput = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter address",
  label,
  required = false,
  className,
  id
}: AddressInputProps) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = async () => {
      if (window.google && window.google.maps) {
        return Promise.resolve();
      }

      try {
        // Fetch API key from Supabase edge function
        const { data, error } = await supabase.functions.invoke('get-google-maps-config');
        
        if (error) {
          throw new Error(`Failed to get Google Maps API configuration: ${error.message}`);
        }
        
        const { apiKey } = data;
        
        return new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google Maps API'));
          document.head.appendChild(script);
        });
      } catch (error) {
        console.error('Error loading Google Maps API:', error);
        setVerificationError("Google Maps API unavailable");
      }
    };

    loadGoogleMapsAPI().catch(console.error);
  }, []);

  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    if (!window.google || !window.google.maps) {
      console.warn('Google Maps API not loaded');
      return;
    }

    setIsLoading(true);
    setVerificationError("");

    try {
      const service = new window.google.maps.places.AutocompleteService();
      
      service.getPlacePredictions(
        {
          input: query,
          types: ['address'],
          componentRestrictions: { country: 'us' } // Restrict to US addresses
        },
        (predictions, status) => {
          setIsLoading(false);
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions.map(prediction => ({
              description: prediction.description,
              place_id: prediction.place_id,
              structured_formatting: prediction.structured_formatting
            })));
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (error) {
      console.error('Error searching places:', error);
      setIsLoading(false);
      setVerificationError("Failed to search addresses");
    }
  };

  const verifyAddress = async (placeId: string) => {
    if (!window.google || !window.google.maps) {
      setVerificationError("Google Maps API not available");
      return;
    }

    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );

    service.getDetails(
      {
        placeId: placeId,
        fields: [
          'formatted_address',
          'geometry',
          'address_components',
          'name',
          'place_id'
        ]
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          setIsVerified(true);
          setVerificationError("");
          onPlaceSelect?.(place);
        } else {
          setVerificationError("Could not verify address");
        }
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsVerified(false);
    setVerificationError("");

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the search
    timeoutRef.current = setTimeout(() => {
      searchPlaces(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    verifyAddress(suggestion.place_id);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-2 relative">
      {label && (
        <Label htmlFor={id} className="text-sm font-medium">
          {label} {required && "*"}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => value.length >= 3 && setShowSuggestions(suggestions.length > 0)}
          placeholder={placeholder}
          required={required}
          className={cn(
            "pr-10",
            isVerified && "border-green-500 focus:border-green-500",
            verificationError && "border-red-500 focus:border-red-500",
            className
          )}
        />
        
        {/* Status indicator */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          {!isLoading && isVerified && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {!isLoading && verificationError && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          {!isLoading && !isVerified && !verificationError && value && (
            <MapPin className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Verification error */}
      {verificationError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {verificationError}
        </p>
      )}

      {/* Address suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card 
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg border bg-background"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm">
                    {suggestion.structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {suggestion.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};
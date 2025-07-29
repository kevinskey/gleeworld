import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import { useGooglePlaces, PlacePrediction } from '@/hooks/useGooglePlaces';
import { cn } from '@/lib/utils';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string, cityData?: PlacePrediction) => void;
  placeholder?: string;
  className?: string;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter city name...",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { searchCities, isLoading, error } = useGooglePlaces();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Don't search for very short queries
    if (inputValue.trim().length < 2) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    // Debounce search requests
    const timeout = setTimeout(async () => {
      try {
        const results = await searchCities(inputValue);
        setPredictions(results);
        setIsOpen(results.length > 0);
      } catch (err) {
        console.error('Search error:', err);
        setPredictions([]);
        setIsOpen(false);
      }
    }, 300);

    setSearchTimeout(timeout);
  };

  const handleSelectPrediction = (prediction: PlacePrediction) => {
    onChange(prediction.structured_formatting.main_text, prediction);
    setIsOpen(false);
    setPredictions([]);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (predictions.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="pr-8"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isOpen && predictions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto">
          <CardContent className="p-0">
            {predictions.map((prediction, index) => (
              <div
                key={prediction.place_id || index}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0"
                onClick={() => handleSelectPrediction(prediction)}
              >
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {prediction.structured_formatting.main_text}
                  </div>
                  {prediction.structured_formatting.secondary_text && (
                    <div className="text-xs text-muted-foreground truncate">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="text-xs text-destructive mt-1">
          {error}
        </div>
      )}
    </div>
  );
};
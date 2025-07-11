declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => google.maps.places.AutocompleteService;
          PlacesService: new (div: HTMLDivElement) => google.maps.places.PlacesService;
          PlacesServiceStatus: {
            OK: string;
            ZERO_RESULTS: string;
            OVER_QUERY_LIMIT: string;
            REQUEST_DENIED: string;
            INVALID_REQUEST: string;
            NOT_FOUND: string;
          };
        };
      };
    };
  }
}

declare namespace google.maps.places {
  interface AutocompleteService {
    getPlacePredictions(
      request: AutocompletionRequest,
      callback: (predictions: AutocompletePrediction[] | null, status: PlacesServiceStatus) => void
    ): void;
  }

  interface PlacesService {
    getDetails(
      request: PlaceDetailsRequest,
      callback: (place: PlaceResult | null, status: PlacesServiceStatus) => void
    ): void;
  }

  interface AutocompletionRequest {
    input: string;
    types?: string[];
    componentRestrictions?: {
      country?: string | string[];
    };
  }

  interface AutocompletePrediction {
    description: string;
    place_id: string;
    structured_formatting: {
      main_text: string;
      secondary_text: string;
    };
  }

  interface PlaceDetailsRequest {
    placeId: string;
    fields: string[];
  }

  interface PlaceResult {
    formatted_address?: string;
    geometry?: {
      location: {
        lat(): number;
        lng(): number;
      };
    };
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    name?: string;
    place_id?: string;
  }

  type PlacesServiceStatus = string;
}

export {};
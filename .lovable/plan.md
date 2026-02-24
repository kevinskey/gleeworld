

## Fix Google Maps Embed - Use Existing API Key

### Problem
The Google Maps embed iframe references `VITE_GOOGLE_MAPS_EMBED_KEY`, which is not set. However, the project already has a `GOOGLE_PLACES_API_KEY` secret and a `get-google-maps-config` edge function that serves it.

### Solution
Update `HotelDetailView.tsx` to fetch the API key from the existing `get-google-maps-config` edge function at runtime, instead of relying on a missing environment variable.

### Changes

**File: `src/components/tour-manager/HotelDetailView.tsx`**

1. Add a `mapsApiKey` state variable
2. Add a `useEffect` to call the `get-google-maps-config` edge function on mount and store the key
3. Update the iframe `src` to use the fetched key instead of `import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY`
4. Show a loading skeleton while the key is being fetched
5. If the key fails to load, show a fallback "Open in Google Maps" link instead of a broken iframe

### Why This Approach
- No new environment variables or secrets needed
- Reuses the existing `GOOGLE_PLACES_API_KEY` secret and `get-google-maps-config` edge function
- The API key is never exposed in the client bundle -- it's fetched at runtime through a secure edge function
- The Maps Embed API just needs to be enabled on the same Google Cloud project (which you've already done)


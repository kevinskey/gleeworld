// Concierge — everyday-life quick actions inside the dashboard:
//   1. Rides: Uber/Lyft deep links pre-filled with a destination (geocoded via
//      the existing nearby-places edge function) and the rider's location.
//      Booking/payment is confirmed in the rider's own Uber/Lyft account —
//      the deep link hands off a fully pre-filled request.
//   2. Food: DoorDash / Uber Eats / Grubhub search deep links.
//   3. Web search: concierge-search edge function (Google Programmable Search
//      + a Claude AI answer) rendered in-app.
import React, { useState } from "react";
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/calendar/AddressAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { buildRideLink, buildFoodLink, FOOD_SERVICES, type FoodService } from "@/lib/concierge/deepLinks";
import {
  ConciergeBell, Car, UtensilsCrossed, Globe, Sparkles, ExternalLink, Loader2,
} from "lucide-react";

interface WebResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

interface SearchResponse {
  answer: string | null;
  results: WebResult[];
  searchConfigured: boolean;
  aiConfigured: boolean;
}

/** Browser geolocation as a promise; resolves null on denial/timeout so every
 * flow works without location permission. */
function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 300000 },
    );
  });
}

/** Geocode a free-text destination through the existing nearby-places
 * function. Returns null on any failure — ride links degrade to address-only
 * (Uber) or app-home (Lyft). */
async function geocodeDestination(address: string): Promise<{ lat: number; lng: number; address: string; name: string } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("nearby-places", {
      body: { query: address, maxResults: 1 },
    });
    const place = data?.places?.[0];
    if (error || !place || typeof place.lat !== "number" || typeof place.lng !== "number") return null;
    return { lat: place.lat, lng: place.lng, address: place.address || address, name: place.name || address };
  } catch {
    return null;
  }
}

export const ConciergePage: React.FC = () => {
  // --- Rides ---
  const [destination, setDestination] = useState("");
  const [rideLoading, setRideLoading] = useState<"uber" | "lyft" | null>(null);

  async function openRide(provider: "uber" | "lyft") {
    const dest = destination.trim();
    if (!dest || rideLoading) return;
    setRideLoading(provider);
    // Open the tab synchronously so popup blockers allow it; point it at the
    // deep link once the async geocode resolves.
    const win = window.open("", "_blank");
    try {
      const [coords, me] = await Promise.all([geocodeDestination(dest), getPosition()]);
      const url = buildRideLink(
        provider,
        coords ? { address: coords.address, name: coords.name, lat: coords.lat, lng: coords.lng } : { address: dest },
        me,
      );
      if (win) win.location.href = url;
      else window.location.href = url;
    } finally {
      setRideLoading(null);
    }
  }

  // --- Food ---
  const [craving, setCraving] = useState("");
  const foodLinks = () =>
    (Object.keys(FOOD_SERVICES) as FoodService[]).map((service) => {
      const link = buildFoodLink(service, craving)!;
      return { name: link.label, href: link.url };
    });

  // --- Web search ---
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchResponse | null>(null);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      const { data, error } = await supabase.functions.invoke("concierge-search", {
        body: { query: q },
      });
      if (error || data?.error) {
        setSearchError("Search is unavailable right now. Please try again.");
        setSearch(null);
      } else {
        setSearch(data as SearchResponse);
      }
    } catch {
      setSearchError("Search is unavailable right now. Please try again.");
      setSearch(null);
    } finally {
      setSearching(false);
    }
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <DashboardPageShell
          title="Concierge"
          icon={ConciergeBell}
          subtitle="Rides, food, and web search — without leaving GleeWorld."
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Rides */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="rounded-md bg-sky-50 p-1.5 text-sky-600"><Car className="h-4 w-4" /></span>
                  Get a ride
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter where you're headed. We'll open Uber or Lyft with the trip pre-filled —
                  you confirm and pay in your own account.
                </p>
                <AddressAutocomplete
                  value={destination}
                  onChange={setDestination}
                  placeholder="Where to? (address or place name)"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => openRide("uber")}
                    disabled={!destination.trim() || rideLoading !== null}
                  >
                    {rideLoading === "uber" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                    Ride with Uber
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openRide("lyft")}
                    disabled={!destination.trim() || rideLoading !== null}
                  >
                    {rideLoading === "lyft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                    Ride with Lyft
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Food */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="rounded-md bg-amber-50 p-1.5 text-amber-600"><UtensilsCrossed className="h-4 w-4" /></span>
                  Order food
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Optionally tell us what you're craving, then pick a delivery service.
                  It opens with your search ready to go.
                </p>
                <Input
                  value={craving}
                  onChange={(e) => setCraving(e.target.value)}
                  placeholder="What are you craving? (optional — e.g. wings, sushi)"
                />
                <div className="flex flex-wrap gap-2">
                  {foodLinks().map((f) => (
                    <Button key={f.name} variant="outline" asChild>
                      <a href={f.href} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {f.name}
                      </a>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Web search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="rounded-md bg-violet-50 p-1.5 text-violet-600"><Globe className="h-4 w-4" /></span>
                  Search the web
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={runSearch} className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search anything…"
                  />
                  <Button type="submit" disabled={!query.trim() || searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </form>

                {searchError && <p className="text-sm text-destructive">{searchError}</p>}

                {search?.answer && (
                  <div className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-violet-600" />
                      AI answer
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{search.answer}</p>
                  </div>
                )}

                {search && !search.aiConfigured && search.results.length > 0 && (
                  <p className="text-xs text-muted-foreground">AI answers aren't set up yet — showing web results only.</p>
                )}

                {search && search.results.length > 0 && (
                  <ul className="space-y-3">
                    {search.results.map((r, i) => (
                      <li key={`${r.link}-${i}`} className="rounded-md border border-border p-3">
                        <a
                          href={r.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {i + 1}. {r.title}
                        </a>
                        <div className="text-xs text-muted-foreground">{r.displayLink}</div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{r.snippet}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {search && search.results.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {search.searchConfigured
                      ? "No results found."
                      : search.answer
                        ? "Web results aren't set up yet — AI answer shown from general knowledge."
                        : "Web search isn't set up yet. An admin needs to add the search API keys."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </DashboardPageShell>
      </DashboardShell>
    </UniversalLayout>
  );
};

export default ConciergePage;

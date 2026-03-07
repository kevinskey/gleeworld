import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cities } = await req.json()

    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return new Response(
        JSON.stringify({ error: 'cities array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch weather for all cities in parallel (server-side, no CORS issues)
    const results = await Promise.all(
      cities.map(async (city: { lat: number; lon: number; name: string; state: string; arrivalDate: string; departureDate: string }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
          const res = await fetch(url)
          if (!res.ok) {
            console.error(`Weather API error for ${city.name}: ${res.status}`)
            return null
          }
          const data = await res.json()
          if (!data.current) return null

          const current = data.current
          const code = current.weather_code
          let description = 'Clear'
          if (code === 0) description = 'Clear sky'
          else if (code <= 3) description = 'Clouds'
          else if (code <= 49) description = 'Fog'
          else if (code <= 59) description = 'Drizzle'
          else if (code <= 69) description = 'Rain'
          else if (code <= 79) description = 'Snow'
          else if (code <= 84) description = 'Rain showers'
          else if (code <= 86) description = 'Snow showers'
          else if (code <= 99) description = 'Thunderstorm'

          return {
            city: city.name,
            state: city.state,
            temp: Math.round(current.temperature_2m),
            feelsLike: Math.round(current.apparent_temperature),
            humidity: current.relative_humidity_2m,
            windSpeed: Math.round(current.wind_speed_10m),
            description,
            icon: description.toLowerCase(),
            arrivalDate: city.arrivalDate || '',
            departureDate: city.departureDate || '',
          }
        } catch (err) {
          console.error(`Error fetching weather for ${city.name}:`, err)
          return null
        }
      })
    )

    return new Response(
      JSON.stringify({ weather: results.filter(Boolean) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Weather proxy error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

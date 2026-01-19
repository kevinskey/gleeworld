import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 20 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Searching for images:', query);

    // Use Firecrawl search to find images
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `${query} images photos`,
        limit: limit,
      }),
    });

    const searchData = await searchResponse.json();

    if (!searchResponse.ok) {
      console.error('Firecrawl search error:', searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || 'Search failed' }),
        { status: searchResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${searchData.data?.length || 0} search results`);

    // Extract image URLs from search results
    const images: Array<{
      url: string;
      title: string;
      source: string;
      description?: string;
    }> = [];

    if (searchData.data) {
      for (const result of searchData.data) {
        // Try to scrape each result for images
        try {
          const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${firecrawlApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: result.url,
              formats: ['links', 'markdown'],
              onlyMainContent: true,
            }),
          });

          const scrapeData = await scrapeResponse.json();
          
          if (scrapeData.success && scrapeData.data?.links) {
            // Filter for image URLs
            const imageUrls = scrapeData.data.links.filter((link: string) => 
              /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(link) ||
              link.includes('image') ||
              link.includes('photo')
            );

            for (const imgUrl of imageUrls.slice(0, 5)) { // Max 5 images per page
              if (!images.find(i => i.url === imgUrl)) {
                images.push({
                  url: imgUrl,
                  title: result.title || 'Untitled',
                  source: result.url,
                  description: result.description,
                });
              }
            }
          }

          // Also extract images from markdown
          if (scrapeData.data?.markdown) {
            const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            let match;
            while ((match = imgRegex.exec(scrapeData.data.markdown)) !== null) {
              const [, altText, imgUrl] = match;
              if (imgUrl && !images.find(i => i.url === imgUrl)) {
                images.push({
                  url: imgUrl,
                  title: altText || result.title || 'Untitled',
                  source: result.url,
                  description: result.description,
                });
              }
            }
          }
        } catch (scrapeError) {
          console.warn('Failed to scrape:', result.url, scrapeError);
        }
      }
    }

    console.log(`Extracted ${images.length} images`);

    // Save images to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let savedCount = 0;
    for (const image of images) {
      const { error } = await supabase
        .from('gw_media_library')
        .upsert({
          title: image.title,
          description: `Scraped from: ${image.source}. ${image.description || ''}`,
          file_url: image.url,
          file_type: 'image/jpeg',
          category: 'scraped-images',
          tags: ['scraped', 'bowman-scholars', 'lyke-house'],
          is_public: true,
        }, {
          onConflict: 'file_url',
          ignoreDuplicates: true,
        });

      if (!error) {
        savedCount++;
      }
    }

    console.log(`Saved ${savedCount} images to database`);

    return new Response(
      JSON.stringify({
        success: true,
        searchResults: searchData.data?.length || 0,
        imagesFound: images.length,
        imagesSaved: savedCount,
        images: images.slice(0, 50), // Return first 50
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scraping images:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

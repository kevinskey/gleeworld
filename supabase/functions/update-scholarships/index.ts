import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScholarshipData {
  title: string
  description: string
  deadline?: string
  amount?: string
  eligibility?: string
  tags?: string[]
  link?: string
  source: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting scholarship update process...')

    const scholarships: ScholarshipData[] = []

    // 1. Fetch from College Board (simulated - they don't have a public API)
    // In real implementation, you'd scrape or use their data feeds
    await fetchCollegeBoardScholarships(scholarships)

    // 2. Fetch from government sources (Federal Student Aid)
    await fetchFederalScholarships(scholarships)

    // 3. Fetch from foundation databases
    await fetchFoundationScholarships(scholarships)

    // 4. Fetch HBCU-specific scholarships
    await fetchHBCUScholarships(scholarships)

    console.log(`Fetched ${scholarships.length} scholarships from external sources`)

    // Process and insert scholarships
    let insertedCount = 0
    let updatedCount = 0

    for (const scholarship of scholarships) {
      try {
        // Check if scholarship already exists (by title and source)
        const { data: existing } = await supabase
          .from('scholarships')
          .select('id')
          .eq('title', scholarship.title)
          .eq('source', scholarship.source)
          .single()

        if (existing) {
          // Update existing scholarship
          const { error } = await supabase
            .from('scholarships')
            .update({
              description: scholarship.description,
              deadline: scholarship.deadline,
              amount: scholarship.amount,
              eligibility: scholarship.eligibility,
              tags: scholarship.tags,
              link: scholarship.link,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

          if (error) {
            console.error('Error updating scholarship:', error)
          } else {
            updatedCount++
          }
        } else {
          // Insert new scholarship
          const { error } = await supabase
            .from('scholarships')
            .insert({
              title: scholarship.title,
              description: scholarship.description,
              deadline: scholarship.deadline,
              amount: scholarship.amount,
              eligibility: scholarship.eligibility,
              tags: scholarship.tags,
              link: scholarship.link,
              source: scholarship.source,
              is_featured: false,
              is_active: true,
            })

          if (error) {
            console.error('Error inserting scholarship:', error)
          } else {
            insertedCount++
          }
        }
      } catch (error) {
        console.error(`Error processing scholarship "${scholarship.title}":`, error)
      }
    }

    // Deactivate scholarships with past deadlines from external sources
    const { error: deactivateError } = await supabase
      .from('scholarships')
      .update({ is_active: false })
      .lt('deadline', new Date().toISOString().split('T')[0])
      .neq('source', 'manual')

    if (deactivateError) {
      console.error('Error deactivating old scholarships:', deactivateError)
    }

    const result = {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total_processed: scholarships.length,
      timestamp: new Date().toISOString()
    }

    console.log('Scholarship update completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in scholarship update:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function fetchCollegeBoardScholarships(scholarships: ScholarshipData[]) {
  // No mock data - implement real API integration when needed
  return
}

async function fetchFederalScholarships(scholarships: ScholarshipData[]) {
  // No mock data - implement real API integration when needed
  return
}

async function fetchFoundationScholarships(scholarships: ScholarshipData[]) {
  // No mock data - implement real API integration when needed
  return
}

async function fetchHBCUScholarships(scholarships: ScholarshipData[]) {
  // No mock data - implement real API integration when needed
  return
}
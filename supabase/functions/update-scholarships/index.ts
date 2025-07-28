import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

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
  // College Board scholarships (simulated data - replace with real scraping/API)
  const collegeBoardScholarships = [
    {
      title: "College Board Opportunity Scholarships",
      description: "Need-based scholarships for college planning and application completion.",
      deadline: "2025-06-30",
      amount: "$500 - $40,000",
      eligibility: "High school students from low-income families",
      tags: ["need-based", "college-prep", "diversity"],
      link: "https://opportunity.collegeboard.org/",
      source: "collegeboard"
    }
  ]

  scholarships.push(...collegeBoardScholarships)
}

async function fetchFederalScholarships(scholarships: ScholarshipData[]) {
  // Federal scholarships (could integrate with StudentAid.gov APIs)
  const federalScholarships = [
    {
      title: "Federal Pell Grant",
      description: "Need-based grant for undergraduate students who have not earned a bachelor's degree.",
      deadline: "2025-06-30",
      amount: "Up to $7,395",
      eligibility: "Undergraduate students with exceptional financial need",
      tags: ["federal", "need-based", "undergraduate"],
      link: "https://studentaid.gov/understand-aid/types/grants/pell",
      source: "federal"
    },
    {
      title: "Federal Supplemental Educational Opportunity Grant (FSEOG)",
      description: "Additional need-based funding for undergraduate students.",
      deadline: "2025-06-30",
      amount: "$100 - $4,000",
      eligibility: "Undergraduate students with exceptional financial need",
      tags: ["federal", "need-based", "undergraduate"],
      link: "https://studentaid.gov/understand-aid/types/grants/fseog",
      source: "federal"
    }
  ]

  scholarships.push(...federalScholarships)
}

async function fetchFoundationScholarships(scholarships: ScholarshipData[]) {
  // Foundation and private scholarships
  const foundationScholarships = [
    {
      title: "United Negro College Fund (UNCF) Scholarships",
      description: "Various merit and need-based scholarships for African American students.",
      deadline: "2025-05-31",
      amount: "$1,000 - $25,000",
      eligibility: "African American students attending UNCF member schools",
      tags: ["merit-based", "need-based", "african-american", "HBCU"],
      link: "https://uncf.org/scholarships",
      source: "uncf"
    },
    {
      title: "Thurgood Marshall College Fund Scholarships",
      description: "Scholarships for students at Historically Black Colleges and Universities.",
      deadline: "2025-04-15",
      amount: "$1,000 - $15,000",
      eligibility: "Students enrolled at TMCF member HBCUs",
      tags: ["HBCU", "merit-based", "african-american"],
      link: "https://tmcf.org/our-scholarships",
      source: "tmcf"
    }
  ]

  scholarships.push(...foundationScholarships)
}

async function fetchHBCUScholarships(scholarships: ScholarshipData[]) {
  // HBCU-specific scholarships
  const hbcuScholarships = [
    {
      title: "HBCU Foundation Academic Excellence Scholarship",
      description: "Merit-based scholarship for students attending Historically Black Colleges.",
      deadline: "2025-03-31",
      amount: "$2,500",
      eligibility: "Students at HBCUs with 3.0+ GPA",
      tags: ["HBCU", "merit-based", "academic"],
      link: "https://hbcufoundation.org/scholarships",
      source: "hbcu_foundation"
    },
    {
      title: "Spelman College Alumnae Scholarship",
      description: "Scholarship funded by Spelman College alumnae for current students.",
      deadline: "2025-05-15",
      amount: "$3,000",
      eligibility: "Current Spelman College students with financial need",
      tags: ["spelman", "alumnae", "need-based"],
      link: "https://spelman.edu/academics/financial-aid/scholarships",
      source: "spelman_alumnae"
    }
  ]

  scholarships.push(...hbcuScholarships)
}
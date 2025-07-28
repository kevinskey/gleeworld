import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js'

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
  scraped_from_url?: string
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

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable is required')
    }

    const app = new FirecrawlApp({ apiKey: firecrawlApiKey })

    console.log('Starting scholarship scraping process...')

    // Get active scholarship sources
    const { data: sources, error: sourcesError } = await supabase
      .from('scholarship_sources')
      .select('*')
      .eq('is_active', true)

    if (sourcesError) {
      throw sourcesError
    }

    console.log(`Found ${sources?.length || 0} active sources to scrape`)

    let totalScraped = 0
    let totalInserted = 0
    let totalUpdated = 0

    for (const source of sources || []) {
      try {
        console.log(`Scraping ${source.name}: ${source.url}`)

        // Scrape the website using Firecrawl
        const crawlResult = await app.scrapeUrl(source.url, {
          formats: ['markdown', 'html'],
          onlyMainContent: true
        })

        if (!crawlResult.success) {
          console.error(`Failed to scrape ${source.url}:`, crawlResult.error)
          continue
        }

        // Extract scholarship information from the scraped content
        const scholarships = await extractScholarshipData(crawlResult.data, source)
        console.log(`Extracted ${scholarships.length} scholarships from ${source.name}`)

        // Process and save scholarships
        for (const scholarship of scholarships) {
          try {
            // Check if scholarship already exists
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
                  scraped_from_url: scholarship.scraped_from_url,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)

              if (error) {
                console.error('Error updating scholarship:', error)
              } else {
                totalUpdated++
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
                  scraped_from_url: scholarship.scraped_from_url,
                  is_featured: false,
                  is_active: true,
                })

              if (error) {
                console.error('Error inserting scholarship:', error)
              } else {
                totalInserted++
              }
            }
          } catch (error) {
            console.error(`Error processing scholarship "${scholarship.title}":`, error)
          }
        }

        totalScraped += scholarships.length

        // Update last scraped timestamp
        await supabase
          .from('scholarship_sources')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', source.id)

      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error)
      }
    }

    const result = {
      success: true,
      sources_scraped: sources?.length || 0,
      scholarships_found: totalScraped,
      inserted: totalInserted,
      updated: totalUpdated,
      timestamp: new Date().toISOString()
    }

    console.log('Scholarship scraping completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error in scholarship scraping:', error)
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

async function extractScholarshipData(scrapedData: any, source: any): Promise<ScholarshipData[]> {
  const scholarships: ScholarshipData[] = []
  
  // Basic extraction logic - this would need to be customized per foundation
  const content = scrapedData.markdown || scrapedData.html || ''
  
  // Look for common scholarship patterns in the content
  const scholarshipSections = extractScholarshipSections(content)
  
  for (const section of scholarshipSections) {
    const scholarship = parseScholarshipSection(section, source)
    if (scholarship) {
      scholarships.push(scholarship)
    }
  }
  
  return scholarships
}

function extractScholarshipSections(content: string): string[] {
  // Split content into potential scholarship sections
  // This is a basic implementation - would need refinement per foundation
  const sections = content.split(/(?=.*scholarship)|(?=.*grant)|(?=.*award)/i)
  return sections.filter(section => 
    section.length > 100 && 
    (section.toLowerCase().includes('scholarship') || 
     section.toLowerCase().includes('grant') || 
     section.toLowerCase().includes('award'))
  )
}

function parseScholarshipSection(section: string, source: any): ScholarshipData | null {
  try {
    // Extract title (usually the first heading)
    const titleMatch = section.match(/#{1,3}\s*(.+?)(?:\n|$)/i)
    const title = titleMatch ? titleMatch[1].trim() : null
    
    if (!title) return null
    
    // Extract description (first paragraph after title)
    const descMatch = section.match(/(?:#{1,3}.*?\n)(.*?)(?:\n\n|$)/s)
    const description = descMatch ? descMatch[1].trim().substring(0, 500) : ''
    
    // Extract amount (look for dollar amounts)
    const amountMatch = section.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/i)
    const amount = amountMatch ? amountMatch[0] : null
    
    // Extract deadline (look for dates)
    const deadlineMatch = section.match(/(?:deadline|due|apply by)[:\s]*(\w+\s+\d{1,2},?\s+\d{4})/i)
    const deadline = deadlineMatch ? deadlineMatch[1] : null
    
    // Extract eligibility
    const eligibilityMatch = section.match(/(?:eligibility|requirements?|criteria)[:\s]*([^.]+)/i)
    const eligibility = eligibilityMatch ? eligibilityMatch[1].trim() : null
    
    // Generate tags based on content
    const tags = generateTags(section, source.name)
    
    return {
      title,
      description,
      deadline,
      amount,
      eligibility,
      tags,
      link: source.url,
      source: source.name.toLowerCase().replace(/\s+/g, '_'),
      scraped_from_url: source.url
    }
  } catch (error) {
    console.error('Error parsing scholarship section:', error)
    return null
  }
}

function generateTags(content: string, sourceName: string): string[] {
  const tags: string[] = []
  const lowerContent = content.toLowerCase()
  
  // Add source-based tag
  tags.push(sourceName.toLowerCase().replace(/\s+/g, '-'))
  
  // Common scholarship type tags
  if (lowerContent.includes('merit')) tags.push('merit-based')
  if (lowerContent.includes('need')) tags.push('need-based')
  if (lowerContent.includes('stem')) tags.push('STEM')
  if (lowerContent.includes('undergraduate')) tags.push('undergraduate')
  if (lowerContent.includes('graduate')) tags.push('graduate')
  if (lowerContent.includes('minority')) tags.push('minority')
  if (lowerContent.includes('women')) tags.push('women')
  if (lowerContent.includes('african american') || lowerContent.includes('black')) tags.push('african-american')
  if (lowerContent.includes('leadership')) tags.push('leadership')
  if (lowerContent.includes('community service')) tags.push('community-service')
  
  return tags.slice(0, 5) // Limit to 5 tags
}
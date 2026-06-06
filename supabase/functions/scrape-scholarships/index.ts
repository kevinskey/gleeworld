import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0/+esm'
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

    const { data: sources, error: sourcesError } = await supabase
      .from('scholarship_sources')
      .select('*')
      .eq('is_active', true)

    if (sourcesError) throw sourcesError

    let totalScraped = 0
    let totalInserted = 0
    let totalUpdated = 0

    for (const source of sources || []) {
      try {
        const crawlResult = await app.scrapeUrl(source.url, {
          formats: ['markdown', 'html'],
          onlyMainContent: true
        })

        if (!crawlResult.success || !crawlResult.data) continue

        const scholarships = await extractScholarshipData(crawlResult.data, source)

        for (const scholarship of scholarships) {
          const { data: existing } = await supabase
            .from('scholarships')
            .select('id')
            .eq('title', scholarship.title)
            .eq('source', scholarship.source)
            .single()

          if (existing) {
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
            if (!error) totalUpdated++
          } else {
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
            if (!error) totalInserted++
          }
        }

        totalScraped += scholarships.length

        await supabase
          .from('scholarship_sources')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', source.id)
      } catch (error) {
        console.error(`Error scraping ${source.name}:`, error)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sources_scraped: sources?.length || 0,
        scholarships_found: totalScraped,
        inserted: totalInserted,
        updated: totalUpdated,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in scholarship scraping:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function extractScholarshipData(scrapedData: any, source: any): Promise<ScholarshipData[]> {
  const scholarships: ScholarshipData[] = []
  const content = scrapedData.markdown || scrapedData.html || ''
  if (!content || content.length < 50) return scholarships

  const scholarshipSections = extractScholarshipSections(content)
  for (const section of scholarshipSections) {
    const scholarship = parseScholarshipSection(section, source)
    if (scholarship) scholarships.push(scholarship)
  }
  return scholarships
}

function extractScholarshipSections(content: string): string[] {
  let sections: string[] = []
  const keywordSections = content.split(/(?=.*(?:scholarship|grant|award|fellowship|bursary).*(?:\$|\d+|amount|value|worth))/i)
  sections = [...sections, ...keywordSections]
  const headingSections = content.split(/\n#+\s*([^\n]*(?:scholarship|grant|award|fellowship)[^\n]*)/gi)
  sections = [...sections, ...headingSections]
  const listMatches = content.match(/(?:^|\n)\s*[-*•]\s*[^\n]*(?:scholarship|grant|award)[^\n]*(?:\n(?:\s{2,}[^\n]*)*)/gmi)
  if (listMatches) sections = [...sections, ...listMatches]
  const paragraphMatches = content.match(/[^\n]*(?:scholarship|grant|award)[^\n]*(?:\n(?:[^\n]*(?:\$|\d+|deadline|apply|eligib)[^\n]*)*)/gmi)
  if (paragraphMatches) sections = [...sections, ...paragraphMatches]
  const uniqueSections = [...new Set(sections)]
  return uniqueSections.filter(section =>
    section &&
    section.length > 50 &&
    (section.toLowerCase().includes('scholarship') ||
     section.toLowerCase().includes('grant') ||
     section.toLowerCase().includes('award') ||
     section.toLowerCase().includes('fellowship') ||
     section.toLowerCase().includes('bursary')) &&
    (section.includes('$') ||
     /\b\d+\b/.test(section) ||
     /deadline|due|apply|eligib|requirement/i.test(section) ||
     section.length > 200)
  )
}

function parseScholarshipSection(section: string, source: any): ScholarshipData | null {
  try {
    const cleanSection = section.replace(/\s+/g, ' ').trim()
    let title = null
    const titlePatterns = [
      /#{1,3}\s*(.+?)(?:\n|$)/i,
      /^([^\n]*(?:scholarship|grant|award|fellowship)[^\n]*)/i,
      /(?:^|\n)\s*[-*•]\s*([^\n]*(?:scholarship|grant|award)[^\n]*)/i,
      /^([^.!?]*(?:scholarship|grant|award)[^.!?]*)/i
    ]
    for (const pattern of titlePatterns) {
      const match = cleanSection.match(pattern)
      if (match && match[1] && match[1].trim().length > 10) {
        title = match[1].trim().replace(/^[-*•]\s*/, '')
        break
      }
    }
    if (!title || title.length < 5) return null

    let description = ''
    const descPatterns = [
      new RegExp(`${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[.:]?\\s*([^\\n]{50,500})`, 'i'),
      /(?:description|about|overview)[:\s]*([^.]{50,500})/i,
      /^[^$]*?([^$]{50,500}?)(?:\$|deadline|apply)/i
    ]
    for (const pattern of descPatterns) {
      const match = cleanSection.match(pattern)
      if (match && match[1]) {
        description = match[1].trim().substring(0, 500)
        break
      }
    }
    if (!description) {
      const sentences = cleanSection.split(/[.!?]/)
      description = sentences.slice(0, 3).join('. ').trim().substring(0, 500)
    }

    const amountPatterns = [
      /\$[\d,]+(?:\s*-\s*\$[\d,]+)?/g,
      /(?:worth|value|amount)[:\s]*\$?[\d,]+/gi,
      /(?:up to|maximum|max)[:\s]*\$?[\d,]+/gi
    ]
    let amount = null
    for (const pattern of amountPatterns) {
      const matches = cleanSection.match(pattern)
      if (matches) { amount = matches[0]; break }
    }

    const deadlinePatterns = [
      /(?:deadline|due|apply by|closes?)[:\s]*(\w+\s+\d{1,2},?\s+\d{4})/gi,
      /(?:deadline|due|apply by|closes?)[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      /(?:deadline|due|apply by|closes?)[:\s]*(\d{1,2}-\d{1,2}-\d{4})/gi,
      /(\w+\s+\d{1,2},?\s+\d{4})(?=.*(?:deadline|due|apply))/gi
    ]
    let deadline = null
    for (const pattern of deadlinePatterns) {
      const match = cleanSection.match(pattern)
      if (match) { deadline = match[1]; break }
    }

    const eligibilityPatterns = [
      /(?:eligibility|requirements?|criteria|qualifications?)[:\s]*([^.]{20,300})/gi,
      /(?:must be|open to|available to)[:\s]*([^.]{20,200})/gi,
      /(?:students?|applicants?)[:\s]+(?:must|should|who)[:\s]*([^.]{20,200})/gi
    ]
    let eligibility = null
    for (const pattern of eligibilityPatterns) {
      const match = cleanSection.match(pattern)
      if (match) { eligibility = match[1].trim(); break }
    }

    const tags = generateTags(cleanSection, source.name)

    return {
      title: title.substring(0, 200),
      description: description || cleanSection.substring(0, 300),
      deadline: deadline || undefined,
      amount: amount || undefined,
      eligibility: eligibility || undefined,
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
  tags.push(sourceName.toLowerCase().replace(/\s+/g, '-'))
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
  return tags.slice(0, 5)
}

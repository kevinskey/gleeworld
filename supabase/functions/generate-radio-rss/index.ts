import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RadioEpisode {
  id: string
  title: string
  description: string
  audio_url: string
  published_date: string
  duration: number
  episode_number: number
  season?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Generating RSS feed for Glee World 101...')

    // Fetch episodes from audio archive
    const { data: episodes, error } = await supabase
      .from('audio_archive')
      .select('*')
      .eq('category', 'radio_episode')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching episodes:', error)
      throw error
    }

    console.log(`Found ${episodes?.length || 0} episodes for RSS feed`)

    // Generate RSS XML
    const rssXml = generateRSSXML(episodes || [])

    // Store RSS feed in storage or return directly
    return new Response(rssXml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/rss+xml',
        'Content-Disposition': 'attachment; filename="glee-world-101.rss"'
      },
    })

  } catch (error) {
    console.error('Error generating RSS feed:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate RSS feed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

function generateRSSXML(episodes: any[]): string {
  const now = new Date().toUTCString()
  const baseUrl = 'https://gleeworld.org'
  
  const rssHeader = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Glee World 101</title>
    <description>The official podcast of Spelman College Glee Club featuring performances, alumni stories, and behind-the-scenes content celebrating 100+ years of musical excellence.</description>
    <link>${baseUrl}/radio</link>
    <language>en-us</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <managingEditor>gleeclubofficial@spelman.edu (Spelman Glee Club)</managingEditor>
    <webMaster>gleeclubofficial@spelman.edu (Spelman Glee Club)</webMaster>
    <category>Music</category>
    <category>Education</category>
    <itunes:author>Spelman College Glee Club</itunes:author>
    <itunes:summary>The official podcast of Spelman College Glee Club featuring performances, alumni stories, and behind-the-scenes content celebrating 100+ years of musical excellence.</itunes:summary>
    <itunes:owner>
      <itunes:name>Spelman College Glee Club</itunes:name>
      <itunes:email>gleeclubofficial@spelman.edu</itunes:email>
    </itunes:owner>
    <itunes:image href="${baseUrl}/images/glee-world-101-logo.jpg"/>
    <itunes:category text="Music">
      <itunes:category text="Music History"/>
    </itunes:category>
    <itunes:category text="Education"/>
    <itunes:explicit>clean</itunes:explicit>
    <image>
      <url>${baseUrl}/images/glee-world-101-logo.jpg</url>
      <title>Glee World 101</title>
      <link>${baseUrl}/radio</link>
    </image>`

  const rssItems = episodes.map(episode => {
    const pubDate = new Date(episode.created_at).toUTCString()
    const duration = formatDuration(episode.duration_seconds || 0)
    
    return `
    <item>
      <title><![CDATA[${episode.title}]]></title>
      <description><![CDATA[${episode.description || 'A special episode from Glee World 101'}]]></description>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${episode.audio_url}" type="audio/mpeg" length="0"/>
      <guid isPermaLink="false">${episode.id}</guid>
      <link>${baseUrl}/radio/episodes/${episode.id}</link>
      <itunes:author>Spelman College Glee Club</itunes:author>
      <itunes:duration>${duration}</itunes:duration>
      <itunes:explicit>clean</itunes:explicit>
      <itunes:summary><![CDATA[${episode.description || 'A special episode from Glee World 101'}]]></itunes:summary>
    </item>`
  }).join('')

  const rssFooter = `
  </channel>
</rss>`

  return rssHeader + rssItems + rssFooter
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
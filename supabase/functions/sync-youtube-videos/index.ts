import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YouTubeVideo {
  id: string
  snippet: {
    title: string
    description: string
    publishedAt: string
    thumbnails: {
      default: { url: string }
      medium: { url: string }
      high: { url: string }
    }
    categoryId: string
    tags?: string[]
  }
  contentDetails: {
    duration: string
  }
  statistics: {
    viewCount: string
    likeCount: string
    commentCount: string
  }
}

interface YouTubeChannel {
  id: string
  snippet: {
    title: string
    description: string
    thumbnails: {
      default: { url: string }
      medium: { url: string }
      high: { url: string }
    }
    customUrl?: string
  }
  statistics: {
    subscriberCount: string
    videoCount: string
  }
}

function parseDuration(duration: string): string {
  // Convert ISO 8601 duration (PT4M13S) to readable format (4:13)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return '0:00'
  
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

async function extractChannelId(channelInput: string, apiKey: string): Promise<string | null> {
  try {
    // If it's already a channel ID (starts with UC)
    if (channelInput.startsWith('UC')) {
      return channelInput
    }
    
    // If it's a custom URL or handle, search for it
    let searchQuery = channelInput
    if (channelInput.includes('youtube.com/')) {
      // Extract handle from URL
      const urlMatch = channelInput.match(/youtube\.com\/(?:@|c\/|channel\/|user\/)([^\/\?]+)/)
      if (urlMatch) {
        searchQuery = urlMatch[1]
      }
    } else if (channelInput.startsWith('@')) {
      searchQuery = channelInput.substring(1)
    }
    
    // Search for channel by custom URL
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(searchQuery)}&maxResults=1&key=${apiKey}`
    const searchResponse = await fetch(searchUrl)
    
    if (!searchResponse.ok) {
      throw new Error(`YouTube API search error: ${searchResponse.status}`)
    }
    
    const searchData = await searchResponse.json()
    if (searchData.items && searchData.items.length > 0) {
      return searchData.items[0].snippet.channelId
    }
    
    return null
  } catch (error) {
    console.error('Error extracting channel ID:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let requestBody: any = {}
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY')
    console.log('YouTube API Key status:', youtubeApiKey ? 'Present' : 'Missing')
    
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not configured')
    }

    requestBody = await req.json()
    const { channelInput, maxResults = 50 } = requestBody
    
    console.log('Request body:', { channelInput, maxResults })
    
    if (!channelInput) {
      throw new Error('Channel ID or URL is required')
    }

    // Extract channel ID from various input formats
    console.log('Extracting channel ID from:', channelInput)
    const channelId = await extractChannelId(channelInput, youtubeApiKey)
    console.log('Extracted channel ID:', channelId)
    
    if (!channelId) {
      throw new Error('Could not find channel with the provided input')
    }

    // Get channel details
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${youtubeApiKey}`
    console.log('Fetching channel details from:', channelUrl.replace(youtubeApiKey, '[API_KEY]'))
    const channelResponse = await fetch(channelUrl)
    
    if (!channelResponse.ok) {
      const errorText = await channelResponse.text()
      console.error('Channel fetch error:', channelResponse.status, errorText)
      throw new Error(`Failed to fetch channel: ${channelResponse.status} - ${errorText}`)
    }
    
    const channelData = await channelResponse.json()
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found')
    }
    
    const channel: YouTubeChannel = channelData.items[0]

    // Get channel videos
    const videosUrl = `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&part=snippet&order=date&type=video&maxResults=${maxResults}&key=${youtubeApiKey}`
    console.log('Fetching videos from:', videosUrl.replace(youtubeApiKey, '[API_KEY]'))
    const videosResponse = await fetch(videosUrl)
    
    if (!videosResponse.ok) {
      const errorText = await videosResponse.text()
      console.error('Videos fetch error:', videosResponse.status, errorText)
      throw new Error(`Failed to fetch videos: ${videosResponse.status} - ${errorText}`)
    }
    
    const videosData = await videosResponse.json()
    
    if (!videosData.items || videosData.items.length === 0) {
      throw new Error('No videos found for this channel')
    }

    // Get detailed video information
    const videoIds = videosData.items.map((item: any) => item.id.videoId).join(',')
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}&key=${youtubeApiKey}`
    console.log('Fetching video details for', videosData.items.length, 'videos')
    const videoDetailsResponse = await fetch(videoDetailsUrl)
    
    if (!videoDetailsResponse.ok) {
      const errorText = await videoDetailsResponse.text()
      console.error('Video details fetch error:', videoDetailsResponse.status, errorText)
      throw new Error(`Failed to fetch video details: ${videoDetailsResponse.status} - ${errorText}`)
    }
    
    const videoDetailsData = await videoDetailsResponse.json()

    // Save or update channel in database
    const { data: existingChannel, error: channelSelectError } = await supabaseClient
      .from('youtube_channels')
      .select('id')
      .eq('channel_id', channelId)
      .single()

    let dbChannelId: string

    if (existingChannel) {
      // Update existing channel
      const { data: updatedChannel, error: channelUpdateError } = await supabaseClient
        .from('youtube_channels')
        .update({
          channel_name: channel.snippet.title,
          channel_description: channel.snippet.description,
          channel_url: `https://youtube.com/channel/${channelId}`,
          thumbnail_url: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url,
          subscriber_count: parseInt(channel.statistics.subscriberCount || '0'),
          video_count: parseInt(channel.statistics.videoCount || '0'),
          last_synced_at: new Date().toISOString(),
          channel_handle: channel.snippet.customUrl ? `@${channel.snippet.customUrl}` : null
        })
        .eq('channel_id', channelId)
        .select()
        .single()

      if (channelUpdateError) {
        throw new Error(`Failed to update channel: ${channelUpdateError.message}`)
      }
      
      dbChannelId = existingChannel.id
    } else {
      // Create new channel
      const { data: newChannel, error: channelInsertError } = await supabaseClient
        .from('youtube_channels')
        .insert({
          channel_id: channelId,
          channel_name: channel.snippet.title,
          channel_description: channel.snippet.description,
          channel_url: `https://youtube.com/channel/${channelId}`,
          thumbnail_url: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.medium?.url,
          subscriber_count: parseInt(channel.statistics.subscriberCount || '0'),
          video_count: parseInt(channel.statistics.videoCount || '0'),
          last_synced_at: new Date().toISOString(),
          channel_handle: channel.snippet.customUrl ? `@${channel.snippet.customUrl}` : null
        })
        .select()
        .single()

      if (channelInsertError) {
        throw new Error(`Failed to insert channel: ${channelInsertError.message}`)
      }
      
      dbChannelId = newChannel.id
    }

    // Process and save videos
    const videosToUpsert = videoDetailsData.items.map((video: YouTubeVideo, index: number) => ({
      video_id: video.id,
      channel_id: dbChannelId,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail_url: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url,
      duration: parseDuration(video.contentDetails.duration),
      published_at: video.snippet.publishedAt,
      view_count: parseInt(video.statistics.viewCount || '0'),
      like_count: parseInt(video.statistics.likeCount || '0'),
      comment_count: parseInt(video.statistics.commentCount || '0'),
      tags: video.snippet.tags || [],
      video_url: `https://youtube.com/watch?v=${video.id}`,
      display_order: index + 1
    }))

    console.log('Saving', videosToUpsert.length, 'videos to database')

    // Upsert videos (insert or update if exists)
    const { error: videosError } = await supabaseClient
      .from('youtube_videos')
      .upsert(videosToUpsert, { 
        onConflict: 'video_id',
        ignoreDuplicates: false 
      })

    if (videosError) {
      console.error('Database save error:', videosError)
      throw new Error(`Failed to save videos: ${videosError.message}`)
    }

    console.log('Successfully synced', videosToUpsert.length, 'videos')

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully synced ${videosToUpsert.length} videos from ${channel.snippet.title}`,
      channel: {
        id: dbChannelId,
        name: channel.snippet.title,
        videoCount: videosToUpsert.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error syncing YouTube videos:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      youtubeApiKey: Deno.env.get('YOUTUBE_API_KEY') ? 'Present' : 'Missing',
      requestBody
    })
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: {
        youtubeApiKey: Deno.env.get('YOUTUBE_API_KEY') ? 'Present' : 'Missing',
        timestamp: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
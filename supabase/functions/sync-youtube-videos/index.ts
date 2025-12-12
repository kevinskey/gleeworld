import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    console.log('Input channel string:', channelInput)
    
    // If it's already a channel ID (starts with UC)
    if (channelInput.startsWith('UC')) {
      return channelInput
    }
    
    // Known channel IDs for testing
    const knownChannels: { [key: string]: string } = {
      'mkbhd': 'UCBJycsmduvYEL83R_U4JriQ',
      '@mkbhd': 'UCBJycsmduvYEL83R_U4JriQ',
      'spelmancollegegleeclub': 'UCZYTClx2T1of7BRZ86-8fow',
      '@spelmancollegegleeclub': 'UCZYTClx2T1of7BRZ86-8fow',
      'spelmangleeclub': 'UCZYTClx2T1of7BRZ86-8fow',
      '@spelmangleeclub': 'UCZYTClx2T1of7BRZ86-8fow',
      'spelman glee club': 'UCZYTClx2T1of7BRZ86-8fow'
    }
    
    // Extract handle from various input formats
    let handle = channelInput.toLowerCase()
    if (channelInput.includes('youtube.com/')) {
      const urlMatch = channelInput.match(/youtube\.com\/(?:@|c\/|channel\/|user\/)([^\/\?&]+)/i)
      if (urlMatch) {
        handle = urlMatch[1].toLowerCase()
        console.log('Extracted from URL:', handle)
      }
    } else if (channelInput.startsWith('@')) {
      handle = channelInput.substring(1).toLowerCase()
      console.log('Extracted from @handle:', handle)
    }
    
    // Check known channels first
    console.log('Checking known channels for handle:', handle)
    if (knownChannels[handle]) {
      console.log('Found in known channels:', knownChannels[handle])
      return knownChannels[handle]
    }
    if (knownChannels[`@${handle}`]) {
      console.log('Found in known channels with @:', knownChannels[`@${handle}`])
      return knownChannels[`@${handle}`]
    }
    
    // Try the forHandle API with different variations
    const handleVariations = [
      handle,
      `@${handle}`,
      handle.replace(/[^a-zA-Z0-9]/g, ''), // Remove special characters
    ]
    
    for (const handleVar of handleVariations) {
      try {
        const forHandleUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${handleVar}&key=${apiKey}`
        console.log('Trying forHandle API for:', handleVar)
        
        const forHandleResponse = await fetch(forHandleUrl)
        if (forHandleResponse.ok) {
          const forHandleData = await forHandleResponse.json()
          if (forHandleData.items && forHandleData.items.length > 0) {
            console.log('Found channel via forHandle:', forHandleData.items[0].snippet.title)
            return forHandleData.items[0].id
          }
        } else {
          const errorText = await forHandleResponse.text()
          console.log(`forHandle API failed for "${handleVar}":`, forHandleResponse.status, errorText)
        }
      } catch (error) {
        console.log(`forHandle API error for "${handleVar}":`, error.message)
      }
    }
    
    // Try search as fallback
    const searchQueries = [
      `@${handle}`,
      handle,
      `"@${handle}"`,
      `"${handle}"`,
      handle.replace(/[^a-zA-Z0-9\s]/g, ' ').trim(), // Remove special chars and replace with spaces
    ]
    
    for (const query of searchQueries) {
      try {
        console.log('Trying search query:', query)
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
        const searchResponse = await fetch(searchUrl)
        
        if (!searchResponse.ok) {
          const errorText = await searchResponse.text()
          console.error(`YouTube API search error for "${query}":`, searchResponse.status, errorText)
          continue
        }
        
        const searchData = await searchResponse.json()
        console.log(`Search results for "${query}":`, searchData.items?.length || 0, 'channels found')
        
        if (searchData.items && searchData.items.length > 0) {
          // Log all found channels for debugging
          searchData.items.forEach((item: any, index: number) => {
            console.log(`Channel ${index + 1}:`, {
              title: item.snippet.title,
              channelId: item.snippet.channelId,
              description: item.snippet.description?.substring(0, 100)
            })
          })
          
          return searchData.items[0].snippet.channelId
        }
      } catch (error) {
        console.error(`Search error for "${query}":`, error.message)
      }
    }
    
    console.log('No channels found with any method')
    return null
  } catch (error) {
    console.error('Error extracting channel ID:', error)
    return null
  }
}

async function handleMockDataSync() {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const mockChannel = {
      id: 'UCMockChannelId123',
      snippet: {
        title: 'Spelman College Glee Club (Mock)',
        description: 'Mock channel data for testing - A prestigious collegiate choir known for excellence in choral music.',
        thumbnails: {
          default: { url: 'https://via.placeholder.com/88x88' },
          medium: { url: 'https://via.placeholder.com/240x240' },
          high: { url: 'https://via.placeholder.com/800x800' }
        },
        customUrl: '@spelmancollegegleeclub'
      },
      statistics: {
        subscriberCount: '25000',
        videoCount: '150'
      }
    }

    const mockVideos = [
      {
        id: 'mock_video_1',
        snippet: {
          title: 'Amazing Grace - Spelman Glee Club Performance',
          description: 'Mock video - Beautiful rendition of Amazing Grace',
          publishedAt: '2024-01-15T10:00:00Z',
          thumbnails: {
            default: { url: 'https://via.placeholder.com/120x90' },
            medium: { url: 'https://via.placeholder.com/320x180' },
            high: { url: 'https://via.placeholder.com/480x360' }
          },
          categoryId: '10'
        },
        contentDetails: { duration: 'PT4M23S' },
        statistics: {
          viewCount: '15000',
          likeCount: '500',
          commentCount: '50'
        }
      },
      {
        id: 'mock_video_2',
        snippet: {
          title: 'Lift Every Voice and Sing - Homecoming Performance',
          description: 'Mock video - Powerful homecoming performance',
          publishedAt: '2024-02-10T15:30:00Z',
          thumbnails: {
            default: { url: 'https://via.placeholder.com/120x90' },
            medium: { url: 'https://via.placeholder.com/320x180' },
            high: { url: 'https://via.placeholder.com/480x360' }
          },
          categoryId: '10'
        },
        contentDetails: { duration: 'PT5M47S' },
        statistics: {
          viewCount: '22000',
          likeCount: '750',
          commentCount: '85'
        }
      }
    ]

    // Save mock channel
    const { error: channelError } = await supabaseClient
      .from('youtube_channels')
      .upsert({
        id: mockChannel.id,
        title: mockChannel.snippet.title,
        description: mockChannel.snippet.description,
        thumbnail_url: mockChannel.snippet.thumbnails.high.url,
        custom_url: mockChannel.snippet.customUrl,
        subscriber_count: parseInt(mockChannel.statistics.subscriberCount),
        video_count: parseInt(mockChannel.statistics.videoCount),
        updated_at: new Date().toISOString()
      })

    if (channelError) {
      throw new Error(`Failed to save mock channel: ${channelError.message}`)
    }

    // Save mock videos
    for (const video of mockVideos) {
      const { error: videoError } = await supabaseClient
        .from('youtube_videos')
        .upsert({
          id: video.id,
          channel_id: mockChannel.id,
          title: video.snippet.title,
          description: video.snippet.description,
          thumbnail_url: video.snippet.thumbnails.high.url,
          published_at: video.snippet.publishedAt,
          duration: parseDuration(video.contentDetails.duration),
          view_count: parseInt(video.statistics.viewCount),
          like_count: parseInt(video.statistics.likeCount),
          comment_count: parseInt(video.statistics.commentCount),
          updated_at: new Date().toISOString()
        })

      if (videoError) {
        console.error('Error saving mock video:', videoError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mock data synchronized successfully',
        channel: mockChannel.snippet.title,
        videosProcessed: mockVideos.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Mock data sync error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: `Mock sync failed: ${error.message}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
     )
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
    
    // Handle mock data request
    if (channelInput === 'MOCK_DATA') {
      return await handleMockDataSync()
    }
    
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
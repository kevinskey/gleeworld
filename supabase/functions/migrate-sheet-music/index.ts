import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SheetMusicRecord {
  id: string;
  title: string;
  pdf_url: string | null;
  thumbnail_url: string | null;
}

serve(async (req) => {
  console.log('migrate-sheet-music: Function invoked with method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('migrate-sheet-music: Parsing request body...')
    const body = await req.json()
    console.log('migrate-sheet-music: Request body:', body)
    
    const { action, reader_api_url, reader_api_key } = body

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'migrate_pdfs') {
      console.log('Starting PDF migration from reader.gleeworld.org...')

      // Fetch all sheet music records that need PDF migration
      const { data: sheetMusicRecords, error: fetchError } = await supabaseClient
        .from('gw_sheet_music')
        .select('id, title, pdf_url, thumbnail_url')
        .is('pdf_url', null) // Only migrate records without PDF URLs
        .limit(50) // Process in batches

      if (fetchError) {
        throw new Error(`Failed to fetch sheet music records: ${fetchError.message}`)
      }

      console.log(`Found ${sheetMusicRecords?.length || 0} records to migrate`)

      const results = []
      
      for (const record of sheetMusicRecords || []) {
        try {
          console.log(`Processing: ${record.title} (${record.id})`)

          // Construct the reader.gleeworld.org PDF URL
          // Adjust this URL pattern based on your actual reader.gleeworld.org structure
          const readerPdfUrl = `${reader_api_url}/pdfs/${record.id}.pdf`
          
          // Fetch the PDF from reader.gleeworld.org
          const pdfResponse = await fetch(readerPdfUrl, {
            headers: reader_api_key ? { 'Authorization': `Bearer ${reader_api_key}` } : {}
          })

          if (!pdfResponse.ok) {
            console.log(`PDF not found for ${record.title}: ${pdfResponse.status}`)
            results.push({
              id: record.id,
              title: record.title,
              status: 'pdf_not_found',
              error: `HTTP ${pdfResponse.status}`
            })
            continue
          }

          const pdfBuffer = await pdfResponse.arrayBuffer()
          const pdfFile = new File([pdfBuffer], `${record.id}.pdf`, { type: 'application/pdf' })

          // Upload to Supabase storage
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('sheet-music')
            .upload(`pdfs/${record.id}.pdf`, pdfFile, {
              contentType: 'application/pdf',
              upsert: true
            })

          if (uploadError) {
            console.error(`Upload failed for ${record.title}:`, uploadError)
            results.push({
              id: record.id,
              title: record.title,
              status: 'upload_failed',
              error: uploadError.message
            })
            continue
          }

          // Get the public URL
          const { data: publicUrlData } = supabaseClient.storage
            .from('sheet-music')
            .getPublicUrl(`pdfs/${record.id}.pdf`)

          // Update the database record with the new PDF URL
          const { error: updateError } = await supabaseClient
            .from('gw_sheet_music')
            .update({ pdf_url: publicUrlData.publicUrl })
            .eq('id', record.id)

          if (updateError) {
            console.error(`Database update failed for ${record.title}:`, updateError)
            results.push({
              id: record.id,
              title: record.title,
              status: 'db_update_failed',
              error: updateError.message
            })
            continue
          }

          console.log(`Successfully migrated: ${record.title}`)
          results.push({
            id: record.id,
            title: record.title,
            status: 'success',
            pdf_url: publicUrlData.publicUrl
          })

        } catch (error) {
          console.error(`Error processing ${record.title}:`, error)
          results.push({
            id: record.id,
            title: record.title,
            status: 'error',
            error: error.message
          })
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Processed ${results.length} records`,
          results: results,
          summary: {
            total: results.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status !== 'success').length
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (action === 'check_status') {
      console.log('migrate-sheet-music: Checking migration status...')
      // Check migration status
      const { count: totalCount, error: totalError } = await supabaseClient
        .from('gw_sheet_music')
        .select('id', { count: 'exact', head: true })

      const { count: migratedCount, error: migratedError } = await supabaseClient
        .from('gw_sheet_music')
        .select('id', { count: 'exact', head: true })
        .not('pdf_url', 'is', null)

      const { count: pendingCount, error: pendingError } = await supabaseClient
        .from('gw_sheet_music')
        .select('id', { count: 'exact', head: true })
        .is('pdf_url', null)

      console.log('migrate-sheet-music: Counts:', { totalCount, migratedCount, pendingCount })

      if (totalError || migratedError || pendingError) {
        console.error('migrate-sheet-music: Count errors:', { totalError, migratedError, pendingError })
      }

      const result = {
        total_records: totalCount || 0,
        migrated_records: migratedCount || 0,
        pending_records: pendingCount || 0,
        migration_progress: totalCount ? 
          Math.round(((migratedCount || 0) / totalCount) * 100) : 0
      }

      console.log('migrate-sheet-music: Returning status:', result)

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Migration failed', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
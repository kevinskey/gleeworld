import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    
    const { action, reader_api_url } = body
    
    // Get API key from secrets
    const reader_api_key = Deno.env.get('READER_GLEEWORLD_API_KEY') ?? ''

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'migrate_pdfs') {
      console.log('Starting PDF migration from reader.gleeworld.org...')

      // Fetch all sheet music records that need PDF migration
      // Include records with null pdf_url OR example.com URLs (placeholder data)
      const { data: sheetMusicRecords, error: fetchError } = await supabaseClient
        .from('gw_sheet_music')
        .select('id, title, pdf_url, thumbnail_url')
        .or('pdf_url.is.null,pdf_url.like.%example.com%') // Migrate null PDFs or example URLs
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

    if (action === 'copy_from_bucket') {
      console.log('Starting PDF copy from external Supabase (reader.gleeworld.org)...')

      // Get external Supabase credentials from secrets
      const readerSupabaseUrl = Deno.env.get('READER_SUPABASE_URL');
      const readerSupabaseKey = Deno.env.get('READER_SUPABASE_ANON_KEY');
      
      console.log('External credentials check:', {
        hasUrl: !!readerSupabaseUrl,
        hasKey: !!readerSupabaseKey,
        urlPrefix: readerSupabaseUrl?.substring(0, 20)
      });
      
      if (!readerSupabaseUrl || !readerSupabaseKey) {
        console.error('Missing external Supabase credentials');
        return new Response(
          JSON.stringify({ 
            error: 'External Supabase credentials not configured',
            details: `URL: ${!!readerSupabaseUrl}, Key: ${!!readerSupabaseKey}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Create client for external Supabase
      const externalSupabase = createClient(readerSupabaseUrl, readerSupabaseKey);
      
      console.log('Connected to external Supabase. Due to RLS policy issues, trying alternative approach...');

      // Since the external Supabase has RLS policy issues, let's try a different approach
      // First, get our sheet music records and try to find corresponding PDFs
      const { data: sheetMusicRecords, error: fetchError } = await supabaseClient
        .from('gw_sheet_music')
        .select('id, title, pdf_url, thumbnail_url')
        .or('pdf_url.is.null,pdf_url.like.%example.com%') // Migrate null PDFs or example URLs
        .limit(50) // Process in batches

      if (fetchError) {
        throw new Error(`Failed to fetch sheet music records: ${fetchError.message}`)
      }

      console.log(`Found ${sheetMusicRecords?.length || 0} records to process`)

      if (!sheetMusicRecords || sheetMusicRecords.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'No sheet music records need PDF migration',
            results: [],
            summary: { total: 0, successful: 0, failed: 0, database_updates: 0 }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      const results = []
      
      // Try to download PDFs directly using known patterns
      for (const record of sheetMusicRecords) {
        try {
          console.log(`Processing record: ${record.title} (${record.id})`)

          // Try various filename patterns
          const possibleFilenames = [
            `${record.id}.pdf`,
            `${record.title}.pdf`,
            `${record.title.replace(/\s+/g, '_')}.pdf`,
            `${record.title.replace(/\s+/g, '-')}.pdf`,
            `${record.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
          ]

          let fileData = null
          let successfulFilename = null

          // Try each possible filename
          for (const filename of possibleFilenames) {
            try {
              console.log(`Trying to download: ${filename}`)
              const { data, error } = await externalSupabase.storage
                .from('pdfs')
                .download(filename)

              if (!error && data) {
                fileData = data
                successfulFilename = filename
                console.log(`Successfully found file: ${filename}`)
                break
              }
            } catch (err) {
              console.log(`File not found: ${filename}`)
              continue
            }
          }

          if (!fileData) {
            console.log(`No PDF found for ${record.title}`)
            results.push({
              id: record.id,
              title: record.title,
              status: 'pdf_not_found',
              error: 'No matching PDF file found in external bucket'
            })
            continue
          }

          // Generate a safe filename for our bucket
          const safeFilename = `${record.id}.pdf`

          // Upload to our sheet-music bucket
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('sheet-music')
            .upload(`pdfs/${safeFilename}`, fileData, {
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
            .getPublicUrl(`pdfs/${safeFilename}`)

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

          console.log(`Successfully copied: ${record.title} from ${successfulFilename}`)
          results.push({
            id: record.id,
            title: record.title,
            status: 'success',
            pdf_url: publicUrlData.publicUrl,
            source_file: successfulFilename,
            database_updated: true
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
          message: `Processed ${results.length} files from external bucket`,
          results: results,
          summary: {
            total: results.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status !== 'success').length,
            database_updates: results.filter(r => r.database_updated).length
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (action === 'discover_and_create') {
      console.log('Starting PDF discovery and record creation from external Supabase...')

      // Get external Supabase credentials from secrets
      const readerSupabaseUrl = Deno.env.get('READER_SUPABASE_URL');
      const readerSupabaseKey = Deno.env.get('READER_SUPABASE_ANON_KEY');
      
      if (!readerSupabaseUrl || !readerSupabaseKey) {
        return new Response(
          JSON.stringify({ error: 'External Supabase credentials not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Create client for external Supabase
      const externalSupabase = createClient(readerSupabaseUrl, readerSupabaseKey);
      
      console.log('Connected to external Supabase. Trying to discover PDFs...');

      const results = []
      
      // Since we can't list files due to RLS issues, let's try common PDF naming patterns
      // or try to download from known IDs/patterns
      const potentialFilenames = [
        // Try some common patterns - you might need to provide actual filenames
        'sample.pdf',
        'test.pdf',
        'sheet1.pdf',
        'sheet2.pdf',
        'music1.pdf',
        'music2.pdf',
        // Add more known filenames here
      ]

      // Try to get all existing records from the external gw_sheet_music table
      // This might work even if storage listing doesn't
      try {
        console.log('Trying to fetch sheet music records from external database...');
        const { data: externalRecords, error: externalError } = await externalSupabase
          .from('gw_sheet_music')
          .select('id, title, pdf_url, thumbnail_url')
          .limit(100);

        if (!externalError && externalRecords && externalRecords.length > 0) {
          console.log(`Found ${externalRecords.length} records in external database`);
          
          for (const record of externalRecords) {
            try {
              console.log(`Processing external record: ${record.title} (${record.id})`);

              // Create record in our database first
              const { data: newRecord, error: insertError } = await supabaseClient
                .from('gw_sheet_music')
                .insert({
                  id: record.id,
                  title: record.title,
                  pdf_url: null, // We'll update this after downloading
                  thumbnail_url: record.thumbnail_url,
                  created_at: new Date().toISOString()
                })
                .select()
                .single();

              if (insertError) {
                console.error(`Failed to create record for ${record.title}:`, insertError);
                results.push({
                  id: record.id,
                  title: record.title,
                  status: 'record_creation_failed',
                  error: insertError.message
                });
                continue;
              }

              // Now try to download the PDF using various filename patterns
              const possibleFilenames = [
                `${record.id}.pdf`,
                `${record.title}.pdf`,
                `${record.title.replace(/\s+/g, '_')}.pdf`,
                `${record.title.replace(/\s+/g, '-')}.pdf`,
                `${record.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
              ];

              let fileData = null;
              let successfulFilename = null;

              for (const filename of possibleFilenames) {
                try {
                  console.log(`Trying to download: ${filename}`);
                  const { data, error } = await externalSupabase.storage
                    .from('pdfs')
                    .download(filename);

                  if (!error && data) {
                    fileData = data;
                    successfulFilename = filename;
                    console.log(`Successfully found file: ${filename}`);
                    break;
                  }
                } catch (err) {
                  continue;
                }
              }

              if (fileData) {
                // Upload to our sheet-music bucket
                const { data: uploadData, error: uploadError } = await supabaseClient.storage
                  .from('sheet-music')
                  .upload(`pdfs/${record.id}.pdf`, fileData, {
                    contentType: 'application/pdf',
                    upsert: true
                  });

                if (!uploadError) {
                  // Get the public URL and update the record
                  const { data: publicUrlData } = supabaseClient.storage
                    .from('sheet-music')
                    .getPublicUrl(`pdfs/${record.id}.pdf`);

                  await supabaseClient
                    .from('gw_sheet_music')
                    .update({ pdf_url: publicUrlData.publicUrl })
                    .eq('id', record.id);

                  results.push({
                    id: record.id,
                    title: record.title,
                    status: 'success',
                    pdf_url: publicUrlData.publicUrl,
                    source_file: successfulFilename
                  });
                } else {
                  results.push({
                    id: record.id,
                    title: record.title,
                    status: 'upload_failed',
                    error: uploadError.message
                  });
                }
              } else {
                results.push({
                  id: record.id,
                  title: record.title,
                  status: 'pdf_not_found',
                  error: 'No matching PDF file found'
                });
              }

            } catch (error) {
              console.error(`Error processing external record ${record.id}:`, error);
              results.push({
                id: record.id,
                title: record.title,
                status: 'error',
                error: error.message
              });
            }
          }
        } else {
          console.log('No records found in external database or access denied');
          return new Response(
            JSON.stringify({ 
              error: 'Could not access external sheet music records',
              details: externalError?.message || 'No records found'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      } catch (error) {
        console.error('Error accessing external database:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to access external database',
            details: error.message
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Discovered and processed ${results.length} records`,
          results: results,
          summary: {
            total: results.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status !== 'success').length,
            records_created: results.length,
            pdfs_migrated: results.filter(r => r.status === 'success').length
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
        .not('pdf_url', 'like', '%example.com%') // Exclude example URLs from migrated count

      const { count: pendingCount, error: pendingError } = await supabaseClient
        .from('gw_sheet_music')
        .select('id', { count: 'exact', head: true })
        .or('pdf_url.is.null,pdf_url.like.%example.com%') // Count null PDFs and example URLs as pending

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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is secretary or admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('gw_profiles')
      .select('is_admin, is_super_admin, role, exec_board_role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAuthorized = profile.is_admin || 
                        profile.is_super_admin || 
                        profile.role === 'admin' || 
                        profile.role === 'super-admin' ||
                        profile.exec_board_role === 'secretary';

    if (!isAuthorized) {
      console.error('User not authorized:', profile);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only secretaries and admins can upload attendance records' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the request body
    const { csvData, eventId } = await req.json()

    if (!csvData || !eventId) {
      return new Response(
        JSON.stringify({ error: 'CSV data and event ID are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse CSV data
    const lines = csvData.trim().split('\n')
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase())
    
    // Expected headers: email or user_id, attendance_status, notes (optional), check_in_time (optional)
    const emailIndex = headers.indexOf('email')
    const userIdIndex = headers.indexOf('user_id')
    const statusIndex = headers.indexOf('attendance_status') !== -1 ? headers.indexOf('attendance_status') : headers.indexOf('status')
    const notesIndex = headers.indexOf('notes')
    const checkInIndex = headers.indexOf('check_in_time')

    if ((emailIndex === -1 && userIdIndex === -1) || statusIndex === -1) {
      return new Response(
        JSON.stringify({ 
          error: 'CSV must contain either email or user_id column, and attendance_status column',
          example: 'email,attendance_status,notes,check_in_time\nuser@example.com,present,On time,2024-01-01T10:00:00Z'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const attendanceRecords = []
    const errors = []

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const values = line.split(',').map((v: string) => v.trim())
      
      let userId = userIdIndex !== -1 ? values[userIdIndex] : null
      const email = emailIndex !== -1 ? values[emailIndex] : null
      const status = values[statusIndex]
      const notes = notesIndex !== -1 ? values[notesIndex] : null
      const checkInTime = checkInIndex !== -1 ? values[checkInIndex] : null

      // If email provided, look up user_id
      if (email && !userId) {
        const { data: userProfile, error: lookupError } = await supabaseClient
          .from('gw_profiles')
          .select('user_id')
          .eq('email', email)
          .single()

        if (lookupError || !userProfile) {
          errors.push({ row: i + 1, email, error: 'User not found' })
          continue
        }
        userId = userProfile.user_id
      }

      if (!userId) {
        errors.push({ row: i + 1, error: 'No user_id or email provided' })
        continue
      }

      // Validate status
      const validStatuses = ['present', 'absent', 'excused', 'late', 'left_early']
      if (!validStatuses.includes(status.toLowerCase())) {
        errors.push({ 
          row: i + 1, 
          error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` 
        })
        continue
      }

      attendanceRecords.push({
        event_id: eventId,
        user_id: userId,
        attendance_status: status.toLowerCase(),
        notes: notes || null,
        check_in_time: checkInTime || null,
        created_at: new Date().toISOString()
      })
    }

    if (attendanceRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No valid attendance records found in CSV',
          errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert attendance records
    const { data: insertedRecords, error: insertError } = await supabaseClient
      .from('gw_event_attendance')
      .insert(attendanceRecords)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to insert attendance records', 
          details: insertError.message,
          errors 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully uploaded ${insertedRecords.length} attendance records`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully uploaded ${insertedRecords.length} attendance records`,
        recordsInserted: insertedRecords.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing CSV:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

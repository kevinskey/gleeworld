import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Touring calendar ID
const TOURING_CALENDAR_ID = "a387a4de-4a01-46e4-af1c-5c3b18423177";

interface SyncContractRequest {
  contractId: string;
}

interface ContractMetadata {
  HOST_NAME?: string;
  HOST_LOCATION?: string;
  HOST_CONTACT_NAME?: string;
  HOST_CONTACT_EMAIL?: string;
  HOST_CONTACT_PHONE?: string;
  HOST_SIGNATORY_NAME?: string;
  HOST_SIGNATORY_TITLE?: string;
  HOST_DEPARTMENT?: string;
  PERFORMANCE_DATE?: string;
  START_TIME?: string;
  END_TIME?: string;
  VENUE_NAME?: string;
  VENUE_ADDRESS?: string;
  HONORARIUM_AMOUNT?: string;
  DEPOSIT_AMOUNT?: string;
  PERFORMER_COUNT?: string;
  ROOM_COUNT?: string;
  DIRECTOR_ROOMS?: string;
  SOUND_CHECK_HOURS?: string;
  SPECIAL_NOTES?: string;
}

function parseTimeString(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;
  
  // Try parsing formats like "4:00 PM", "16:00", etc.
  const match12 = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = parseInt(match12[2]);
    const period = match12[3].toUpperCase();
    
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    
    return { hours, minutes };
  }
  
  const match24 = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match24) {
    return { hours: parseInt(match24[1]), minutes: parseInt(match24[2]) };
  }
  
  return null;
}

function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Remove ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
  const cleanedDateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  
  // Try parsing the cleaned string
  const date = new Date(cleanedDateStr);
  if (!isNaN(date.getTime())) {
    console.log(`Parsed date "${dateStr}" -> ${date.toISOString()}`);
    return date;
  }
  
  // Try manual parsing for formats like "March 7, 2025" or "March 7 2025"
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const monthMatch = cleanedDateStr.toLowerCase().match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthMatch) {
    const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
    if (monthIndex !== -1) {
      const parsedDate = new Date(parseInt(monthMatch[3]), monthIndex, parseInt(monthMatch[2]));
      if (!isNaN(parsedDate.getTime())) {
        console.log(`Manually parsed date "${dateStr}" -> ${parsedDate.toISOString()}`);
        return parsedDate;
      }
    }
  }
  
  console.log(`Failed to parse date: "${dateStr}"`);
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId }: SyncContractRequest = await req.json();

    console.log("Syncing contract to calendar:", contractId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get contract with metadata
    const { data: contract, error: contractError } = await supabase
      .from('contracts_v2')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contract not found: ' + (contractError?.message || 'Unknown error'));
    }

    // Allow draft, pending, sent, and completed contracts to sync
    const allowedStatuses = ['draft', 'pending', 'sent', 'pending_recipient', 'completed'];
    if (!allowedStatuses.includes(contract.status)) {
      console.log("Contract status not eligible for sync:", contract.status);
      return new Response(JSON.stringify({ 
        success: false, 
        message: `Contract status "${contract.status}" is not eligible for calendar sync`
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Parse contract metadata
    let metadata: ContractMetadata = {};
    try {
      metadata = contract.contract_metadata || {};
    } catch (e) {
      console.error('Error parsing contract metadata:', e);
    }

    // If no metadata, try to parse from contract content
    if (!metadata.HOST_NAME || !metadata.PERFORMANCE_DATE) {
      console.log("Metadata incomplete, attempting to parse from contract content");
      metadata = parseContractContent(contract.content, metadata);
      
      // Save parsed metadata back to contract for future use
      if (metadata.HOST_NAME || metadata.PERFORMANCE_DATE) {
        const { error: updateMetaError } = await supabase
          .from('contracts_v2')
          .update({ contract_metadata: metadata })
          .eq('id', contractId);
        
        if (updateMetaError) {
          console.error('Error saving parsed metadata:', updateMetaError);
        } else {
          console.log('Saved parsed metadata to contract');
        }
      }
    }

    // Build event dates
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    const performanceDate = parseDateString(metadata.PERFORMANCE_DATE || '');
    if (performanceDate) {
      const startTime = parseTimeString(metadata.START_TIME || '');
      const endTime = parseTimeString(metadata.END_TIME || '');
      
      startDate = new Date(performanceDate);
      if (startTime) {
        startDate.setHours(startTime.hours, startTime.minutes, 0, 0);
      } else {
        startDate.setHours(18, 0, 0, 0); // Default 6 PM
      }
      
      endDate = new Date(performanceDate);
      if (endTime) {
        endDate.setHours(endTime.hours, endTime.minutes, 0, 0);
      } else {
        endDate.setHours(20, 0, 0, 0); // Default 8 PM
      }
    } else {
      // Default to 30 days from now if no date found
      startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      startDate.setHours(18, 0, 0, 0);
      
      endDate = new Date(startDate);
      endDate.setHours(20, 0, 0, 0);
    }

    // Build event description
    const description = buildEventDescription(contract, metadata);

    // Check if calendar event already exists
    const { data: existingEvent, error: existingEventError } = await supabase
      .from('gw_events')
      .select('*')
      .eq('contract_id', contractId)
      .maybeSingle();

    if (existingEventError) {
      console.error('Error checking existing event:', existingEventError);
    }

    let eventId: string;

    if (existingEvent) {
      // Update existing event
      console.log("Updating existing calendar event:", existingEvent.id);
      
      const { data: updatedEvent, error: updateError } = await supabase
        .from('gw_events')
        .update({
          title: `[Concert] ${metadata.HOST_NAME || contract.title}`,
          description,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          venue_name: metadata.VENUE_NAME || null,
          address: metadata.VENUE_ADDRESS || null,
          location: metadata.HOST_LOCATION || null,
          event_type: 'performance',
          is_public: true,
          attendance_required: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEvent.id)
        .select()
        .single();

      if (updateError) {
        throw new Error('Failed to update calendar event: ' + updateError.message);
      }

      eventId = updatedEvent.id;
    } else {
      // Create new event
      console.log("Creating new calendar event");
      
      const { data: newEvent, error: createError } = await supabase
        .from('gw_events')
        .insert({
          calendar_id: TOURING_CALENDAR_ID,
          title: `[Concert] ${metadata.HOST_NAME || contract.title}`,
          description,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          venue_name: metadata.VENUE_NAME || null,
          address: metadata.VENUE_ADDRESS || null,
          location: metadata.HOST_LOCATION || null,
          event_type: 'performance',
          is_public: true,
          attendance_required: true,
          created_by: contract.created_by,
          contract_id: contractId,
        })
        .select()
        .single();

      if (createError) {
        throw new Error('Failed to create calendar event: ' + createError.message);
      }

      eventId = newEvent.id;
    }

    // Update contract with calendar event ID
    const { error: contractUpdateError } = await supabase
      .from('contracts_v2')
      .update({ 
        calendar_event_id: eventId,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (contractUpdateError) {
      console.error('Error updating contract with calendar event ID:', contractUpdateError);
    }

    console.log("Contract synced to calendar successfully. Event ID:", eventId);

    return new Response(JSON.stringify({ 
      success: true, 
      eventId,
      message: existingEvent ? 'Calendar event updated' : 'Calendar event created'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in sync-contract-to-calendar:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function parseContractContent(content: string, existingMetadata: ContractMetadata): ContractMetadata {
  const metadata = { ...existingMetadata };
  
  // Try to extract host name from title pattern "Artist Name - Event Name"
  const titleMatch = content.match(/between[^a]+and\s+(.+?),\s+which is located/i);
  if (titleMatch && !metadata.HOST_NAME) {
    metadata.HOST_NAME = titleMatch[1].trim();
  }
  
  // Also try from contract title format
  if (!metadata.HOST_NAME) {
    const dashMatch = content.match(/Contract:\s*(.+?)\s+-\s+(.+?)(?:\n|$)/i);
    if (dashMatch) {
      metadata.HOST_NAME = dashMatch[2].trim(); // Event name as host
    }
  }
  
  // Try to extract location
  const locationMatch = content.match(/located in\s+(.+?)\s+\(/);
  if (locationMatch && !metadata.HOST_LOCATION) {
    metadata.HOST_LOCATION = locationMatch[1].trim();
  }
  
  // Try to extract performance date - various formats
  const datePatterns = [
    /performance shall be on\s+(.+?),?\s+beginning/i,
    /Performance Date:\s*(.+?)(?:\n|$)/i,
    /Date of Performance:\s*(.+?)(?:\n|$)/i,
    /on\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
  ];
  
  for (const pattern of datePatterns) {
    const dateMatch = content.match(pattern);
    if (dateMatch && !metadata.PERFORMANCE_DATE) {
      metadata.PERFORMANCE_DATE = dateMatch[1]?.trim() || dateMatch[0]?.trim();
      break;
    }
  }
  
  // Try to extract venue
  const venuePatterns = [
    /shall be held at\s+(.+?),\s+located at/i,
    /Venue:\s*(.+?)(?:\n|$)/i,
    /Location:\s*(.+?)(?:\n|$)/i,
  ];
  
  for (const pattern of venuePatterns) {
    const venueMatch = content.match(pattern);
    if (venueMatch && !metadata.VENUE_NAME) {
      metadata.VENUE_NAME = venueMatch[1].trim();
      break;
    }
  }
  
  // Try to extract venue address
  const addressMatch = content.match(/located at\s+(.+?)\./);
  if (addressMatch && !metadata.VENUE_ADDRESS) {
    metadata.VENUE_ADDRESS = addressMatch[1].trim();
  }
  
  // Try to extract honorarium
  const honorariumPatterns = [
    /honorarium in the sum of\s+(.+?)\s+dollars/i,
    /Honorarium:\s*\$?(.+?)(?:\n|$)/i,
    /stipend of\s+\$?(.+?)(?:\s|$)/i,
  ];
  
  for (const pattern of honorariumPatterns) {
    const honorariumMatch = content.match(pattern);
    if (honorariumMatch && !metadata.HONORARIUM_AMOUNT) {
      metadata.HONORARIUM_AMOUNT = honorariumMatch[1].trim().replace(/[,$]/g, '');
      break;
    }
  }
  
  console.log("Parsed metadata from content:", metadata);
  
  return metadata;
}

function buildEventDescription(contract: any, metadata: ContractMetadata): string {
  const lines: string[] = [];
  
  lines.push("📋 SPELMAN COLLEGE GLEE CLUB TOUR PERFORMANCE");
  lines.push("");
  
  if (metadata.HOST_NAME) {
    lines.push(`🏢 Host: ${metadata.HOST_NAME}`);
  }
  
  if (metadata.HOST_CONTACT_NAME) {
    lines.push(`👤 Contact: ${metadata.HOST_CONTACT_NAME}`);
    if (metadata.HOST_CONTACT_EMAIL) {
      lines.push(`📧 Email: ${metadata.HOST_CONTACT_EMAIL}`);
    }
    if (metadata.HOST_CONTACT_PHONE) {
      lines.push(`📞 Phone: ${metadata.HOST_CONTACT_PHONE}`);
    }
  }
  
  lines.push("");
  
  if (metadata.VENUE_NAME) {
    lines.push(`📍 Venue: ${metadata.VENUE_NAME}`);
  }
  if (metadata.VENUE_ADDRESS) {
    lines.push(`📍 Address: ${metadata.VENUE_ADDRESS}`);
  }
  
  lines.push("");
  
  if (metadata.HONORARIUM_AMOUNT) {
    lines.push(`💰 Honorarium: $${metadata.HONORARIUM_AMOUNT}`);
  }
  if (metadata.DEPOSIT_AMOUNT) {
    lines.push(`💵 Deposit: $${metadata.DEPOSIT_AMOUNT}`);
  }
  
  if (metadata.PERFORMER_COUNT) {
    lines.push(`👥 Performers: ${metadata.PERFORMER_COUNT}`);
  }
  
  if (metadata.SPECIAL_NOTES) {
    lines.push("");
    lines.push(`📝 Notes: ${metadata.SPECIAL_NOTES}`);
  }
  
  lines.push("");
  lines.push(`📄 Contract: ${contract.title}`);
  lines.push(`✅ Status: Fully Executed`);
  
  return lines.join("\n");
}

serve(handler);

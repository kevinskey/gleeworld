import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface SyncRequest {
  integrationId: string;
  syncType?: 'full' | 'incremental';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId, syncType = 'full' }: SyncRequest = await req.json();

    console.log('Starting Square product sync:', { integrationId, syncType });

    // Get Square integration details
    const { data: integration, error: integrationError } = await supabase
      .from('square_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      throw new Error('Square integration not found');
    }

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('square_sync_logs')
      .insert({
        integration_id: integrationId,
        sync_type: 'products',
        status: 'running'
      })
      .select()
      .single();

    if (syncLogError) {
      throw new Error('Failed to create sync log');
    }

    const squareApiUrl = integration.environment === 'production'
      ? 'https://connect.squareup.com/v2'
      : 'https://connect.squareupsandbox.com/v2';

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let cursor: string | undefined;

    try {
      do {
        // Fetch products from Square
        const catalogUrl = new URL(`${squareApiUrl}/catalog/list`);
        catalogUrl.searchParams.set('types', 'ITEM');
        if (cursor) {
          catalogUrl.searchParams.set('cursor', cursor);
        }

        const catalogResponse = await fetch(catalogUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Square-Version': '2023-10-18'
          }
        });

        const catalogData = await catalogResponse.json();

        if (!catalogResponse.ok) {
          throw new Error(catalogData.errors?.[0]?.detail || 'Failed to fetch catalog');
        }

        const items = catalogData.objects || [];
        cursor = catalogData.cursor;

        console.log(`Processing ${items.length} items from Square`);

        for (const item of items) {
          try {
            totalProcessed++;

            // Check if product already exists in mapping
            const { data: existingMapping } = await supabase
              .from('square_product_mappings')
              .select('local_product_id')
              .eq('integration_id', integrationId)
              .eq('square_catalog_object_id', item.id)
              .single();

            const productData = {
              title: item.item_data?.name || 'Untitled Product',
              description: item.item_data?.description || '',
              is_active: !item.item_data?.is_deleted,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Get the first variation for pricing
            const variation = item.item_data?.variations?.[0];
            if (variation?.item_variation_data?.price_money) {
              productData.price = variation.item_variation_data.price_money.amount / 100; // Convert from cents
            }

            let localProductId: string;

            if (existingMapping) {
              // Update existing product
              const { error: updateError } = await supabase
                .from('gw_products')
                .update(productData)
                .eq('id', existingMapping.local_product_id);

              if (updateError) {
                throw updateError;
              }

              localProductId = existingMapping.local_product_id;
              totalUpdated++;
              console.log(`Updated product: ${productData.title}`);
            } else {
              // Create new product
              const { data: newProduct, error: createError } = await supabase
                .from('gw_products')
                .insert(productData)
                .select()
                .single();

              if (createError) {
                throw createError;
              }

              localProductId = newProduct.id;

              // Create mapping
              await supabase
                .from('square_product_mappings')
                .insert({
                  integration_id: integrationId,
                  local_product_id: localProductId,
                  square_catalog_object_id: item.id,
                  square_item_variation_id: variation?.id
                });

              totalCreated++;
              console.log(`Created product: ${productData.title}`);
            }

            // Update mapping sync timestamp
            await supabase
              .from('square_product_mappings')
              .update({ last_synced_at: new Date().toISOString() })
              .eq('integration_id', integrationId)
              .eq('square_catalog_object_id', item.id);

          } catch (itemError) {
            console.error(`Failed to process item ${item.id}:`, itemError);
            totalFailed++;
          }
        }

      } while (cursor);

      // Update sync log with success
      await supabase
        .from('square_sync_logs')
        .update({
          status: 'completed',
          items_processed: totalProcessed,
          items_created: totalCreated,
          items_updated: totalUpdated,
          items_failed: totalFailed,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      // Update integration last sync time
      await supabase
        .from('square_integrations')
        .update({
          last_sync_at: new Date().toISOString()
        })
        .eq('id', integrationId);

      console.log('Square product sync completed successfully:', {
        processed: totalProcessed,
        created: totalCreated,
        updated: totalUpdated,
        failed: totalFailed
      });

      return new Response(JSON.stringify({
        success: true,
        syncLogId: syncLog.id,
        summary: {
          processed: totalProcessed,
          created: totalCreated,
          updated: totalUpdated,
          failed: totalFailed
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (syncError) {
      console.error('Square sync error:', syncError);

      // Update sync log with failure
      await supabase
        .from('square_sync_logs')
        .update({
          status: 'failed',
          items_processed: totalProcessed,
          items_created: totalCreated,
          items_updated: totalUpdated,
          items_failed: totalFailed,
          error_message: syncError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      throw syncError;
    }

  } catch (error) {
    console.error('Square product sync error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
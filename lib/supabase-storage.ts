/**
 * Supabase Storage Operations
 * Handles storing and retrieving records from Supabase
 */

import { supabaseAnon } from './supabase';

export interface RecordRow {
  external_id: string;
  source: string;
  content: string;
  source_created_at?: string | null;
}

export interface StoredRecord extends RecordRow {
  id: string;
  created_at: string;
  updated_at: string;
  analysis?: any;
  analyzed_at?: string | null;
}

/**
 * Map Apify items to our database schema
 */
function mapApifyItemsToRecords(items: any[]): RecordRow[] {
  return items
    .map((item: any) => ({
      external_id: item.id || item.url || item.uniqueId || String(Date.now() + Math.random()),
      source: item.url || item.source || item.link || 'unknown',
      content: item.text || item.content || item.title || item.body || '',
      source_created_at: item.createdAt || item.publishedAt || item.date || null,
    }))
    .filter((row: RecordRow) => row.content?.length > 0); // Only store rows with content
}

/**
 * Store items in Supabase
 * Maps Apify data structure to our database schema and upserts records
 */
export async function storeInSupabase(items: any[]): Promise<{ inserted: number; rows: StoredRecord[] }> {
  if (items.length === 0) {
    console.log('[Supabase] No items to store');
    return { inserted: 0, rows: [] };
  }

  // Map Apify items to our database schema
  const rows = mapApifyItemsToRecords(items);

  if (rows.length === 0) {
    console.log('[Supabase] No items with content to store');
    return { inserted: 0, rows: [] };
  }

  console.log(`[Supabase] Storing ${rows.length} records...`);
  console.log('[Supabase] Sample row:', JSON.stringify(rows[0], null, 2));

  try {
    // Test connection first by checking if table exists
    console.log('[Supabase] Testing connection...');
    const { error: testError } = await supabaseAnon
      .from('records')
      .select('id')
      .limit(1);
    
    if (testError && testError.code !== 'PGRST116') { // PGRST116 = no rows returned (which is OK)
      console.error('[Supabase] Table access test error:', testError);
      throw new Error(`Cannot access 'records' table: ${testError.message} (Code: ${testError.code}). Make sure the table exists and RLS is configured correctly.`);
    }
    
    console.log('[Supabase] Connection test passed!');

    // Find which external_ids already exist to avoid inserting duplicates
    const externalIds = rows.map((r) => r.external_id);
    console.log(`[Supabase] Checking for existing records by external_id (${externalIds.length})...`);
    const { data: existingIdsData, error: existingIdsError } = await supabaseAnon
      .from('records')
      .select('external_id')
      .in('external_id', externalIds);

    if (existingIdsError) {
      console.error('[Supabase] Error fetching existing external_ids:', existingIdsError);
      throw new Error(`Failed to check existing records: ${existingIdsError.message}`);
    }

    const existingIdSet = new Set<string>((existingIdsData || []).map((r: any) => r.external_id));
    const newRows = rows.filter((r) => !existingIdSet.has(r.external_id));

    if (newRows.length === 0) {
      console.log('[Supabase] All items already exist. Nothing to insert.');
      return { inserted: 0, rows: [] };
    }

    // Insert only new rows; do not update existing
    console.log(`[Supabase] Inserting ${newRows.length} new records...`);
    const { data, error } = await supabaseAnon
      .from('records')
      .insert(newRows)
      .select();

    if (error) {
      console.error('[Supabase] Insert error:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to store records in Supabase: ${error.message} (Code: ${error.code || 'unknown'}, Details: ${error.details || 'none'})`);
    }

    console.log(`[Supabase] Successfully stored ${data?.length || 0} records`);
    return { inserted: data?.length || 0, rows: (data as StoredRecord[]) || [] };
  } catch (e: any) {
    console.error('[Supabase] Operation failed:', e);
    console.error('[Supabase] Error stack:', e.stack);
    console.error('[Supabase] Error cause:', e.cause);
    
    // Check if it's a fetch error
    if (e.message?.includes('fetch failed') || e.cause?.code === 'ECONNREFUSED' || e.cause?.code === 'ENOTFOUND') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      throw new Error(`Cannot connect to Supabase. Check your NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}. Error: ${e.message}`);
    }
    throw e;
  }
}

/**
 * Get records that need analysis (no analysis field or analyzed_at is null)
 */
export async function getUnanalyzedRecords(limit = 10): Promise<StoredRecord[]> {
  console.log(`[Supabase] Fetching up to ${limit} unanalyzed records...`);
  
  const { data, error } = await supabaseAnon
    .from('records')
    .select('*')
    .is('analyzed_at', null)
    .limit(limit)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Supabase] Error fetching unanalyzed records:', error);
    throw new Error(`Failed to fetch unanalyzed records: ${error.message}`);
  }

  console.log(`[Supabase] Found ${data?.length || 0} unanalyzed records`);
  return (data as StoredRecord[]) || [];
}

/**
 * Update record with analysis results
 */
export async function updateRecordAnalysis(
  recordId: string,
  analysis: { summary: string; sentiment: string; keywords: string[] }
): Promise<StoredRecord> {
  console.log(`[Supabase] Updating record ${recordId} with analysis...`);
  
  const { data, error } = await supabaseAnon
    .from('records')
    .update({
      analysis,
      analyzed_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Error updating record:', error);
    throw new Error(`Failed to update record with analysis: ${error.message}`);
  }

  console.log(`[Supabase] Successfully updated record ${recordId}`);
  return data as StoredRecord;
}

/**
 * Delete a record by ID
 */
export async function deleteRecord(recordId: string): Promise<void> {
  console.log(`[Supabase] Deleting record ${recordId}...`);
  
  const { error } = await supabaseAnon
    .from('records')
    .delete()
    .eq('id', recordId);

  if (error) {
    console.error('[Supabase] Error deleting record:', error);
    throw new Error(`Failed to delete record: ${error.message}`);
  }

  console.log(`[Supabase] Successfully deleted record ${recordId}`);
}

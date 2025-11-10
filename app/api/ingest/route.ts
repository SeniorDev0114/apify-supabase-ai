import { NextResponse } from 'next/server';
import { executeApifyWorkflow } from '@/lib/apify';
import { storeInSupabase } from '@/lib/supabase-storage';

/**
 * POST /api/ingest
 * Main ingestion endpoint that orchestrates the workflow:
 * 1. Fetch data from Apify (or use mock data)
 * 2. Store data in Supabase
 */
export async function POST() {
  try {
    let items: any[];
    
    console.log('[Ingest] Starting Apify workflow...');
    items = await executeApifyWorkflow();
    console.log(`[Ingest] Retrieved ${items.length} items from Apify`);
    
    // Store items in Supabase
    console.log('[Ingest] Storing items in Supabase...');
    const { inserted, rows } = await storeInSupabase(items);
    console.log(`[Ingest] Stored ${inserted} records in Supabase`);
    
    return NextResponse.json({
      ok: true,
      message: 'Data ingested successfully',
      itemsCount: items.length,
      storedCount: inserted,
      storedRecords: rows,
    });
  } catch (e: any) {
    console.error('[Ingest] Error:', e);
    return NextResponse.json({
      ok: false,
      error: e.message,
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getUnanalyzedRecords, updateRecordAnalysis } from '@/lib/supabase-storage';
import { analyzeContent } from '@/lib/openai';

/**
 * POST /api/analyze
 * Analyzes unanalyzed records using OpenAI and updates them in Supabase
 * 
 * Query parameters:
 * - limit: Number of records to analyze (default: 10)
 */
export async function POST(request: Request) {
  try {
    // Get limit from query params or use default
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if (isNaN(limit) || limit < 1 || limit > 50) {
      return NextResponse.json({
        ok: false,
        error: 'Limit must be between 1 and 50',
      }, { status: 400 });
    }

    console.log(`[Analyze] Starting analysis for up to ${limit} records...`);

    // Get unanalyzed records
    const records = await getUnanalyzedRecords(limit);

    if (records.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No unanalyzed records found',
        analyzed: 0,
        records: [],
      });
    }

    console.log(`[Analyze] Found ${records.length} records to analyze`);

    // Analyze each record
    const results = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        console.log(`[Analyze] Analyzing record ${i + 1}/${records.length} (ID: ${record.id})...`);
        
        // Analyze content with OpenAI
        const analysis = await analyzeContent(record.content);
        
        // Update record in Supabase
        const updated = await updateRecordAnalysis(record.id, analysis);
        
        results.push({
          id: record.id,
          external_id: record.external_id,
          analysis,
        });

        // Delay between requests to respect rate limits
        // For free tier: 3 RPM = 20 seconds between requests
        // For paid tier: higher limits, but still add delay
        if (i < records.length - 1) {
          const delay = 21000; // 21 seconds to be safe (3 requests per minute)
          console.log(`[Analyze] Waiting ${delay}ms before next request to respect rate limits...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error: any) {
        console.error(`[Analyze] Failed to analyze record ${record.id}:`, error.message);
        errors.push({
          id: record.id,
          external_id: record.external_id,
          error: error.message,
        });
        // Continue with other records even if one fails
      }
    }

    console.log(`[Analyze] Completed. ${results.length} successful, ${errors.length} failed`);

    return NextResponse.json({
      ok: true,
      message: `Analyzed ${results.length} of ${records.length} records`,
      analyzed: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    console.error('[Analyze] Error:', e);
    return NextResponse.json({
      ok: false,
      error: e.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/analyze
 * Returns count of unanalyzed records
 */
export async function GET() {
  try {
    // Get actual count by fetching more
    const allUnanalyzed = await getUnanalyzedRecords(100);
    
    return NextResponse.json({
      ok: true,
      unanalyzedCount: allUnanalyzed.length,
    });
  } catch (e: any) {
    console.error('[Analyze] Error:', e);
    return NextResponse.json({
      ok: false,
      error: e.message,
    }, { status: 500 });
  }
}


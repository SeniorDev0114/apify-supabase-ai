import { NextResponse } from 'next/server';
import { updateRecordAnalysis } from '@/lib/supabase-storage';
import { analyzeContent } from '@/lib/openai';
import { supabaseAnon } from '@/lib/supabase';

/**
 * POST /api/records/:id/analyze
 * Analyze a single record by ID
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Analyze Record] Route handler called');
    const { id } = await params;
    console.log('[Analyze Record] Record ID:', id);
    
    if (!id) {
      return NextResponse.json({
        ok: false,
        error: 'Record ID is required',
      }, { status: 400 });
    }

    // Get the record first to get its content
    console.log('[Analyze Record] Fetching record from database...');
    const { data: record, error: fetchError } = await supabaseAnon
      .from('records')
      .select('*')
      .eq('id', id)
      .single();
    
    console.log('[Analyze Record] Fetch result:', { hasRecord: !!record, error: fetchError });

    if (fetchError || !record) {
      return NextResponse.json({
        ok: false,
        error: 'Record not found',
      }, { status: 404 });
    }

    // Analyze the content
    const analysis = await analyzeContent(record.content);
    
    // Update the record with analysis
    const updated = await updateRecordAnalysis(id, analysis);
    
    return NextResponse.json({
      ok: true,
      message: 'Record analyzed successfully',
      analysis,
      record: updated,
    });
  } catch (e: any) {
    console.error('[Analyze Record] Error:', e);
    return NextResponse.json({
      ok: false,
      error: e.message,
    }, { status: 500 });
  }
}


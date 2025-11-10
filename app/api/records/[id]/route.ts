import { NextResponse } from 'next/server';
import { deleteRecord, updateRecordAnalysis } from '@/lib/supabase-storage';
import { analyzeContent } from '@/lib/openai';
import { supabaseAnon } from '@/lib/supabase';

/**
 * DELETE /api/records/:id
 * Delete a record by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({
        ok: false,
        error: 'Record ID is required',
      }, { status: 400 });
    }

    await deleteRecord(id);
    
    return NextResponse.json({
      ok: true,
      message: 'Record deleted successfully',
    });
  } catch (e: any) {
    console.error('[Delete Record] Error:', e);
    return NextResponse.json({
      ok: false,
      error: e.message,
    }, { status: 500 });
  }
}

/**
 * POST /api/records/:id?action=analyze
 * Analyze a single record by ID
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    if (!id) {
      return NextResponse.json({
        ok: false,
        error: 'Record ID is required',
      }, { status: 400 });
    }

    // Handle analyze action
    if (action === 'analyze') {
      console.log('[Analyze Record] Route handler called for ID:', id);
      
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
    }

    return NextResponse.json({
      ok: false,
      error: 'Invalid action. Use ?action=analyze',
    }, { status: 400 });
  } catch (e: any) {
    console.error('[Analyze Record] Error:', e);
    return NextResponse.json({
      ok: false,
      error: e.message,
    }, { status: 500 });
  }
}

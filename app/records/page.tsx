import { supabaseAnon } from '@/lib/supabase';
import { ActionButtons } from '../components/ActionButtons';
import { RecordsListClient } from '../components/RecordsListClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchRecords() {
  const { data } = await supabaseAnon
    .from('records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export default async function RecordsPage() {
  const records = await fetchRecords();

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="rounded-xl border bg-gradient-to-r from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-950 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Records</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Ingest content from Apify, store in Supabase, then analyze with OpenAI.
            </p>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-700 border shadow-sm hover:shadow-md transition-shadow dark:bg-neutral-800 dark:text-gray-200 dark:border-neutral-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </a>
        </div>
      </div>

      <ActionButtons />

      <RecordsListClient records={records as any} />
    </main>
  );
}


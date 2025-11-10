import { supabaseAnon } from '@/lib/supabase';
import { ActionButtons } from './components/ActionButtons';
import { RecordItem } from './components/RecordItem';

// Force dynamic rendering to prevent caching issues in production
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

export default async function Page() {
  const records = await fetchRecords();

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Apify → Supabase → OpenAI</h1>
        <p className="text-gray-600">Data ingestion and AI analysis platform</p>
      </div>

      <ActionButtons />

      <div>
        <h2 className="text-xl font-semibold mb-3">
          Records ({records.length})
        </h2>
        {records.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No records yet. Click "Ingest Now" to fetch data from Apify.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {records.map((record: any) => (
              <RecordItem key={record.id} record={record} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

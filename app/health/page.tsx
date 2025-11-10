import { supabaseAnon } from '@/lib/supabase';

export default async function Health() {
  const { count } = await supabaseAnon.from('records').select('*', { count: 'exact', head: true });
  const { data: last } = await supabaseAnon
    .from('records')
    .select('analyzed_at')
    .not('analyzed_at', 'is', null)
    .order('analyzed_at', { ascending: false })
    .limit(1);

  return (
    <main className="p-6 max-w-xl mx-auto space-y-2">
      <h1 className="text-2xl font-semibold">System Health</h1>
      <div>Total analyzed records: {count ?? 0}</div>
      <div>Last successful OpenAI call: {last?.[0]?.analyzed_at ?? '—'}</div>
      <p className="text-sm text-gray-500 mt-2">
        Use this for quick uptime checks: if this stops changing over time, something's stuck.
      </p>
    </main>
  );
}

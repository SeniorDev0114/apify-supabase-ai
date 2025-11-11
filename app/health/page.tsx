import { supabaseAnon } from '@/lib/supabase';

export default async function Health() {
  const { count } = await supabaseAnon.from('records').select('*', { count: 'exact', head: true });
  const { data: last } = await supabaseAnon
    .from('records')
    .select('analyzed_at')
    .not('analyzed_at', 'is', null)
    .order('analyzed_at', { ascending: false })
    .limit(1);

  const formatTimeAgo = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    const wk = Math.floor(day / 7);
    if (wk < 5) return `${wk}w ago`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo}mo ago`;
    const yr = Math.floor(day / 365);
    return `${yr}y ago`;
  };

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <div className="rounded-xl border bg-gradient-to-r from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-950 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Monitor system status and uptime metrics
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

      <div className="rounded-xl border bg-white dark:bg-neutral-900 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Analyzed Records</h2>
          <p className="text-2xl font-bold">{count ?? 0}</p>
        </div>
        <div>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Last Successful OpenAI Call</h2>
          <p className="text-lg font-semibold">{formatTimeAgo(last?.[0]?.analyzed_at as string | undefined)}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 pt-4 border-t">
          Use this for quick uptime checks: if this stops changing over time, something's stuck.
        </p>
      </div>
    </main>
  );
}

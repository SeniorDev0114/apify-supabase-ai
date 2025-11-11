'use client';

import { useMemo, useState, useEffect } from 'react';
import { RecordItem } from './RecordItem';

interface RecordType {
  id: string;
  source: string;
  content: string;
  analysis?: {
    summary: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    keywords: string[];
  };
  analyzed_at?: string | null;
  created_at: string;
}

type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral';
type AnalyzedFilter = 'all' | 'analyzed' | 'pending';
type SortBy = 'newest' | 'oldest' | 'sentiment';

export function RecordsListClient({ records }: { records: RecordType[] }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sentiment, setSentiment] = useState<SentimentFilter>('all');
  const [analyzed, setAnalyzed] = useState<AnalyzedFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const analyzedCount = useMemo(() => records.filter(r => !!r.analyzed_at).length, [records]);
  const pendingCount = useMemo(() => records.length - analyzedCount, [records, analyzedCount]);

  const filtered = useMemo(() => {
    let list = records.slice();

    if (debouncedQuery) {
      list = list.filter(r => {
        const hay = `${r.content} ${r.analysis?.summary ?? ''} ${(r.analysis?.keywords ?? []).join(' ')}`.toLowerCase();
        return hay.includes(debouncedQuery);
      });
    }

    if (sentiment !== 'all') {
      list = list.filter(r => (r.analysis?.sentiment ?? 'neutral') === sentiment);
    }

    if (analyzed === 'analyzed') {
      list = list.filter(r => !!r.analyzed_at);
    } else if (analyzed === 'pending') {
      list = list.filter(r => !r.analyzed_at);
    }

    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === 'sentiment') {
      const order: Record<string, number> = { positive: 0, neutral: 1, negative: 2 };
      list.sort((a, b) => (order[a.analysis?.sentiment ?? 'neutral'] - order[b.analysis?.sentiment ?? 'neutral']));
    }

    return list;
  }, [records, debouncedQuery, sentiment, analyzed, sortBy]);

  // Reset to first page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sentiment, analyzed, sortBy, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageItems = filtered.slice(startIdx, endIdx);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">Records ({records.length})</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 dark:bg-emerald-900/30 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Analyzed: {analyzedCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 dark:bg-amber-900/30 dark:text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Pending: {pendingCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 dark:bg-neutral-800 dark:text-gray-300">
              Total: {records.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search content, summary, keywords..."
              className="w-full sm:w-80 rounded-lg border bg-white dark:bg-neutral-900 px-3 py-2 pl-9 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.5 3a5.5 5.5 0 013.977 9.291l3.116 3.116a1 1 0 01-1.414 1.414l-3.116-3.116A5.5 5.5 0 118.5 3zm0 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value as SentimentFilter)}
            className="rounded-lg border bg-white dark:bg-neutral-900 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          >
            <option value="all">All sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
          <select
            value={analyzed}
            onChange={(e) => setAnalyzed(e.target.value as AnalyzedFilter)}
            className="rounded-lg border bg-white dark:bg-neutral-900 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          >
            <option value="all">All statuses</option>
            <option value="analyzed">Analyzed</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border bg-white dark:bg-neutral-900 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="sentiment">Sentiment</option>
          </select>
          <select
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border bg-white dark:bg-neutral-900 px-3 py-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
          >
            <option value="5">5 / page</option>
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>
      </div>

      {pageItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No matching records.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {pageItems.map((record) => (
            <RecordItem key={record.id} record={record as any} />
          ))}
        </ul>
      )}

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-600 dark:text-gray-300">
          Showing {total === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, total)} of {total}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded border bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="text-gray-600 dark:text-gray-300">
            Page {currentPage} / {totalPages}
          </span>
          <button
            className="px-3 py-1.5 rounded border bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-8 00 disabled:opacity-50"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}



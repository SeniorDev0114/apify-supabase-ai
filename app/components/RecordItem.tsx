'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';

interface Record {
  id: string;
  source: string;
  content: string;
  analysis?: {
    summary: string;
    sentiment: string;
    keywords: string[];
  };
  analyzed_at?: string | null;
  created_at: string;
}

export function RecordItem({ record }: { record: Record }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [isDeleting, startDeleting] = useTransition();
  const [isAnalyzing, startAnalyzing] = useTransition();
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

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

  const sentimentColor = record.analysis?.sentiment === 'positive'
    ? 'border-l-green-500'
    : record.analysis?.sentiment === 'negative'
    ? 'border-l-red-500'
    : 'border-l-gray-300';
  
  const contentPreview = record.content.slice(0, 200);
  const hasMoreContent = record.content.length > 200;

  const handleDelete = () => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    startDeleting(async () => {
      try {
        showInfo('Deleting record...', 2000);
        
        const response = await fetch(`/api/records/${record.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        showSuccess('Record deleted successfully');
        // Refresh the page to update the list
        // Add small delay to ensure server-side revalidation completes
        setTimeout(() => {
          router.refresh();
        }, 100);
      } catch (error: any) {
        showError(`Failed to delete record: ${error.message || 'Unknown error'}`);
      }
    });
  };

  const handleAnalyze = () => {
    startAnalyzing(async () => {
      try {
        showInfo('Analyzing record...', 2000);
        
        // Use query parameter instead of nested route for better compatibility
        const response = await fetch(`/api/records/${record.id}?action=analyze`, {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        showSuccess('Record analyzed successfully');
        // Refresh the page to show updated analysis
        // Add small delay to ensure server-side revalidation completes
        setTimeout(() => {
          router.refresh();
        }, 100);
      } catch (error: any) {
        showError(`Failed to analyze record: ${error.message || 'Unknown error'}`);
      }
    });
  };

  return (
    <li className={`border rounded-lg p-4 hover:shadow-md transition-all bg-white dark:bg-neutral-900 ${'border-l-4'} ${sentimentColor}`}>
      <div className="space-y-2">
        {/* Source */}
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <span className="inline-flex h-4 w-4 items-center justify-center text-gray-400">
            <img
              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(getDomain(record.source))}&sz=64`}
              alt=""
              className="h-4 w-4 rounded-sm"
              loading="lazy"
            />
          </span>
          <a 
            href={record.source} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
            title={record.source}
          >
            {getDomain(record.source)}
          </a>
        </div>

        {/* Content */}
        <div className="font-medium leading-relaxed text-[15px]">
          {isExpanded ? (
            <div className="whitespace-pre-wrap">{record.content}</div>
          ) : (
            <div>
              {contentPreview}
              {hasMoreContent && '...'}
            </div>
          )}
        </div>

        {/* Expand/Collapse Button */}
        {hasMoreContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
            </svg>
            {isExpanded ? 'Show Less' : 'Show Full Content'}
          </button>
        )}

        {/* Analysis */}
        {record.analysis ? (
          <div className="mt-3 pt-3 border-t space-y-2 text-sm">
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="inline-flex items-center gap-1 text-xs text-violet-700 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform ${showAnalysis ? 'rotate-0' : '-rotate-90'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
              {showAnalysis ? 'Hide analysis' : 'Show analysis'}
            </button>
            {showAnalysis && (
              <>
                <div className="flex items-start gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center text-gray-400 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 5a2 2 0 012-2h9a1 1 0 01.8.4l3 4A1 1 0 0117 9H4a2 2 0 01-2-2V5z" />
                      <path d="M2 13.5A1.5 1.5 0 013.5 12h13a1.5 1.5 0 010 3h-13A1.5 1.5 0 012 13.5z" />
                    </svg>
                  </span>
                  <div>
                    <span className="font-semibold">Summary:</span>{' '}
                    <span className="text-gray-700 dark:text-gray-200">{record.analysis.summary}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Sentiment:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    record.analysis.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                    record.analysis.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {record.analysis.sentiment}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold mt-0.5">Keywords:</span>
                  <div className="flex flex-wrap gap-2">
                    {(record.analysis.keywords || []).length > 0
                      ? record.analysis.keywords.map((kw, i) => (
                          <span key={`${kw}-${i}`} className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 px-2 py-0.5 text-xs">
                            {kw}
                          </span>
                        ))
                      : <span className="text-gray-500">None</span>}
                  </div>
                </div>
              </>
            )}
            {record.analyzed_at && (
              <div className="text-xs text-gray-400 mt-1">
                Analyzed {formatTimeAgo(record.analyzed_at)}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 text-sm italic text-gray-500">
            ⏳ Pending analysis...
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-gray-400">
          Added {formatTimeAgo(record.created_at)}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-violet-600 text-white shadow-sm hover:shadow-md hover:bg-violet-700 transition-shadow disabled:bg-violet-400 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-600"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center">
              {isAnalyzing ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v3.382l2.447 1.223a1 1 0 01.553.894v2a1 1 0 01-.553.894L11 14.618V18a1 1 0 11-2 0v-3.382l-2.447-1.223A1 1 0 016 12.5v-2a1 1 0 01.553-.894L9 7.382V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span>{isAnalyzing ? 'Analyzing...' : 'Analyze'}</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || isAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-red-600 text-white shadow-sm hover:shadow-md hover:bg-red-700 transition-shadow disabled:bg-red-400 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center">
              {isDeleting ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 8a1 1 0 011-1h6a1 1 0 011 1v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8zm3-3a1 1 0 011-1h0a1 1 0 011 1v1H9V5z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </li>
  );
}


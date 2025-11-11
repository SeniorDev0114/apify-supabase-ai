'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './ToastProvider';

interface IngestResult {
  ok: boolean;
  message?: string;
  error?: string;
  itemsCount?: number;
  storedCount?: number;
}

interface AnalyzeResult {
  ok: boolean;
  message?: string;
  error?: string;
  analyzed?: number;
  failed?: number;
}

export function ActionButtons() {
  const { showSuccess, showError, showInfo } = useToast();
  const router = useRouter();
  const [isIngesting, startIngesting] = useTransition();
  const [isAnalyzing, startAnalyzing] = useTransition();

  const handleIngest = async () => {
    showInfo('Starting ingestion...', 2000);
    
    startIngesting(async () => {
      try {
        // Use relative URL for same-origin requests
        const response = await fetch('/api/ingest', {
          method: 'POST',
          cache: 'no-store',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result: IngestResult = await response.json();
        
        if (result.ok) {
          showSuccess(
            `Success! ${result.storedCount || 0} records stored (${result.itemsCount || 0} items processed)`,
            8000
          );
          // Soft refresh to update the data without full page reload
          // This preserves React state and toast notifications
          router.refresh();
        } else {
          showError(`Error: ${result.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        showError(`Failed to ingest data: ${error.message || 'Unknown error'}`);
      }
    });
  };

  const handleAnalyze = async () => {
    showInfo('Starting analysis...', 2000);
    
    startAnalyzing(async () => {
      try {
        // Use relative URL for same-origin requests
        const response = await fetch('/api/analyze?limit=10', {
          method: 'POST',
          cache: 'no-store',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result: AnalyzeResult = await response.json();
        
        if (result.ok) {
          const message = result.analyzed 
            ? `Success! ${result.analyzed} records analyzed${result.failed ? `, ${result.failed} failed` : ''}`
            : 'No records to analyze';
          showSuccess(message, 8000);
          // Soft refresh to update the data without full page reload
          // This preserves React state and toast notifications
          router.refresh();
        } else {
          showError(`Error: ${result.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        showError(`Failed to analyze records: ${error.message || 'Unknown error'}`);
      }
    });
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={handleIngest}
        disabled={isIngesting || isAnalyzing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white shadow-sm hover:shadow-md hover:bg-violet-700 transition-shadow disabled:bg-gray-400 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-600"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center">
          {isIngesting ? (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h4l3 10 4-18 3 8h4" />
            </svg>
          )}
        </span>
        <span>{isIngesting ? 'Ingesting...' : 'Ingest Now'}</span>
      </button>
      <button
        onClick={handleAnalyze}
        disabled={isIngesting || isAnalyzing}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white shadow-sm hover:shadow-md hover:bg-emerald-700 transition-shadow disabled:bg-emerald-400 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center">
          {isAnalyzing ? (
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </span>
        <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Records'}</span>
      </button>
    </div>
  );
}

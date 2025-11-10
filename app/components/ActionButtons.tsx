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
    <div className="flex gap-2">
      <button
        onClick={handleIngest}
        disabled={isIngesting || isAnalyzing}
        className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isIngesting ? 'Ingesting...' : 'Ingest Now'}
      </button>
      <button
        onClick={handleAnalyze}
        disabled={isIngesting || isAnalyzing}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Records'}
      </button>
    </div>
  );
}

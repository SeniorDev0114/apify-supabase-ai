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
  const [isDeleting, startDeleting] = useTransition();
  const [isAnalyzing, startAnalyzing] = useTransition();
  const router = useRouter();
  const { showSuccess, showError, showInfo } = useToast();
  
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
        router.refresh();
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
        router.refresh();
      } catch (error: any) {
        showError(`Failed to analyze record: ${error.message || 'Unknown error'}`);
      }
    });
  };

  return (
    <li className="border rounded p-4 hover:shadow-md transition-shadow">
      <div className="space-y-2">
        {/* Source */}
        <div className="text-sm text-gray-500">
          <a 
            href={record.source} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {record.source}
          </a>
        </div>

        {/* Content */}
        <div className="font-medium">
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
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {isExpanded ? 'Show Less' : 'Show Full Content'}
          </button>
        )}

        {/* Analysis */}
        {record.analysis ? (
          <div className="mt-3 pt-3 border-t space-y-1 text-sm">
            <div>
              <span className="font-semibold">Summary:</span>{' '}
              <span>{record.analysis.summary}</span>
            </div>
            <div>
              <span className="font-semibold">Sentiment:</span>{' '}
              <span className={`px-2 py-1 rounded text-xs ${
                record.analysis.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                record.analysis.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {record.analysis.sentiment}
              </span>
            </div>
            <div>
              <span className="font-semibold">Keywords:</span>{' '}
              <span className="text-gray-600">
                {record.analysis.keywords?.join(', ') || 'None'}
              </span>
            </div>
            {record.analyzed_at && (
              <div className="text-xs text-gray-400 mt-1">
                Analyzed: {new Date(record.analyzed_at).toLocaleString()}
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
          Added: {new Date(record.created_at).toLocaleString()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || isDeleting}
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || isAnalyzing}
            className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </li>
  );
}


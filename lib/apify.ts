/**
 * Apify API Integration
 * Handles all interactions with Apify API: starting tasks, polling, and reading data
 */

/**
 * Start an Apify task/actor run
 * Based on: https://docs.apify.com/api/v2/actor-task-runs-post
 * Returns the run ID immediately (doesn't wait for completion)
 */
export async function startApifyTask(): Promise<string> {
  const taskId = process.env.APIFY_TASK_ID;
  const token = process.env.APIFY_TOKEN;
  
  if (!taskId || !token) {
    throw new Error('APIFY_TASK_ID and APIFY_TOKEN environment variables must be set');
  }

  // Try actor-tasks endpoint first (for scheduled tasks)
  // POST /v2/actor-tasks/:actorTaskId/runs
  let url = `https://api.apify.com/v2/actor-tasks/${taskId}/runs`;
  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({}), // Optional: override task input
  });
  
  // If 404, try as actor instead of actor-task
  // POST /v2/actors/:actorId/runs
  if (res.status === 404) {
    url = `https://api.apify.com/v2/actors/${taskId}/runs`;
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
  }
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to start Apify task: ${res.status} ${res.statusText}. ${errorText}`);
  }
  
  const response = await res.json();
  const runData = response?.data;
  
  if (!runData || !runData.id) {
    throw new Error('Invalid response structure. Run ID not found: ' + JSON.stringify(response));
  }
  
  console.log(`[Apify] Task started. Run ID: ${runData.id}, Status: ${runData.status}`);
  return runData.id;
}

/**
 * Poll Apify run status until it completes
 * Based on: https://docs.apify.com/api/v2/actor-runs-get
 * Polls GET /v2/actor-runs/:runId until status is SUCCEEDED
 */
export async function waitForRunCompletion(runId: string, maxWaitTime = 300000): Promise<string> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_TOKEN environment variable must be set');
  }

  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds
  
  console.log(`[Apify] Polling run ${runId} until completion...`);
  
  while (Date.now() - startTime < maxWaitTime) {
    // GET /v2/actor-runs/:runId
    const res = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );
    
    if (!res.ok) {
      throw new Error(`Failed to check run status: ${res.status} ${res.statusText}`);
    }
    
    const response = await res.json();
    const runData = response?.data;
    const status = runData?.status;
    
    console.log(`[Apify] Run ${runId} status: ${status}`);
    
    if (status === 'SUCCEEDED') {
      const datasetId = runData.defaultDatasetId;
      if (!datasetId) {
        throw new Error('Dataset ID not found in completed run. Response: ' + JSON.stringify(runData));
      }
      console.log(`[Apify] Run completed successfully. Dataset ID: ${datasetId}`);
      return datasetId;
    }
    
    if (status === 'FAILED' || status === 'ABORTED') {
      throw new Error(`Apify run ${status.toLowerCase()}: ${runData.statusMessage || 'Unknown error'}`);
    }
    
    // Status is likely: READY, RUNNING, or TIMING-OUT
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Run did not complete within timeout period (5 minutes)');
}

/**
 * Read items from Apify dataset
 * @param datasetId - The dataset ID from a completed Apify run
 * @returns Array of items from the dataset
 */
export async function readApifyItems(datasetId: string): Promise<any[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_TOKEN environment variable must be set');
  }
  
  // Use Authorization header for better security
  const res = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to read Apify dataset items: ${res.status} ${res.statusText}. ${errorText}`);
  }
  
  const data = await res.json();
  console.log(`[Apify] Retrieved ${Array.isArray(data) ? data.length : 0} items from dataset`);
  return Array.isArray(data) ? data : [];
}

/**
 * Execute full Apify workflow: start task, wait for completion, and read data
 * @returns Array of items from the completed Apify run
 */
export async function executeApifyWorkflow(): Promise<any[]> {
  console.log('[Apify] Starting workflow...');
  const runId = await startApifyTask();
  const datasetId = await waitForRunCompletion(runId);
  const items = await readApifyItems(datasetId);
  console.log(`[Apify] Workflow completed. Retrieved ${items.length} items`);
  return items;
}


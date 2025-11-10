/**
 * OpenAI API Integration
 * Handles analyzing content using OpenAI API
 */

export interface AnalysisResult {
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
}

/**
 * Analyze content using OpenAI API with retry logic for rate limits
 * @param content - The text content to analyze
 * @param retries - Number of retry attempts (default: 3)
 * @returns Analysis result with summary, sentiment, and keywords
 */
export async function analyzeContent(content: string, retries = 3): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // Default to gpt-4o-mini (higher rate limits)
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable must be set');
  }

  if (!content || content.trim().length === 0) {
    throw new Error('Content cannot be empty');
  }

  console.log(`[OpenAI] Analyzing content (${content.length} characters) with model: ${model}...`);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that analyzes text content. Always respond with valid JSON only, no additional text.',
            },
            {
              role: 'user',
              content: `Analyze the following content and provide:
1. A brief summary (2-3 sentences)
2. Sentiment (one of: positive, neutral, negative)
3. Top 5 keywords (as an array)

Content: ${content.substring(0, 4000)} // Limit to 4000 chars to avoid token limits

Respond with JSON in this exact format:
{
  "summary": "brief summary here",
  "sentiment": "positive|neutral|negative",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        let errorData: any = {};
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use as is
        }

        // Handle rate limit errors with retry
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
          
          if (attempt < retries) {
            console.log(`[OpenAI] Rate limit hit. Waiting ${waitTime}ms before retry ${attempt + 1}/${retries}...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          }
        }

        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      const analysisText = data.choices?.[0]?.message?.content;

      if (!analysisText) {
        throw new Error('No analysis content in OpenAI response');
      }

      const analysis = JSON.parse(analysisText) as AnalysisResult;

      // Validate the response structure
      if (!analysis.summary || !analysis.sentiment || !Array.isArray(analysis.keywords)) {
        throw new Error('Invalid analysis structure from OpenAI');
      }

      // Ensure sentiment is one of the valid values
      if (!['positive', 'neutral', 'negative'].includes(analysis.sentiment)) {
        analysis.sentiment = 'neutral';
      }

      console.log(`[OpenAI] Analysis completed. Sentiment: ${analysis.sentiment}, Keywords: ${analysis.keywords.length}`);
      return analysis;
    } catch (e: any) {
      // If it's the last attempt or not a rate limit error, throw
      if (attempt === retries || !e.message?.includes('429')) {
        console.error('[OpenAI] Analysis failed:', e);
        if (e.message?.includes('JSON')) {
          throw new Error(`Failed to parse OpenAI response: ${e.message}`);
        }
        throw new Error(`OpenAI analysis failed: ${e.message}`);
      }
      // Otherwise, continue to retry
      console.log(`[OpenAI] Attempt ${attempt + 1} failed, will retry...`);
    }
  }

  throw new Error('OpenAI analysis failed after all retries');
}

/**
 * Analyze multiple content items in batch
 * @param contents - Array of content strings to analyze
 * @returns Array of analysis results
 */
export async function analyzeBatch(contents: string[]): Promise<AnalysisResult[]> {
  console.log(`[OpenAI] Analyzing batch of ${contents.length} items...`);
  
  // Process sequentially to avoid rate limits
  const results: AnalysisResult[] = [];
  for (let i = 0; i < contents.length; i++) {
    try {
      const result = await analyzeContent(contents[i]);
      results.push(result);
      
      // Delay between requests to respect rate limits
      // For free tier: 3 RPM = 21 seconds between requests
      if (i < contents.length - 1) {
        const delay = 21000; // 21 seconds to be safe (3 requests per minute)
        console.log(`[OpenAI] Waiting ${delay}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error: any) {
      console.error(`[OpenAI] Failed to analyze item ${i + 1}:`, error.message);
      // Continue with other items even if one fails
      // You might want to handle this differently based on requirements
    }
  }
  
  console.log(`[OpenAI] Batch analysis completed. ${results.length}/${contents.length} successful`);
  return results;
}

import OpenAI from 'openai';

// Validate environment variables at module load
if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
  console.error('Neither GEMINI_API_KEY nor OPENAI_API_KEY environment variable is set');
}

// OpenAI client configuration for Tech Referee
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new OpenAIError(
      'OpenAI API key is not configured',
      'MISSING_API_KEY',
      { env: 'OPENAI_API_KEY' }
    );
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      // Add timeout and other configurations to avoid deprecation warnings
      timeout: 30000,
      maxRetries: 2,
    });
  }

  return openaiClient;
}

// Configuration constants for OpenAI API calls
export const OPENAI_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
} as const;

export const GEMINI_CONFIG = {
  model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  temperature: 0.7,
  maxOutputTokens: 2000,
  topP: 1,
} as const;

// Error handling for OpenAI API responses
export class OpenAIError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

function getConfiguredProvider(): 'gemini' | 'openai' | null {
  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }

  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }

  return null;
}

// Validate LLM API key is configured
export function validateOpenAIConfig(): void {
  if (!getConfiguredProvider()) {
    throw new OpenAIError(
      'LLM API key is not configured',
      'MISSING_API_KEY',
      { env: ['GEMINI_API_KEY', 'OPENAI_API_KEY'] }
    );
  }
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new OpenAIError(
      'Gemini API key is not configured',
      'MISSING_API_KEY',
      { env: 'GEMINI_API_KEY' }
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    console.log('Making Gemini API call with prompt length:', prompt.length);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_CONFIG.model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'You are The Tech Referee, a senior solutions architect and impartial arbiter who helps developers choose between competing technologies by focusing on trade-offs, constraints, and hidden costs.'
              }
            ]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: GEMINI_CONFIG.temperature,
            topP: GEMINI_CONFIG.topP,
            maxOutputTokens: GEMINI_CONFIG.maxOutputTokens
          }
        })
      }
    );

    const payload = await response.json().catch(async () => ({
      raw: await response.text().catch(() => '')
    }));

    if (!response.ok) {
      const errorMessage = payload?.error?.message || payload?.raw || `HTTP ${response.status}`;
      const errorStatus = payload?.error?.status || response.status;

      let errorCode = 'API_ERROR';
      if (response.status === 429) {
        errorCode = 'QUOTA_EXCEEDED';
      } else if (response.status === 400 || response.status === 401 || response.status === 403) {
        errorCode = 'CONFIGURATION_ERROR';
      }

      throw new OpenAIError(errorMessage, errorCode, {
        provider: 'gemini',
        status: errorStatus,
        payload
      });
    }

    const responseText = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim();

    if (!responseText) {
      throw new OpenAIError(
        'No response received from Gemini',
        'EMPTY_RESPONSE',
        { provider: 'gemini', payload }
      );
    }

    console.log('Gemini response length:', responseText.length);
    return responseText;
  } catch (error) {
    console.error('Gemini API call failed:', error);

    if (error instanceof OpenAIError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('timeout')) {
        throw new OpenAIError(
          'Analysis request timed out. Please try again.',
          'TIMEOUT_ERROR',
          { provider: 'gemini', originalError: error.message }
        );
      }

      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        throw new OpenAIError(
          'Unable to connect to analysis service. Please check your internet connection.',
          'CONNECTION_ERROR',
          { provider: 'gemini', originalError: error.message }
        );
      }
    }

    throw new OpenAIError(
      `Unexpected error during Gemini analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN_ERROR',
      { provider: 'gemini', originalError: error }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// Wrapper function for OpenAI API calls with enhanced error handling
export async function callOpenAI(prompt: string): Promise<string> {
  validateOpenAIConfig();

  if (process.env.GEMINI_API_KEY) {
    return callGemini(prompt);
  }

  try {
    console.log('Making OpenAI API call with prompt length:', prompt.length);
    const openai = getOpenAIClient();
    
    const completion = await openai.chat.completions.create({
      ...OPENAI_CONFIG,
      messages: [
        {
          role: 'system',
          content: 'You are The Tech Referee, a senior solutions architect and impartial arbiter who helps developers choose between competing technologies by focusing on trade-offs, constraints, and hidden costs.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    console.log('OpenAI API call completed successfully');
    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      console.error('Empty response from OpenAI:', completion);
      throw new OpenAIError(
        'No response received from OpenAI',
        'EMPTY_RESPONSE',
        { completion }
      );
    }

    console.log('OpenAI response length:', response.length);
    return response;
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    
    // Handle OpenAI API errors with more specific error mapping
    if (error instanceof OpenAI.APIError) {
      console.log('OpenAI API Error details:', {
        status: error.status,
        code: error.code,
        type: error.type,
        message: error.message
      });
      
      let userMessage = error.message;
      let errorCode = error.code || 'API_ERROR';

      // Map specific OpenAI errors to user-friendly messages
      switch (error.code) {
        case 'insufficient_quota':
          userMessage = 'Service temporarily unavailable due to quota limits. Please try again later.';
          errorCode = 'QUOTA_EXCEEDED';
          break;
        case 'rate_limit_exceeded':
          userMessage = 'Too many requests. Please wait a moment and try again.';
          errorCode = 'RATE_LIMIT_EXCEEDED';
          break;
        case 'invalid_api_key':
          userMessage = 'Service configuration error. Please contact support.';
          errorCode = 'CONFIGURATION_ERROR';
          break;
        case 'model_not_found':
          userMessage = 'Analysis service temporarily unavailable. Please try again later.';
          errorCode = 'SERVICE_UNAVAILABLE';
          break;
        case 'context_length_exceeded':
          userMessage = 'Request too large. Please try with shorter technology names.';
          errorCode = 'REQUEST_TOO_LARGE';
          break;
        default:
          userMessage = `Service error: ${error.message}`;
      }

      throw new OpenAIError(
        userMessage,
        errorCode,
        { 
          status: error.status, 
          type: error.type,
          originalMessage: error.message
        }
      );
    }
    
    // Handle network/connection errors
    if (error instanceof Error) {
      console.log('Network/connection error:', error.message);
      
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw new OpenAIError(
          'Unable to connect to analysis service. Please check your internet connection.',
          'CONNECTION_ERROR',
          { originalError: error.message }
        );
      }
      
      if (error.message.includes('timeout')) {
        throw new OpenAIError(
          'Analysis request timed out. Please try again.',
          'TIMEOUT_ERROR',
          { originalError: error.message }
        );
      }
    }
    
    if (error instanceof OpenAIError) {
      throw error;
    }

    console.log('Unknown error type:', typeof error, error);
    throw new OpenAIError(
      `Unexpected error during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  }
}
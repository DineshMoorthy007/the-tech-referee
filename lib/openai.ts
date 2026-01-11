import OpenAI from 'openai';

// Validate environment variables at module load
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY environment variable is not set');
}

// OpenAI client configuration for Tech Referee
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Add timeout and other configurations to avoid deprecation warnings
  timeout: 30000,
  maxRetries: 2,
});

// Configuration constants for OpenAI API calls
export const OPENAI_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
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

// Validate OpenAI API key is configured
export function validateOpenAIConfig(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new OpenAIError(
      'OpenAI API key is not configured',
      'MISSING_API_KEY',
      { env: 'OPENAI_API_KEY' }
    );
  }
}

// Wrapper function for OpenAI API calls with enhanced error handling
export async function callOpenAI(prompt: string): Promise<string> {
  validateOpenAIConfig();

  try {
    console.log('Making OpenAI API call with prompt length:', prompt.length);
    
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
import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI, OpenAIError } from '@/lib/openai';
import { createPromptPackage } from '@/lib/prompts';
import { 
  RefereeRequest, 
  RefereeResponse, 
  RefereeAnalysis, 
  ApiError, 
  ErrorType,
  ComparisonMatrix,
  ScenarioVerdict,
  HiddenTax
} from '@/lib/types';

/**
 * Enhanced error response helper
 */
function createErrorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: any
): NextResponse<RefereeResponse> {
  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : undefined,
      timestamp: new Date().toISOString()
    }
  }, { status });
}

/**
 * Rate limiting helper (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(clientId: string): boolean {
  // Disable rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  clientData.count++;
  return true;
}

/**
 * POST /api/referee - Generate technology comparison analysis
 * Enhanced with comprehensive error handling and rate limiting
 */
export async function POST(request: NextRequest): Promise<NextResponse<RefereeResponse>> {
  const startTime = Date.now();
  
  try {
    console.log('API route called at:', new Date().toISOString());
    
    // Validate Content-Type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log('Invalid content-type:', contentType);
      return createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Request must have Content-Type: application/json',
        400,
        `Received: ${contentType || 'none'}. Please set Content-Type header to 'application/json'`
      );
    }

    // Basic rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(clientId)) {
      console.log('Rate limit exceeded for client:', clientId);
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please wait before trying again.',
        429,
        'Rate limit: 10 requests per minute. Please wait and try again.'
      );
    }

    // Parse and validate request body
    console.log('Parsing request body...');
    const body = await parseRequestBody(request);
    if (!body.success) {
      console.log('Request body validation failed:', body.error);
      return createErrorResponse(
        body.error.code,
        body.error.message,
        400,
        body.error.details
      );
    }

    const { tech1, tech2 } = body.data;
    console.log('Comparing technologies:', tech1, 'vs', tech2);

    // Create and validate prompt package
    console.log('Creating prompt package...');
    const promptPackage = createPromptPackage(tech1, tech2);
    if (!promptPackage.isValid) {
      console.log('Prompt validation failed:', promptPackage.errors);
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Technology inputs failed additional validation checks',
        400,
        promptPackage.errors.join(', ')
      );
    }

    // Call OpenAI API with timeout handling
    console.log('Calling OpenAI API...');
    const llmResponse = await Promise.race([
      callOpenAI(promptPackage.userPrompt),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    ]);

    console.log('OpenAI response received, length:', llmResponse.length);

    // Parse and validate LLM response
    console.log('Parsing LLM response...');
    const analysis = await parseLLMResponse(llmResponse, tech1, tech2);
    if (!analysis.success) {
      console.log('LLM response parsing failed:', analysis.error);
      return createErrorResponse(
        analysis.error.code,
        analysis.error.message,
        500,
        analysis.error.details
      );
    }

    // Log successful request (for monitoring)
    const duration = Date.now() - startTime;
    console.log(`Successful analysis generated in ${duration}ms for ${tech1} vs ${tech2}`);

    // Return successful response
    return NextResponse.json({
      success: true,
      data: analysis.data
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`API route error after ${duration}ms:`, error);

    // Handle specific error types with better user messages
    if (error instanceof OpenAIError) {
      console.log('OpenAI error details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      
      // Map OpenAI errors to appropriate HTTP status codes and user-friendly messages
      let status = 500;
      let code = error.code;
      let message = error.message;
      let details = undefined;

      if (error.code === 'insufficient_quota' || error.code === 'rate_limit_exceeded') {
        status = 429;
        message = 'Our AI service is currently experiencing high demand. Please try again in a few moments.';
        details = 'This is a temporary issue. The service should be available again shortly.';
      } else if (error.code === 'invalid_api_key') {
        status = 500;
        message = 'Service configuration error. Our team has been notified.';
        code = 'SERVICE_ERROR';
        details = 'Please try again later. If the problem persists, contact support.';
      } else if (error.code === 'model_not_found') {
        status = 500;
        message = 'Analysis service temporarily unavailable. Please try again later.';
        code = 'SERVICE_ERROR';
        details = 'Our AI model is being updated. Service should resume shortly.';
      } else if (error.code === 'context_length_exceeded') {
        status = 400;
        message = 'Technology comparison request is too complex to process.';
        details = 'Please try using shorter, more common technology names.';
      }

      return createErrorResponse(code, message, status, details);
    }

    // Handle timeout errors
    if (error instanceof Error && error.message === 'Request timeout') {
      console.log('Request timeout occurred');
      return createErrorResponse(
        'TIMEOUT_ERROR',
        'The analysis request took too long to complete.',
        408,
        'This usually happens with very complex comparisons. Please try again with simpler technology names.'
      );
    }

    // Handle JSON parsing errors (shouldn't happen here but just in case)
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.log('JSON parsing error:', error.message);
      return createErrorResponse(
        'INVALID_REQUEST',
        'Request body contains invalid JSON format.',
        400,
        'Please check your JSON syntax and ensure all quotes and brackets are properly formatted.'
      );
    }

    // Handle network/connection errors
    if (error instanceof Error && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT')
    )) {
      console.log('Network error occurred:', error.message);
      return createErrorResponse(
        'NETWORK_ERROR',
        'Unable to connect to analysis service.',
        503,
        'This is a temporary network issue. Please try again in a few moments.'
      );
    }

    // Handle memory/resource errors
    if (error instanceof Error && (
      error.message.includes('out of memory') ||
      error.message.includes('Maximum call stack')
    )) {
      console.log('Resource error occurred:', error.message);
      return createErrorResponse(
        'RESOURCE_ERROR',
        'Request requires too many resources to process.',
        413,
        'Please try with simpler technology names or try again later.'
      );
    }

    // Handle generic errors with helpful message
    console.log('Generic error occurred:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred while processing your request.',
      500,
      process.env.NODE_ENV === 'development' 
        ? `Error details: ${error instanceof Error ? error.message : 'Unknown error'}` 
        : 'Please try again. If the problem persists, contact support.'
    );
  }
}

/**
 * Parse and validate request body with comprehensive input validation
 */
async function parseRequestBody(request: NextRequest): Promise<{
  success: true;
  data: RefereeRequest;
} | {
  success: false;
  error: ApiError;
}> {
  try {
    const body = await request.json();

    // Validate request body structure
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: 'Request body must be a valid JSON object with tech1 and tech2 fields',
          details: 'Expected format: {"tech1": "Technology Name", "tech2": "Technology Name"}',
          timestamp: new Date().toISOString()
        }
      };
    }

    // Check for null body
    if (body === null) {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: 'Request body cannot be null',
          details: 'Please provide a JSON object with tech1 and tech2 fields',
          timestamp: new Date().toISOString()
        }
      };
    }

    // Validate tech1 field
    const tech1ValidationResult = validateTechnologyField(body.tech1, 'tech1');
    if (!tech1ValidationResult.isValid) {
      return {
        success: false,
        error: {
          code: 'MISSING_TECH1',
          message: tech1ValidationResult.message,
          details: tech1ValidationResult.details,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Validate tech2 field
    const tech2ValidationResult = validateTechnologyField(body.tech2, 'tech2');
    if (!tech2ValidationResult.isValid) {
      return {
        success: false,
        error: {
          code: 'MISSING_TECH2',
          message: tech2ValidationResult.message,
          details: tech2ValidationResult.details,
          timestamp: new Date().toISOString()
        }
      };
    }

    const tech1Trimmed = tech1ValidationResult.value!.trim();
    const tech2Trimmed = tech2ValidationResult.value!.trim();

    // Additional business logic validation
    if (tech1Trimmed.toLowerCase() === tech2Trimmed.toLowerCase()) {
      return {
        success: false,
        error: {
          code: 'DUPLICATE_TECHNOLOGIES',
          message: 'Please provide two different technologies for comparison',
          details: `Both technologies resolve to the same value: "${tech1Trimmed}"`,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Validate technology name format
    const tech1FormatResult = validateTechnologyFormat(tech1Trimmed, 'tech1');
    if (!tech1FormatResult.isValid) {
      return {
        success: false,
        error: {
          code: 'INVALID_TECH1_FORMAT',
          message: tech1FormatResult.message,
          details: tech1FormatResult.details,
          timestamp: new Date().toISOString()
        }
      };
    }

    const tech2FormatResult = validateTechnologyFormat(tech2Trimmed, 'tech2');
    if (!tech2FormatResult.isValid) {
      return {
        success: false,
        error: {
          code: 'INVALID_TECH2_FORMAT',
          message: tech2FormatResult.message,
          details: tech2FormatResult.details,
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      data: {
        tech1: tech1Trimmed,
        tech2: tech2Trimmed
      }
    };

  } catch (error) {
    // Handle specific JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Request body contains invalid JSON syntax',
          details: `JSON parsing failed: ${error.message}. Please check for missing quotes, commas, or brackets.`,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Handle other parsing errors
    return {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Failed to parse request body as JSON',
        details: error instanceof Error ? error.message : 'Unknown JSON parsing error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Validate individual technology field
 */
function validateTechnologyField(value: any, fieldName: string): {
  isValid: true;
  value: string;
} | {
  isValid: false;
  message: string;
  details: string;
} {
  // Check if field exists
  if (value === undefined) {
    return {
      isValid: false,
      message: `${fieldName} field is required`,
      details: `Please provide a ${fieldName} value in your request body`
    };
  }

  // Check if field is null
  if (value === null) {
    return {
      isValid: false,
      message: `${fieldName} field cannot be null`,
      details: `Please provide a valid technology name for ${fieldName}`
    };
  }

  // Check if field is a string
  if (typeof value !== 'string') {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    return {
      isValid: false,
      message: `${fieldName} field must be a string`,
      details: `Received ${actualType}, expected string. Example: "React" or "Vue.js"`
    };
  }

  // Check if string is empty or only whitespace
  if (value.trim().length === 0) {
    return {
      isValid: false,
      message: `${fieldName} field cannot be empty`,
      details: `Please provide a valid technology name for ${fieldName}. Example: "React", "Angular", "PostgreSQL"`
    };
  }

  return {
    isValid: true,
    value: value
  };
}

/**
 * Validate technology name format and content
 */
function validateTechnologyFormat(value: string, fieldName: string): {
  isValid: true;
} | {
  isValid: false;
  message: string;
  details: string;
} {
  // Check minimum length (with exception for 'C' programming language)
  if (value.length < 2 && value.toLowerCase() !== 'c') {
    return {
      isValid: false,
      message: `${fieldName} must be at least 2 characters long`,
      details: `"${value}" is too short. Please provide a full technology name like "React" or "Node.js"`
    };
  }

  // Check maximum length
  if (value.length > 100) {
    return {
      isValid: false,
      message: `${fieldName} must be less than 100 characters`,
      details: `Technology name is too long (${value.length} characters). Please use a shorter, more common name.`
    };
  }

  // Check for valid characters (letters, numbers, spaces, dots, hyphens, plus signs)
  const validCharPattern = /^[a-zA-Z0-9\s.\-+#]+$/;
  if (!validCharPattern.test(value)) {
    return {
      isValid: false,
      message: `${fieldName} contains invalid characters`,
      details: `"${value}" contains special characters. Please use only letters, numbers, spaces, dots, hyphens, and plus signs. Examples: "React", "Node.js", "C++", "C#"`
    };
  }

  // Check that it starts with a letter or number
  const startsWithAlphanumeric = /^[a-zA-Z0-9]/.test(value);
  if (!startsWithAlphanumeric) {
    return {
      isValid: false,
      message: `${fieldName} must start with a letter or number`,
      details: `"${value}" starts with an invalid character. Technology names should start with a letter or number.`
    };
  }

  // Check for suspicious patterns (all special characters, repeated characters)
  const suspiciousPatterns = [
    /^[.\-+#\s]+$/, // Only special characters
    /(.)\1{4,}/, // Same character repeated 5+ times
    /^\s+|\s+$/, // Leading/trailing spaces (should be trimmed already)
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(value)) {
      return {
        isValid: false,
        message: `${fieldName} format appears invalid`,
        details: `"${value}" doesn't look like a valid technology name. Please provide a real technology name like "React", "PostgreSQL", or "Docker"`
      };
    }
  }

  // Check for common non-technology words that might indicate user confusion
  const nonTechWords = ['test', 'example', 'sample', 'demo', 'placeholder', 'temp', 'temporary'];
  const lowerValue = value.toLowerCase();
  
  for (const word of nonTechWords) {
    if (lowerValue === word || lowerValue.includes(word)) {
      return {
        isValid: false,
        message: `${fieldName} appears to be a placeholder value`,
        details: `"${value}" looks like a test value. Please provide actual technology names you want to compare, like "React vs Angular" or "MySQL vs PostgreSQL"`
      };
    }
  }

  // Enhanced technology validation - check if it looks like a real technology
  const technologyValidation = validateTechnologyName(value);
  if (!technologyValidation.isValid) {
    return {
      isValid: false,
      message: `${fieldName} does not appear to be a valid technology name`,
      details: technologyValidation.reason
    };
  }

  return {
    isValid: true
  };
}

/**
 * Comprehensive technology name validation
 */
function validateTechnologyName(name: string): {
  isValid: boolean;
  reason: string;
} {
  const lowerName = name.toLowerCase().trim();
  
  // Known technology categories and patterns
  const knownTechnologies = new Set([
    // Programming Languages
    'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'java', 'c#', 'csharp', 'c++', 'cpp', 
    'c', 'go', 'golang', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab',
    'perl', 'lua', 'haskell', 'erlang', 'elixir', 'clojure', 'f#', 'fsharp', 'dart', 'julia',
    
    // Frontend Frameworks/Libraries
    'react', 'reactjs', 'react.js', 'vue', 'vuejs', 'vue.js', 'angular', 'angularjs', 'angular.js',
    'svelte', 'ember', 'emberjs', 'ember.js', 'backbone', 'backbonejs', 'backbone.js', 'jquery',
    'alpine', 'alpinejs', 'alpine.js', 'lit', 'stencil', 'preact', 'solid', 'solidjs',
    
    // Backend Frameworks
    'express', 'expressjs', 'express.js', 'fastify', 'koa', 'koajs', 'koa.js', 'nestjs', 'nest.js',
    'django', 'flask', 'fastapi', 'spring', 'spring boot', 'springboot', 'laravel', 'symfony',
    'rails', 'ruby on rails', 'sinatra', 'asp.net', 'aspnet', '.net', 'dotnet', 'gin', 'echo',
    'fiber', 'actix', 'rocket', 'warp', 'axum',
    
    // Databases
    'mysql', 'postgresql', 'postgres', 'sqlite', 'mongodb', 'mongo', 'redis', 'cassandra',
    'dynamodb', 'couchdb', 'couchbase', 'neo4j', 'influxdb', 'elasticsearch', 'solr',
    'mariadb', 'oracle', 'sql server', 'sqlserver', 'firestore', 'supabase', 'planetscale',
    
    // Cloud Providers
    'aws', 'amazon web services', 'gcp', 'google cloud', 'google cloud platform', 'azure',
    'microsoft azure', 'digitalocean', 'linode', 'vultr', 'heroku', 'vercel', 'netlify',
    'cloudflare', 'firebase', 'railway', 'render',
    
    // DevOps/Tools
    'docker', 'kubernetes', 'k8s', 'jenkins', 'github actions', 'gitlab ci', 'circleci',
    'travis ci', 'terraform', 'ansible', 'puppet', 'chef', 'vagrant', 'helm', 'istio',
    'prometheus', 'grafana', 'elk', 'elasticsearch', 'logstash', 'kibana', 'datadog',
    'new relic', 'newrelic', 'splunk',
    
    // Build Tools/Bundlers
    'webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'swc', 'babel', 'gulp', 'grunt',
    'npm', 'yarn', 'pnpm', 'bower', 'maven', 'gradle', 'cmake', 'make',
    
    // Testing
    'jest', 'mocha', 'chai', 'jasmine', 'cypress', 'playwright', 'selenium', 'puppeteer',
    'testing library', 'enzyme', 'vitest', 'ava', 'tape', 'qunit',
    
    // Mobile Development
    'react native', 'flutter', 'ionic', 'cordova', 'phonegap', 'xamarin', 'unity',
    'android', 'ios', 'swift ui', 'swiftui', 'uikit',
    
    // CSS/Styling
    'tailwind', 'tailwindcss', 'bootstrap', 'bulma', 'foundation', 'materialize',
    'semantic ui', 'ant design', 'material ui', 'chakra ui', 'styled components',
    'emotion', 'sass', 'scss', 'less', 'stylus', 'postcss',
    
    // State Management
    'redux', 'mobx', 'zustand', 'recoil', 'jotai', 'valtio', 'xstate', 'vuex', 'pinia',
    
    // Runtime Environments
    'node', 'nodejs', 'node.js', 'deno', 'bun', 'browser', 'electron', 'tauri',
    
    // Game Development
    'unity', 'unreal', 'unreal engine', 'godot', 'construct', 'gamemaker', 'phaser',
    
    // Data Science/ML
    'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy', 'jupyter', 'anaconda',
    'r studio', 'rstudio', 'tableau', 'power bi', 'powerbi', 'spark', 'hadoop',
    
    // CMS/E-commerce
    'wordpress', 'drupal', 'joomla', 'shopify', 'magento', 'woocommerce', 'prestashop',
    'strapi', 'contentful', 'sanity', 'ghost', 'jekyll', 'hugo', 'gatsby', 'next.js', 'nextjs',
    'nuxt', 'nuxtjs', 'nuxt.js', 'gridsome', 'sapper', 'sveltekit'
  ]);

  // Check if it's a known technology
  if (knownTechnologies.has(lowerName)) {
    return { isValid: true, reason: '' };
  }

  // Check for technology-like patterns
  const technologyPatterns = [
    // Version numbers (e.g., "React 18", "Node.js 16", "Python 3.9")
    /^[a-zA-Z][a-zA-Z0-9\s.\-+#]*\s+\d+(\.\d+)*$/,
    // Common tech suffixes
    /^[a-zA-Z][a-zA-Z0-9\s.\-+#]*\.(js|ts|py|rb|php|go|rs|java|kt|swift|dart)$/,
    // Framework/library patterns (ending with common suffixes)
    /^[a-zA-Z][a-zA-Z0-9\s.\-+#]*(js|ts|css|ui|db|sql|api|cli|sdk|orm|cms)$/i,
    // Technology with descriptors (e.g., "Spring Framework", "React Library")
    /^[a-zA-Z][a-zA-Z0-9\s.\-+#]*(framework|library|platform|engine|runtime|compiler|interpreter|database|server|client|tool|service)$/i,
    // Cloud/service patterns
    /^[a-zA-Z][a-zA-Z0-9\s.\-+#]*(cloud|aws|gcp|azure|service|api|cdn|storage|compute)$/i,
    // Common tech company products
    /^(google|microsoft|amazon|meta|facebook|apple|oracle|ibm|adobe|salesforce|atlassian)\s+[a-zA-Z][a-zA-Z0-9\s.\-+#]*$/i,
  ];

  for (const pattern of technologyPatterns) {
    if (pattern.test(name)) {
      return { isValid: true, reason: '' };
    }
  }

  // Check for partial matches with known technologies (fuzzy matching)
  for (const tech of knownTechnologies) {
    // Check if the input contains a known technology name
    if (lowerName.includes(tech) || tech.includes(lowerName)) {
      // Additional validation to avoid false positives
      if (Math.abs(lowerName.length - tech.length) <= 3) {
        return { isValid: true, reason: '' };
      }
    }
  }

  // Check against common English words that are definitely not technologies
  const commonWords = new Set([
    // Common nouns
    'house', 'car', 'book', 'table', 'chair', 'door', 'window', 'phone', 'computer', 'screen',
    'keyboard', 'mouse', 'paper', 'pen', 'pencil', 'bag', 'box', 'cup', 'plate', 'food',
    'water', 'fire', 'earth', 'air', 'tree', 'flower', 'grass', 'stone', 'rock', 'sand',
    'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'storm', 'light', 'dark',
    
    // Common verbs
    'run', 'walk', 'jump', 'sit', 'stand', 'eat', 'drink', 'sleep', 'work', 'play',
    'read', 'write', 'speak', 'listen', 'see', 'hear', 'feel', 'think', 'know', 'learn',
    'teach', 'help', 'make', 'build', 'create', 'destroy', 'fix', 'break', 'open', 'close',
    
    // Common adjectives
    'big', 'small', 'large', 'tiny', 'huge', 'little', 'tall', 'short', 'long', 'wide',
    'narrow', 'thick', 'thin', 'heavy', 'light', 'fast', 'slow', 'quick', 'easy', 'hard',
    'simple', 'complex', 'good', 'bad', 'nice', 'ugly', 'beautiful', 'pretty', 'clean', 'dirty',
    
    // Colors
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white',
    'gray', 'grey', 'silver', 'gold', 'bronze', 'copper', 'violet', 'indigo', 'cyan', 'magenta',
    
    // Animals
    'cat', 'dog', 'bird', 'fish', 'horse', 'cow', 'pig', 'sheep', 'goat', 'chicken',
    'duck', 'rabbit', 'mouse', 'rat', 'elephant', 'lion', 'tiger', 'bear', 'wolf', 'fox',
    
    // Body parts
    'head', 'face', 'eye', 'nose', 'mouth', 'ear', 'hair', 'neck', 'shoulder', 'arm',
    'hand', 'finger', 'chest', 'back', 'leg', 'foot', 'toe', 'heart', 'brain', 'skin',
    
    // Time words
    'time', 'day', 'night', 'morning', 'afternoon', 'evening', 'week', 'month', 'year',
    'hour', 'minute', 'second', 'today', 'tomorrow', 'yesterday', 'now', 'then', 'soon', 'late',
    
    // Common random words people might type
    'hello', 'world', 'test', 'example', 'sample', 'demo', 'placeholder', 'temp', 'temporary',
    'random', 'word', 'text', 'string', 'value', 'item', 'thing', 'stuff', 'object', 'element',
    'data', 'info', 'content', 'message', 'note', 'comment', 'description', 'title', 'name',
    
    // Gibberish-like but real words
    'lorem', 'ipsum', 'dolor', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'eiusmod',
    'tempor', 'incididunt', 'labore', 'dolore', 'magna', 'aliqua', 'enim', 'minim', 'veniam',
    
    // Single letters and very short combinations
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh', 'ii', 'jj', 'kk', 'll', 'mm', 'nn', 'oo', 'pp', 'qq', 'rr', 'ss', 'tt', 'uu', 'vv', 'ww', 'xx', 'yy', 'zz'
  ]);

  if (commonWords.has(lowerName)) {
    return {
      isValid: false,
      reason: `"${name}" is a common English word, not a technology. Please provide a technology name like "React", "Python", "Docker", "MySQL", etc.`
    };
  }

  // Check for obvious non-technology patterns
  const invalidPatterns = [
    // Random character sequences
    /^[a-z]{10,}$/, // Long sequences of lowercase letters
    /^[A-Z]{5,}$/, // Long sequences of uppercase letters
    /^[0-9]{5,}$/, // Long sequences of numbers
    /^[a-zA-Z0-9]{1,2}$/, // Very short random strings
    // Keyboard mashing patterns
    /^(qwerty|asdf|zxcv|hjkl|uiop|bnm|fgh|tyu|cvb|dfg|ert|wer|sdf|xcv|vbn|ghj|rty|fgb|hgf|jkl|mnb|poi|lkj|iop|plm|okn|ijn|uhb|ygv|tfc|rdx|esz|waq|qaz|wsx|edc|rfv|tgb|yhn|ujm|ik|ol|p)+$/i,
    // Common gibberish patterns
    /^[bcdfghjklmnpqrstvwxyz]{4,}$/i, // Consonant-heavy strings
    /^[aeiou]{4,}$/i, // Vowel-heavy strings
    // Repeated patterns
    /^(.{1,3})\1{3,}$/, // Same 1-3 characters repeated 4+ times
    // Random-looking patterns
    /^[a-z]{3,}[0-9]{3,}$/i, // Letters followed by many numbers
    /^[0-9]{3,}[a-z]{3,}$/i, // Numbers followed by many letters
    // Common test/placeholder patterns
    /^(test|example|sample|demo|placeholder|temp|temporary|lorem|ipsum|dolor|sit|amet|consectetur|adipiscing|elit|sed|do|eiusmod|tempor|incididunt|ut|labore|et|dolore|magna|aliqua|enim|ad|minim|veniam|quis|nostrud|exercitation|ullamco|laboris|nisi|aliquip|ex|ea|commodo|consequat|duis|aute|irure|in|reprehenderit|voluptate|velit|esse|cillum|fugiat|nulla|pariatur|excepteur|sint|occaecat|cupidatat|non|proident|sunt|culpa|qui|officia|deserunt|mollit|anim|id|est|laborum)+$/i,
    // Obvious gibberish words
    /^(sfas|fasdfdsaffewf|fdsvkljlkjl|sfoiejrioejnan|fdst|dfhrt|erlkoir|rtg|ewwfg|asdlkj|qwerty|zxcvbn|hjklop|mnbvcx|poiuyt|lkjhgf|wertyui|sdfghjk|xcvbnm|qazwsx|edcrfv|tgbyhn|ujmik|olp|plokij|uhbygv|tfc|rdx|esw|zaq|xsw|cde|vfr|bgt|nhy|mju|kil|opa|qsc|wde|rfg|thy|juk|ilo|pqs|awe|sdr|ftg|yhj|uki|lop|mnq|bvc|xza|swe|dcf|vgb|hyn|jmu|kio|lpa|qws|edr|ftg|yhu|jik|ola|pqs)+$/i,
    // Single character repeated
    /^(.)\1{2,}$/,
    // Alternating patterns that look random
    /^(ab|ba|cd|dc|ef|fe|gh|hg|ij|ji|kl|lk|mn|nm|op|po|qr|rq|st|ts|uv|vu|wx|xw|yz|zy){3,}$/i
  ];

  for (const pattern of invalidPatterns) {
    if (pattern.test(lowerName)) {
      return {
        isValid: false,
        reason: `"${name}" appears to be random characters rather than a technology name. Please provide a real technology like "React", "Python", "Docker", or "PostgreSQL".`
      };
    }
  }

  // If it doesn't match known technologies or patterns, it might still be valid
  // Check if it has reasonable characteristics of a technology name
  const hasReasonableLength = name.length >= 2 && name.length <= 50;
  const hasAlphaChars = /[a-zA-Z]/.test(name);
  const notAllNumbers = !/^\d+$/.test(name);
  const reasonableCharRatio = (name.match(/[a-zA-Z0-9]/g) || []).length / name.length >= 0.7;

  // Additional strict checks for unknown technologies
  const hasConsecutiveConsonants = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{4,}/.test(name);
  const hasConsecutiveVowels = /[aeiouAEIOU]{4,}/.test(name);
  const hasRepeatedChars = /(.)\1{3,}/.test(name);
  const isAllLowercase = name === name.toLowerCase() && name.length > 3;
  const isAllUppercase = name === name.toUpperCase() && name.length > 3;
  const hasNoVowels = !/[aeiouAEIOU]/.test(name) && name.length > 2;
  const isOnlyVowels = /^[aeiouAEIOU]+$/i.test(name) && name.length > 2;

  // Check if it looks like a real word/technology
  const vowelCount = (name.match(/[aeiouAEIOU]/g) || []).length;
  const consonantCount = (name.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;
  const hasReasonableVowelRatio = vowelCount > 0 && consonantCount > 0 && (vowelCount / name.length) >= 0.15 && (vowelCount / name.length) <= 0.7;

  if (hasReasonableLength && hasAlphaChars && notAllNumbers && reasonableCharRatio && hasReasonableVowelRatio) {
    // Additional checks to reject obvious gibberish
    if (hasConsecutiveConsonants || hasConsecutiveVowels || hasRepeatedChars || hasNoVowels || isOnlyVowels) {
      return {
        isValid: false,
        reason: `"${name}" doesn't appear to be a valid technology name. Please provide a recognized technology like "React", "Python", "Docker", "MySQL", "AWS", etc.`
      };
    }

    // Check for very short unknown names (likely gibberish) - with exception for 'C'
    if (name.length < 4 && !knownTechnologies.has(lowerName) && lowerName !== 'c') {
      return {
        isValid: false,
        reason: `"${name}" is too short and not a recognized technology. Please use full technology names like "React", "Vue", "Go", "PHP", etc.`
      };
    }

    // For longer unknown names, be more strict
    if (name.length >= 4) {
      // Check if it has at least some technology-like characteristics
      const hasTechSuffix = /\.(js|ts|py|rb|php|go|rs|java|kt|swift|dart|css|html|xml|json|sql)$/i.test(name);
      const hasTechKeywords = /(framework|library|platform|engine|runtime|compiler|interpreter|database|server|client|tool|service|api|sdk|cli|orm|cms|app|web|mobile|cloud|dev|tech|code|script|lang|language)$/i.test(name);
      const hasVersionPattern = /\d+(\.\d+)*/.test(name);
      const hasCompanyName = /^(google|microsoft|amazon|meta|facebook|apple|oracle|ibm|adobe|salesforce|atlassian|github|gitlab|docker|kubernetes|redis|nginx|apache|jetbrains)\s/i.test(name);
      
      if (hasTechSuffix || hasTechKeywords || hasVersionPattern || hasCompanyName) {
        return { isValid: true, reason: '' };
      }
      
      // If it's a longer unknown name without tech characteristics, reject it
      return {
        isValid: false,
        reason: `"${name}" doesn't appear to be a recognized technology. Please use well-known technologies like "React", "Python", "Docker", "PostgreSQL", "Kubernetes", etc. If this is a real technology, please use its full or commonly known name.`
      };
    }

    // Very short names that passed basic checks - allow only if they look reasonable
    return { isValid: true, reason: '' };
  }

  return {
    isValid: false,
    reason: `"${name}" doesn't appear to be a valid technology name. Please provide a recognized technology like "React", "Python", "Docker", "MySQL", "AWS", etc. If this is a real technology, please use its full or commonly known name.`
  };
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET(): Promise<NextResponse> {
  return createErrorResponse(
    'METHOD_NOT_ALLOWED',
    'GET method is not supported for this endpoint',
    405,
    'This endpoint only accepts POST requests with JSON body containing tech1 and tech2 fields'
  );
}

export async function PUT(): Promise<NextResponse> {
  return createErrorResponse(
    'METHOD_NOT_ALLOWED',
    'PUT method is not supported for this endpoint',
    405,
    'This endpoint only accepts POST requests with JSON body containing tech1 and tech2 fields'
  );
}

export async function DELETE(): Promise<NextResponse> {
  return createErrorResponse(
    'METHOD_NOT_ALLOWED',
    'DELETE method is not supported for this endpoint',
    405,
    'This endpoint only accepts POST requests with JSON body containing tech1 and tech2 fields'
  );
}

export async function PATCH(): Promise<NextResponse> {
  return createErrorResponse(
    'METHOD_NOT_ALLOWED',
    'PATCH method is not supported for this endpoint',
    405,
    'This endpoint only accepts POST requests with JSON body containing tech1 and tech2 fields'
  );
}
async function parseLLMResponse(response: string, tech1: string, tech2: string): Promise<{
  success: true;
  data: RefereeAnalysis;
} | {
  success: false;
  error: ApiError;
}> {
  // Validate input parameters
  if (!response || typeof response !== 'string' || response.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'PARSING_ERROR',
        message: 'LLM response is empty or invalid',
        details: 'Response must be a non-empty string',
        timestamp: new Date().toISOString()
      }
    };
  }

  if (!tech1 || !tech2 || tech1.trim().length === 0 || tech2.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'PARSING_ERROR',
        message: 'Technology names are invalid',
        details: 'Both tech1 and tech2 must be non-empty strings',
        timestamp: new Date().toISOString()
      }
    };
  }

  try {
    // Extract sections using regex patterns
    const sections = extractSections(response);
    
    if (!sections.success) {
      return {
        success: false,
        error: {
          code: 'PARSING_ERROR',
          message: 'Failed to parse LLM response structure',
          details: sections.error,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Parse Tale of the Tape
    const taleOfTheTape = parseTaleOfTheTape(sections.data.taleOfTheTape, tech1, tech2);
    if (!taleOfTheTape.success) {
      return {
        success: false,
        error: {
          code: 'PARSING_ERROR',
          message: 'Failed to parse Tale of the Tape section',
          details: taleOfTheTape.error,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Parse Scenarios
    const scenarios = parseScenarios(sections.data.verdicts, tech1, tech2);
    if (!scenarios.success) {
      return {
        success: false,
        error: {
          code: 'PARSING_ERROR',
          message: 'Failed to parse Verdicts section',
          details: scenarios.error,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Parse Hidden Tax
    const hiddenTax = parseHiddenTax(sections.data.hiddenTax);
    if (!hiddenTax.success) {
      return {
        success: false,
        error: {
          code: 'PARSING_ERROR',
          message: 'Failed to parse Hidden Tax section',
          details: hiddenTax.error,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Extract tie-breaker
    const tieBreaker = sections.data.tieBreaker.trim();
    if (!tieBreaker) {
      return {
        success: false,
        error: {
          code: 'PARSING_ERROR',
          message: 'Tie-breaker question is missing or empty',
          timestamp: new Date().toISOString()
        }
      };
    }

    // Construct final analysis
    const analysis: RefereeAnalysis = {
      matchup: {
        technology1: tech1,
        technology2: tech2
      },
      taleOfTheTape: taleOfTheTape.data,
      scenarios: scenarios.data,
      hiddenTax: hiddenTax.data,
      tieBreaker
    };

    return {
      success: true,
      data: analysis
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PARSING_ERROR',
        message: 'Unexpected error parsing LLM response',
        details: error instanceof Error ? error.message : 'Unknown parsing error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Extract main sections from LLM response
 */
function extractSections(response: string): {
  success: true;
  data: {
    matchup: string;
    taleOfTheTape: string;
    verdicts: string;
    hiddenTax: string;
    tieBreaker: string;
  };
} | {
  success: false;
  error: string;
} {
  try {
    // Validate input
    if (!response || typeof response !== 'string') {
      return {
        success: false,
        error: 'Response is not a valid string'
      };
    }

    const trimmedResponse = response.trim();
    if (trimmedResponse.length === 0) {
      return {
        success: false,
        error: 'Response is empty'
      };
    }

    console.log('Extracting sections from response, length:', trimmedResponse.length);
    console.log('Response preview:', trimmedResponse.substring(0, 500));
    
    // Define section patterns with more flexible matching
    const patterns = {
      matchup: /###\s*1\..*?(?:🥊|Matchup)\s*([\s\S]*?)(?=###\s*2\.|$)/i,
      taleOfTheTape: /###\s*2\..*?(?:📊|Tale of the Tape)\s*([\s\S]*?)(?=###\s*3\.|$)/i,
      verdicts: /###\s*3\..*?(?:⚖️|Verdicts)\s*([\s\S]*?)(?=###\s*4\.|$)/i,
      hiddenTax: /###\s*4\..*?(?:⚠️|Hidden Tax)\s*([\s\S]*?)(?=###\s*5\.|$)/i,
      tieBreaker: /###\s*5\..*?(?:🏁|Tie-Breaker)\s*([\s\S]*?)$/i
    };

    const sections: Record<string, string> = {};

    for (const [key, pattern] of Object.entries(patterns)) {
      try {
        const match = trimmedResponse.match(pattern);
        if (!match || !match[1] || match[1].trim().length === 0) {
          console.log(`Failed to match section: ${key}`);
          console.log(`Pattern: ${pattern}`);
          console.log(`Looking for section in: ${trimmedResponse.substring(0, 1000)}`);
          
          return {
            success: false,
            error: `Missing or empty section: ${key}. Response preview: ${trimmedResponse.substring(0, 200)}`
          };
        }
        sections[key] = match[1].trim();
        console.log(`Successfully extracted section: ${key}, length: ${sections[key].length}`);
      } catch (regexError) {
        console.error(`Regex error for section ${key}:`, regexError);
        return {
          success: false,
          error: `Failed to parse section ${key}: ${regexError instanceof Error ? regexError.message : 'Unknown regex error'}`
        };
      }
    }

    return {
      success: true,
      data: {
        matchup: sections.matchup,
        taleOfTheTape: sections.taleOfTheTape,
        verdicts: sections.verdicts,
        hiddenTax: sections.hiddenTax,
        tieBreaker: sections.tieBreaker
      }
    };

  } catch (error) {
    console.error('Section extraction error:', error);
    return {
      success: false,
      error: `Section extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Parse Tale of the Tape section into ComparisonMatrix
 */
function parseTaleOfTheTape(content: string, tech1: string, tech2: string): {
  success: true;
  data: ComparisonMatrix;
} | {
  success: false;
  error: string;
} {
  try {
    // Validate inputs
    if (!content || typeof content !== 'string') {
      return {
        success: false,
        error: 'Tale of the Tape content is not a valid string'
      };
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return {
        success: false,
        error: 'Tale of the Tape content is empty'
      };
    }

    if (!tech1 || !tech2 || tech1.trim().length === 0 || tech2.trim().length === 0) {
      return {
        success: false,
        error: 'Technology names are invalid for Tale of the Tape parsing'
      };
    }

    console.log('Parsing Tale of the Tape content:', trimmedContent.substring(0, 1000));
    
    const dimensions = ['Speed', 'Cost', 'Developer Experience', 'Scalability', 'Maintainability'];
    const comparison: Partial<ComparisonMatrix> = {};

    // First, try to parse as a markdown table
    const tableMatch = trimmedContent.match(/\|[^|]*\|[^|]*\|[^|]*\|/g);
    if (tableMatch && tableMatch.length > 2) {
      console.log('Found markdown table with', tableMatch.length, 'rows');
      
      // Skip header and separator rows, process data rows
      for (let i = 2; i < tableMatch.length; i++) {
        const row = tableMatch[i];
        console.log('Processing table row:', row);
        
        // Extract cells from the row
        const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
        
        if (cells.length >= 3) {
          const dimensionName = cells[0];
          const value1 = cells[1];
          const value2 = cells[2];
          
          console.log(`Table row: ${dimensionName} | ${value1} | ${value2}`);
          
          // Find matching dimension
          const matchingDimension = dimensions.find(dim => 
            dimensionName.toLowerCase().includes(dim.toLowerCase()) ||
            dim.toLowerCase().includes(dimensionName.toLowerCase())
          );
          
          if (matchingDimension) {
            const dimensionKeyMap: Record<string, keyof ComparisonMatrix> = {
              'speed': 'speed',
              'cost': 'cost',
              'developer experience': 'developerExperience',
              'scalability': 'scalability',
              'maintainability': 'maintainability'
            };
            
            const key = dimensionKeyMap[matchingDimension.toLowerCase()];
            if (key) {
              (comparison as any)[key] = {
                tech1: value1,
                tech2: value2
              };
              console.log(`Mapped ${matchingDimension} to ${key}:`, { tech1: value1, tech2: value2 });
            }
          }
        }
      }
    }

    // If table parsing didn't work or didn't find all dimensions, try line-by-line parsing
    if (Object.keys(comparison).length < 5) {
      console.log('Table parsing incomplete, trying line-by-line parsing');
      
      for (const dimension of dimensions) {
        if (comparison[dimension.toLowerCase().replace(/\s+/g, '') as keyof ComparisonMatrix]) {
          continue; // Already found this dimension
        }
        
        console.log(`Looking for dimension: ${dimension}`);
        
        // Try multiple patterns to match different formats
        const patterns = [
          // Pattern 1: | Speed | value1 | value2 |
          new RegExp(`\\|\\s*${dimension}\\s*\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)\\s*\\|`, 'i'),
          // Pattern 2: Speed: value1 | value2
          new RegExp(`${dimension}\\s*[:|]\\s*([^|\\n]+?)\\s*\\|\\s*([^|\\n]+?)(?=\\n|$)`, 'i'),
          // Pattern 3: Speed | value1 | value2
          new RegExp(`${dimension}\\s*\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)(?=\\n|$)`, 'i'),
          // Pattern 4: **Speed** | value1 | value2
          new RegExp(`\\*\\*${dimension}\\*\\*\\s*\\|\\s*([^|]+?)\\s*\\|\\s*([^|]+?)(?=\\n|$)`, 'i'),
          // Pattern 5: Speed - value1 vs value2
          new RegExp(`${dimension}\\s*[-:]\\s*([^\\n]+?)\\s+vs\\s+([^\\n]+?)(?=\\n|$)`, 'i'),
          // Pattern 6: More flexible line-based matching
          new RegExp(`${dimension}[^\\n]*?([A-Za-z0-9$][^|\\n]*?)\\s*[|\\s]+([A-Za-z0-9$][^|\\n]*?)(?=\\n|$)`, 'i')
        ];
        
        let match = null;
        
        for (let i = 0; i < patterns.length; i++) {
          try {
            match = trimmedContent.match(patterns[i]);
            if (match && match[1] && match[2] && match[1].trim().length > 0 && match[2].trim().length > 0) {
              console.log(`Found match for ${dimension} using pattern ${i}: "${match[1].trim()}" vs "${match[2].trim()}"`);
              break;
            }
          } catch (patternError) {
            console.error(`Pattern ${i} error for dimension ${dimension}:`, patternError);
            continue;
          }
        }
        
        if (match && match[1] && match[2]) {
          // Map dimension names to the correct ComparisonMatrix keys
          const dimensionKeyMap: Record<string, keyof ComparisonMatrix> = {
            'speed': 'speed',
            'cost': 'cost',
            'developerexperience': 'developerExperience',
            'developer experience': 'developerExperience',
            'scalability': 'scalability',
            'maintainability': 'maintainability'
          };
          
          const normalizedKey = dimension.toLowerCase().replace(/\s+/g, '');
          const key = dimensionKeyMap[normalizedKey] || dimensionKeyMap[dimension.toLowerCase()];
          
          if (key) {
            (comparison as any)[key] = {
              tech1: match[1].trim().replace(/^\*\*|\*\*$/g, ''), // Remove markdown bold
              tech2: match[2].trim().replace(/^\*\*|\*\*$/g, '')
            };
          }
        }
      }
    }

    // Check what we found
    console.log('Final comparison object:', comparison);
    console.log('Keys found:', Object.keys(comparison));

    // Validate all required fields are present
    if (!comparison.speed || !comparison.cost || !comparison.developerExperience || 
        !comparison.scalability || !comparison.maintainability) {
      
      const missing = [];
      if (!comparison.speed) missing.push('Speed');
      if (!comparison.cost) missing.push('Cost');
      if (!comparison.developerExperience) missing.push('Developer Experience');
      if (!comparison.scalability) missing.push('Scalability');
      if (!comparison.maintainability) missing.push('Maintainability');
      
      console.log('Missing dimensions:', missing);
      
      return {
        success: false,
        error: `Missing comparison data for: ${missing.join(', ')}. Found: ${Object.keys(comparison).join(', ')}. Content: ${trimmedContent.substring(0, 500)}`
      };
    }

    console.log('Successfully parsed Tale of the Tape:', comparison);
    return {
      success: true,
      data: comparison as ComparisonMatrix
    };

  } catch (error) {
    console.error('Tale of the Tape parsing error:', error);
    return {
      success: false,
      error: `Tale of the Tape parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Parse Verdicts section into ScenarioVerdict array
 */
function parseScenarios(content: string, tech1?: string, tech2?: string): {
  success: true;
  data: ScenarioVerdict[];
} | {
  success: false;
  error: string;
} {
  try {
    // Validate input
    if (!content || typeof content !== 'string') {
      return {
        success: false,
        error: 'Verdicts content is not a valid string'
      };
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return {
        success: false,
        error: 'Verdicts content is empty'
      };
    }

    console.log('Parsing Verdicts content:', trimmedContent.substring(0, 800));
    
    const scenarios: ScenarioVerdict[] = [];
    const scenarioNames: Array<'Move Fast Team' | 'Scale Team' | 'Budget Team'> = [
      'Move Fast Team', 'Scale Team', 'Budget Team'
    ];

    for (const name of scenarioNames) {
      console.log(`Looking for scenario: ${name}`);
      
      // Try multiple patterns to match different scenario formats
      const patterns = [
        // Pattern 1: **Scenario A (The 'Move Fast' Team):**
        new RegExp(`\\*\\*Scenario [ABC] \\(The '${name.replace(' Team', '')}' Team\\):\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*Scenario|$)`, 'i'),
        // Pattern 2: **Scenario A (The "Move Fast" Team):**
        new RegExp(`\\*\\*Scenario [ABC] \\(The "${name.replace(' Team', '')}" Team\\):\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*Scenario|$)`, 'i'),
        // Pattern 3: ### Scenario A (The 'Move Fast' Team)
        new RegExp(`###\\s*Scenario [ABC] \\(The '${name.replace(' Team', '')}' Team\\)\\s*([\\s\\S]*?)(?=###|$)`, 'i'),
        // Pattern 4: **Scenario A: The 'Move Fast' Team**
        new RegExp(`\\*\\*Scenario [ABC]:\\s*The '${name.replace(' Team', '')}' Team\\*\\*\\s*([\\s\\S]*?)(?=\\*\\*Scenario|$)`, 'i'),
        // Pattern 5: More flexible - just look for the team name
        new RegExp(`(?:Scenario [ABC]|\\*\\*.*?).*?${name.replace(' Team', '')}.*?Team.*?([\\s\\S]*?)(?=(?:Scenario [ABC]|\\*\\*.*?Team)|$)`, 'i'),
        // Pattern 6: Very flexible - just the team type
        new RegExp(`${name.replace(' Team', '')}.*?Team.*?([\\s\\S]*?)(?=(?:Scale|Budget|Move Fast).*?Team|$)`, 'i')
      ];
      
      let match = null;
      
      for (let i = 0; i < patterns.length; i++) {
        try {
          match = trimmedContent.match(patterns[i]);
          if (match && match[1] && match[1].trim().length > 10) {
            console.log(`Found scenario ${name} using pattern ${i}`);
            break;
          }
        } catch (patternError) {
          console.error(`Pattern ${i} error for scenario ${name}:`, patternError);
          continue;
        }
      }
      
      if (!match || !match[1]) {
        console.log(`No match found for ${name}. Searching for team name in content...`);
        const teamType = name.replace(' Team', '');
        const teamIndex = trimmedContent.toLowerCase().indexOf(teamType.toLowerCase());
        if (teamIndex >= 0) {
          const start = Math.max(0, teamIndex - 100);
          const end = Math.min(trimmedContent.length, teamIndex + 300);
          console.log(`Found "${teamType}" at position ${teamIndex}. Context:`, trimmedContent.substring(start, end));
        }
        
        return {
          success: false,
          error: `Missing scenario: ${name}. Content preview: ${trimmedContent.substring(0, 400)}`
        };
      }

      const scenarioContent = match[1].trim();
      console.log(`Scenario content for ${name}:`, scenarioContent.substring(0, 200));
      
      // Extract winner and reasoning with more flexible patterns
      let winnerMatch = null;
      let reasoningMatch = null;

      try {
        // Try multiple patterns to extract winner information
        const winnerPatterns = [
          // Standard format: "Which wins? Technology wins."
          /Which wins\?\s*([^.!?\n]*[.!?])/i,
          // Alternative: "Winner: Technology" or "Technology wins"
          /(?:Winner|wins?):\s*([^.\n]+)/i,
          /([A-Za-z][A-Za-z0-9\s.+-]*)\s+wins/i,
          // More flexible: "Technology could be seen as the winner"
          /([A-Za-z][A-Za-z0-9\s.+-]*)\s+(?:could be seen as|is|would be)\s+(?:the\s+)?winner/i,
          // Even more flexible: "Technology is better" or "go with Technology"
          /(?:go with|choose|pick|use)\s+([A-Za-z][A-Za-z0-9\s.+-]*)/i,
          /([A-Za-z][A-Za-z0-9\s.+-]*)\s+(?:is|would be)\s+(?:better|preferred|recommended)/i,
          // Last resort: look for technology names mentioned prominently
          /\b([A-Za-z][A-Za-z0-9\s.+-]{2,})\b.*(?:advantage|benefit|better|superior|preferred)/i
        ];

        for (const pattern of winnerPatterns) {
          winnerMatch = scenarioContent.match(pattern);
          if (winnerMatch && winnerMatch[1] && winnerMatch[1].trim().length > 0) {
            console.log(`Found winner using pattern: ${pattern}`, winnerMatch[1]);
            break;
          }
        }

        // Try to extract reasoning
        const reasoningPatterns = [
          // Standard format: "Why? Reason here"
          /Why\?\s*([^]*?)(?=Which wins|$)/i,
          // Alternative: "Reason:" or "Because"
          /(?:Reason|Because):\s*([^]*?)$/i,
          // More flexible: extract everything after winner statement
          /(?:wins?|winner|better|preferred)\.?\s*([^]*?)$/i,
          // If no clear pattern, use the whole content as reasoning
          /([^]*)/
        ];

        for (const pattern of reasoningPatterns) {
          reasoningMatch = scenarioContent.match(pattern);
          if (reasoningMatch && reasoningMatch[1] && reasoningMatch[1].trim().length > 10) {
            console.log(`Found reasoning using pattern: ${pattern}`);
            break;
          }
        }

        // If we still don't have reasoning, use the scenario content
        if (!reasoningMatch || !reasoningMatch[1] || reasoningMatch[1].trim().length < 10) {
          reasoningMatch = [scenarioContent, scenarioContent] as RegExpMatchArray;
        }

      } catch (extractionError) {
        console.error(`Error extracting winner/reasoning for ${name}:`, extractionError);
        return {
          success: false,
          error: `Failed to extract winner/reasoning for ${name}: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`
        };
      }
      
      if (!winnerMatch || !winnerMatch[1] || winnerMatch[1].trim().length === 0) {
        console.log(`Could not extract winner from scenario content: ${scenarioContent}`);
        
        // Try a fallback approach - look for technology names in the content
        if (!tech1 || !tech2) {
          return {
            success: false,
            error: `Could not determine winner for ${name} - technology names not available. Content: ${scenarioContent.substring(0, 200)}`
          };
        }
        
        const tech1Lower = tech1.toLowerCase();
        const tech2Lower = tech2.toLowerCase();
        const contentLower = scenarioContent.toLowerCase();
        
        let fallbackWinner = '';
        
        // Check which technology is mentioned more prominently or in a positive context
        const tech1Mentions = (contentLower.match(new RegExp(tech1Lower, 'g')) || []).length;
        const tech2Mentions = (contentLower.match(new RegExp(tech2Lower, 'g')) || []).length;
        
        // Look for positive context around technology names
        const positiveWords = ['winner', 'better', 'preferred', 'advantage', 'superior', 'recommended', 'choose', 'go with'];
        
        for (const word of positiveWords) {
          const tech1Context = contentLower.includes(`${tech1Lower} ${word}`) || contentLower.includes(`${word} ${tech1Lower}`);
          const tech2Context = contentLower.includes(`${tech2Lower} ${word}`) || contentLower.includes(`${word} ${tech2Lower}`);
          
          if (tech1Context && !tech2Context) {
            fallbackWinner = tech1;
            break;
          } else if (tech2Context && !tech1Context) {
            fallbackWinner = tech2;
            break;
          }
        }
        
        // If still no clear winner, use the technology mentioned more frequently
        if (!fallbackWinner) {
          if (tech1Mentions > tech2Mentions) {
            fallbackWinner = tech1;
          } else if (tech2Mentions > tech1Mentions) {
            fallbackWinner = tech2;
          } else {
            // Last resort: extract the first technology name mentioned
            const techPattern = new RegExp(`\\b(${tech1Lower}|${tech2Lower})\\b`, 'i');
            const firstMention = scenarioContent.match(techPattern);
            fallbackWinner = firstMention ? firstMention[1] : tech1; // Default to tech1 if all else fails
          }
        }
        
        if (fallbackWinner) {
          console.log(`Using fallback winner for ${name}: ${fallbackWinner}`);
          winnerMatch = [scenarioContent, fallbackWinner] as RegExpMatchArray;
        } else {
          return {
            success: false,
            error: `Could not determine winner for ${name}. Content: ${scenarioContent.substring(0, 200)}`
          };
        }
      }
      
      if (!reasoningMatch || !reasoningMatch[1] || reasoningMatch[1].trim().length === 0) {
        console.log(`Could not extract reasoning from scenario content: ${scenarioContent}`);
        // Use the entire scenario content as reasoning if we can't parse it better
        reasoningMatch = [scenarioContent, scenarioContent.trim()] as RegExpMatchArray;
      }

      const winner = winnerMatch[1].trim();
      const reasoning = reasoningMatch[1].trim();
      
      console.log(`Extracted for ${name}: Winner="${winner}", Reasoning="${reasoning.substring(0, 100)}..."`);

      scenarios.push({
        name,
        winner,
        reasoning,
        context: `${name} scenario analysis`
      });
    }

    if (scenarios.length !== 3) {
      console.log(`Expected 3 scenarios, found ${scenarios.length}`);
      return {
        success: false,
        error: `Expected 3 scenarios, found ${scenarios.length}. Found scenarios: ${scenarios.map(s => s.name).join(', ')}`
      };
    }

    console.log('Successfully parsed all scenarios:', scenarios.map(s => s.name));
    return {
      success: true,
      data: scenarios
    };

  } catch (error) {
    console.error('Scenarios parsing error:', error);
    return {
      success: false,
      error: `Scenarios parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Parse Hidden Tax section into HiddenTax object
 */
function parseHiddenTax(content: string): {
  success: true;
  data: HiddenTax;
} | {
  success: false;
  error: string;
} {
  try {
    // Validate input
    if (!content || typeof content !== 'string') {
      return {
        success: false,
        error: 'Hidden Tax content is not a valid string'
      };
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return {
        success: false,
        error: 'Hidden Tax content is empty'
      };
    }

    // Extract hidden tax information with more flexible patterns
    let taxMatch = null;
    
    // Try the standard pattern first
    try {
      taxMatch = trimmedContent.match(/If you choose\s+([^,]+),\s*be prepared to pay the tax of\s+([^.]+)\s+in\s+([^.]+)/i);
    } catch (regexError) {
      console.error('Regex error in Hidden Tax parsing:', regexError);
      return {
        success: false,
        error: `Hidden Tax regex failed: ${regexError instanceof Error ? regexError.message : 'Unknown regex error'}`
      };
    }
    
    if (!taxMatch || !taxMatch[1] || !taxMatch[2] || !taxMatch[3]) {
      // Try alternative patterns
      const alternativePatterns = [
        // Pattern with different punctuation
        /If you choose\s+([^,]+),?\s*be prepared to pay the tax of\s+([^.!?]+)[.!?]?\s*in\s+([^.!?]+)/i,
        // Pattern without "in timeframe"
        /If you choose\s+([^,]+),?\s*be prepared to pay the tax of\s+([^.!?]+)/i,
        // More flexible pattern
        /choose\s+([^,]+).*?tax.*?of\s+([^.!?\n]+).*?in\s+([^.!?\n]+)/i,
        // Even more flexible - just look for "tax of X"
        /tax\s+of\s+([^.!?\n]+)(?:\s+in\s+([^.!?\n]+))?/i,
        // Look for technology name and consequence
        /([A-Za-z][A-Za-z0-9\s.+-]+).*?(?:tax|cost|downside|problem).*?([^.!?\n]+)/i
      ];

      for (let i = 0; i < alternativePatterns.length; i++) {
        try {
          taxMatch = trimmedContent.match(alternativePatterns[i]);
          if (taxMatch && taxMatch[1] && taxMatch[2]) {
            console.log(`Found Hidden Tax using alternative pattern ${i}`);
            
            // For patterns that don't capture timeframe, set a default
            if (!taxMatch[3] && i < 4) {
              taxMatch[3] = '6 months'; // Default timeframe
            }
            break;
          }
        } catch (patternError) {
          console.error(`Alternative pattern ${i} error:`, patternError);
          continue;
        }
      }
    }

    if (!taxMatch || !taxMatch[1] || !taxMatch[2]) {
      // Last resort: try to extract any technology name and warning from the content
      console.log('Attempting fallback Hidden Tax parsing...');
      
      // Look for any technology name mentioned
      const techPattern = /\b([A-Za-z][A-Za-z0-9\s.+-]{2,20})\b/g;
      const techMatches = Array.from(trimmedContent.matchAll(techPattern));
      
      // Look for warning-like content
      const warningPattern = /(complexity|maintenance|learning curve|cost|overhead|difficulty|challenge|problem|issue|burden)[^.!?\n]*/i;
      const warningMatch = trimmedContent.match(warningPattern);
      
      if (techMatches.length > 0 && warningMatch) {
        const technology = techMatches[0][1].trim();
        const warning = warningMatch[0].trim();
        const timeframe = '6 months'; // Default timeframe
        
        console.log(`Fallback Hidden Tax extraction: ${technology} -> ${warning}`);
        
        return {
          success: true,
          data: {
            technology,
            warning,
            timeframe,
            impact: `${warning} expected in ${timeframe}`
          }
        };
      }
      
      return {
        success: false,
        error: `Hidden Tax format does not match expected pattern. Content: ${trimmedContent.substring(0, 200)}`
      };
    }

    const technology = taxMatch[1].trim();
    const warning = taxMatch[2].trim();
    const timeframe = taxMatch[3] ? taxMatch[3].trim() : '6 months'; // Default timeframe

    // Validate extracted values
    if (technology.length === 0) {
      return {
        success: false,
        error: 'Technology name is empty in Hidden Tax'
      };
    }

    if (warning.length === 0) {
      return {
        success: false,
        error: 'Warning text is empty in Hidden Tax'
      };
    }
    
    return {
      success: true,
      data: {
        technology,
        warning,
        timeframe,
        impact: `${warning} expected in ${timeframe}`
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Hidden tax parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
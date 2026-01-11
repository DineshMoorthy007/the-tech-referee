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
    
    // Basic rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    
    if (!checkRateLimit(clientId)) {
      console.log('Rate limit exceeded for client:', clientId);
      return createErrorResponse(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please wait before trying again.',
        429
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

    // Additional validation
    if (tech1.toLowerCase().trim() === tech2.toLowerCase().trim()) {
      console.log('Duplicate technologies detected');
      return createErrorResponse(
        'DUPLICATE_TECHNOLOGIES',
        'Please provide two different technologies for comparison.',
        400
      );
    }

    // Create and validate prompt package
    console.log('Creating prompt package...');
    const promptPackage = createPromptPackage(tech1, tech2);
    if (!promptPackage.isValid) {
      console.log('Prompt validation failed:', promptPackage.errors);
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid technology inputs provided.',
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

    // Handle specific error types
    if (error instanceof OpenAIError) {
      console.log('OpenAI error details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      
      // Map OpenAI errors to appropriate HTTP status codes
      let status = 500;
      let code = error.code;
      let message = error.message;

      if (error.code === 'insufficient_quota' || error.code === 'rate_limit_exceeded') {
        status = 429;
        message = 'Service temporarily unavailable due to high demand. Please try again in a moment.';
      } else if (error.code === 'invalid_api_key') {
        status = 500;
        message = 'Service configuration error. Please try again later.';
        code = 'SERVICE_ERROR';
      } else if (error.code === 'model_not_found') {
        status = 500;
        message = 'Analysis service temporarily unavailable. Please try again later.';
        code = 'SERVICE_ERROR';
      }

      return createErrorResponse(code, message, status, error.details);
    }

    // Handle timeout errors
    if (error instanceof Error && error.message === 'Request timeout') {
      console.log('Request timeout occurred');
      return createErrorResponse(
        'TIMEOUT_ERROR',
        'The analysis request timed out. Please try again with simpler technology names.',
        408
      );
    }

    // Handle validation errors
    if (error instanceof Error && error.message.includes('JSON')) {
      console.log('JSON parsing error:', error.message);
      return createErrorResponse(
        'INVALID_REQUEST',
        'Invalid request format. Please check your input and try again.',
        400
      );
    }

    // Handle generic errors
    console.log('Generic error occurred:', error);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred while processing your request. Please try again.',
      500,
      process.env.NODE_ENV === 'development' ? error : undefined
    );
  }
}

/**
 * Parse and validate request body
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

    // Validate required fields
    if (!body || typeof body !== 'object') {
      return {
        success: false,
        error: {
          code: 'INVALID_REQUEST_BODY',
          message: 'Request body must be a valid JSON object',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (!body.tech1 || typeof body.tech1 !== 'string') {
      return {
        success: false,
        error: {
          code: 'MISSING_TECH1',
          message: 'tech1 field is required and must be a string',
          timestamp: new Date().toISOString()
        }
      };
    }

    if (!body.tech2 || typeof body.tech2 !== 'string') {
      return {
        success: false,
        error: {
          code: 'MISSING_TECH2',
          message: 'tech2 field is required and must be a string',
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      data: {
        tech1: body.tech1.trim(),
        tech2: body.tech2.trim()
      }
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON',
        details: error instanceof Error ? error.message : 'JSON parse error',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Parse LLM response into structured RefereeAnalysis
 */
async function parseLLMResponse(response: string, tech1: string, tech2: string): Promise<{
  success: true;
  data: RefereeAnalysis;
} | {
  success: false;
  error: ApiError;
}> {
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
    const scenarios = parseScenarios(sections.data.verdicts);
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
    console.log('Extracting sections from response, length:', response.length);
    console.log('Response preview:', response.substring(0, 500));
    
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
      const match = response.match(pattern);
      if (!match || !match[1]) {
        console.log(`Failed to match section: ${key}`);
        console.log(`Pattern: ${pattern}`);
        console.log(`Looking for section in: ${response.substring(0, 1000)}`);
        
        return {
          success: false,
          error: `Missing or empty section: ${key}. Response preview: ${response.substring(0, 200)}`
        };
      }
      sections[key] = match[1].trim();
      console.log(`Successfully extracted section: ${key}, length: ${sections[key].length}`);
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
    console.log('Parsing Tale of the Tape content:', content.substring(0, 1000));
    
    const dimensions = ['Speed', 'Cost', 'Developer Experience', 'Scalability', 'Maintainability'];
    const comparison: Partial<ComparisonMatrix> = {};

    // First, try to parse as a markdown table
    const tableMatch = content.match(/\|[^|]*\|[^|]*\|[^|]*\|/g);
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
        let patternUsed = -1;
        
        for (let i = 0; i < patterns.length; i++) {
          match = content.match(patterns[i]);
          if (match && match[1] && match[2]) {
            patternUsed = i;
            console.log(`Found match for ${dimension} using pattern ${i}: "${match[1].trim()}" vs "${match[2].trim()}"`);
            break;
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
      if (!comparison.speed) missing.push('speed');
      if (!comparison.cost) missing.push('cost');
      if (!comparison.developerExperience) missing.push('developerExperience');
      if (!comparison.scalability) missing.push('scalability');
      if (!comparison.maintainability) missing.push('maintainability');
      
      console.log('Missing dimensions:', missing);
      
      return {
        success: false,
        error: `Missing comparison data for: ${missing.join(', ')}. Found: ${Object.keys(comparison).join(', ')}. Content: ${content.substring(0, 500)}`
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
function parseScenarios(content: string): {
  success: true;
  data: ScenarioVerdict[];
} | {
  success: false;
  error: string;
} {
  try {
    console.log('Parsing Verdicts content:', content.substring(0, 800));
    
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
      let patternUsed = -1;
      
      for (let i = 0; i < patterns.length; i++) {
        match = content.match(patterns[i]);
        if (match && match[1] && match[1].trim().length > 10) {
          patternUsed = i;
          console.log(`Found scenario ${name} using pattern ${i}`);
          break;
        }
      }
      
      if (!match || !match[1]) {
        console.log(`No match found for ${name}. Searching for team name in content...`);
        const teamType = name.replace(' Team', '');
        const teamIndex = content.toLowerCase().indexOf(teamType.toLowerCase());
        if (teamIndex >= 0) {
          const start = Math.max(0, teamIndex - 100);
          const end = Math.min(content.length, teamIndex + 300);
          console.log(`Found "${teamType}" at position ${teamIndex}. Context:`, content.substring(start, end));
        }
        
        return {
          success: false,
          error: `Missing scenario: ${name}. Content preview: ${content.substring(0, 400)}`
        };
      }

      const scenarioContent = match[1].trim();
      console.log(`Scenario content for ${name}:`, scenarioContent.substring(0, 200));
      
      // Extract winner and reasoning with more flexible patterns
      let winnerMatch = scenarioContent.match(/Which wins\?\s*([^.!?\n]*[.!?])/i);
      let reasoningMatch = scenarioContent.match(/Why\?\s*([^]*?)(?=Which wins|$)/i);
      
      // Try alternative patterns if the first ones don't work
      if (!winnerMatch) {
        // Try patterns like "Winner: React" or "React wins"
        winnerMatch = scenarioContent.match(/(?:Winner|wins?):\s*([^.\n]+)/i) ||
                     scenarioContent.match(/([A-Za-z]+)\s+wins/i) ||
                     scenarioContent.match(/(?:The winner is|Winner is)\s*([^.\n]+)/i);
      }
      
      if (!reasoningMatch) {
        // Try to extract reasoning from the whole content if "Why?" pattern doesn't work
        reasoningMatch = scenarioContent.match(/(?:Why\?|Reason|Because)\s*([^]*?)$/i) ||
                        [null, scenarioContent]; // Use the whole content as reasoning if nothing else works
      }
      
      if (!winnerMatch) {
        console.log(`Could not extract winner from scenario content: ${scenarioContent}`);
        return {
          success: false,
          error: `Could not extract winner for ${name}. Content: ${scenarioContent.substring(0, 200)}`
        };
      }
      
      if (!reasoningMatch) {
        console.log(`Could not extract reasoning from scenario content: ${scenarioContent}`);
        return {
          success: false,
          error: `Could not extract reasoning for ${name}. Content: ${scenarioContent.substring(0, 200)}`
        };
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
    // Extract hidden tax information
    const taxMatch = content.match(/If you choose\s+([^,]+),\s*be prepared to pay the tax of\s+([^.]+)\s+in\s+([^.]+)/i);
    
    if (!taxMatch) {
      return {
        success: false,
        error: 'Hidden tax format does not match expected pattern'
      };
    }

    const [, technology, warning, timeframe] = taxMatch;
    
    return {
      success: true,
      data: {
        technology: technology.trim(),
        warning: warning.trim(),
        timeframe: timeframe.trim(),
        impact: `${warning.trim()} expected in ${timeframe.trim()}`
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Hidden tax parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
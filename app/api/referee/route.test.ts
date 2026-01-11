/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fc from 'fast-check';

// Feature: tech-referee, Property 14: API error handling
// **Validates: Requirements 5.2, 5.5**

// Mock the OpenAI module
jest.mock('@/lib/openai', () => ({
  callOpenAI: jest.fn(),
  OpenAIError: class OpenAIError extends Error {
    constructor(message: string, public code: string, public details?: any) {
      super(message);
      this.name = 'OpenAIError';
    }
  },
  validateOpenAIConfig: jest.fn()
}));

// Mock Next.js server components
const mockNextResponse = {
  json: jest.fn().mockImplementation((data, init) => ({
    json: jest.fn().mockResolvedValue(data),
    status: init?.status || 200,
    data
  }))
};

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: mockNextResponse
}));

describe('API Error Handling Property Tests', () => {
  let POST: any;
  let openaiModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after mocks are set up
    const routeModule = await import('./route');
    POST = routeModule.POST;
    
    openaiModule = await import('@/lib/openai');
    
    // Default to successful validation
    openaiModule.validateOpenAIConfig.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Property 14: API error handling
  // For any API failure scenario, the system should return appropriate error messages and maintain system stability
  it('should handle OpenAI API errors gracefully', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        errorCode: fc.constantFrom('rate_limit_exceeded', 'invalid_api_key', 'model_overloaded', 'timeout'),
        errorMessage: fc.string({ minLength: 1, maxLength: 200 })
      }),
      async ({ tech1, tech2, errorCode, errorMessage }) => {
        // Arrange: Mock OpenAI to throw an error
        const openaiError = new openaiModule.OpenAIError(errorMessage, errorCode, { status: 500 });
        openaiModule.callOpenAI.mockRejectedValue(openaiError);

        // Create mock request
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ tech1, tech2 })
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Error handling properties
        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.error.code).toBe(errorCode);
        expect(responseData.error.message).toContain(errorMessage);
        expect(responseData.error.timestamp).toBeDefined();
        expect(new Date(responseData.error.timestamp)).toBeInstanceOf(Date);
        
        // System should remain stable (no undefined/null critical fields)
        expect(responseData.error.code).toBeTruthy();
        expect(responseData.error.message).toBeTruthy();
      }
    ), { numRuns: 100 });
  });

  it('should handle invalid request bodies with proper error responses', async () => {
    await fc.assert(fc.asyncProperty(
      fc.oneof(
        fc.record({
          tech1: fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant(''), fc.integer()),
          tech2: fc.string({ minLength: 1 })
        }),
        fc.record({
          tech1: fc.string({ minLength: 1 }),
          tech2: fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant(''), fc.integer())
        }),
        fc.record({
          wrongField: fc.string()
        })
      ),
      async (invalidBody) => {
        // Create mock request with invalid body
        const mockRequest = {
          json: jest.fn().mockResolvedValue(invalidBody)
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Validation error properties
        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.error.code).toBeTruthy();
        expect(responseData.error.message).toBeTruthy();
        expect(responseData.error.timestamp).toBeDefined();
        
        // Error should be descriptive for debugging
        expect(typeof responseData.error.message).toBe('string');
        expect(responseData.error.message.length).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });

  it('should handle malformed JSON requests gracefully', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string().filter(s => s.length > 0),
      async (errorMessage) => {
        // Create mock request that throws JSON parse error
        const mockRequest = {
          json: jest.fn().mockRejectedValue(new Error(errorMessage))
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: JSON parsing error properties
        expect(response.status).toBe(400);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.error.code).toBe('INVALID_JSON');
        expect(responseData.error.message).toContain('JSON');
        expect(responseData.error.timestamp).toBeDefined();
      }
    ), { numRuns: 50 });
  });

  it('should handle unexpected errors with fallback error responses', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        errorMessage: fc.string({ minLength: 1, maxLength: 200 })
      }),
      async ({ tech1, tech2, errorMessage }) => {
        // Arrange: Mock OpenAI to throw a generic error (not OpenAIError)
        const genericError = new Error(errorMessage);
        openaiModule.callOpenAI.mockRejectedValue(genericError);

        // Create mock request
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ tech1, tech2 })
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Generic error handling properties
        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.error.code).toBe('INTERNAL_ERROR');
        expect(responseData.error.message).toBe('An unexpected error occurred');
        expect(responseData.error.details).toContain(errorMessage);
        expect(responseData.error.timestamp).toBeDefined();
        
        // System should provide meaningful fallback
        expect(responseData.error.message).toBeTruthy();
        expect(responseData.error.code).toBeTruthy();
      }
    ), { numRuns: 100 });
  });

  it('should maintain consistent error response structure across all error types', async () => {
    await fc.assert(fc.asyncProperty(
      fc.oneof(
        // Valid request that will hit OpenAI error
        fc.record({
          type: fc.constant('openai_error'),
          tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
        }),
        // Invalid request body
        fc.record({
          type: fc.constant('validation_error'),
          tech1: fc.constant(''),
          tech2: fc.string({ minLength: 1 })
        })
      ),
      async (testCase) => {
        let mockRequest: any;
        
        if (testCase.type === 'openai_error') {
          openaiModule.callOpenAI.mockRejectedValue(new openaiModule.OpenAIError('Test error', 'TEST_ERROR'));
          mockRequest = {
            json: jest.fn().mockResolvedValue({ tech1: testCase.tech1, tech2: testCase.tech2 })
          };
        } else {
          mockRequest = {
            json: jest.fn().mockResolvedValue(testCase)
          };
        }

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Consistent error structure properties
        expect(responseData).toHaveProperty('success', false);
        expect(responseData).toHaveProperty('error');
        expect(responseData.error).toHaveProperty('code');
        expect(responseData.error).toHaveProperty('message');
        expect(responseData.error).toHaveProperty('timestamp');
        
        // All error codes should be strings
        expect(typeof responseData.error.code).toBe('string');
        expect(responseData.error.code.length).toBeGreaterThan(0);
        
        // All error messages should be strings
        expect(typeof responseData.error.message).toBe('string');
        expect(responseData.error.message.length).toBeGreaterThan(0);
        
        // Timestamps should be valid ISO strings
        expect(() => new Date(responseData.error.timestamp)).not.toThrow();
        expect(new Date(responseData.error.timestamp).toISOString()).toBe(responseData.error.timestamp);
      }
    ), { numRuns: 100 });
  });
});

// ============================================================================
// Unit Tests for API Route
// ============================================================================

describe('API Route Unit Tests', () => {
  let POST: any;
  let openaiModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after mocks are set up
    const routeModule = await import('./route');
    POST = routeModule.POST;
    
    openaiModule = await import('@/lib/openai');
    
    // Default to successful validation
    openaiModule.validateOpenAIConfig.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful analysis generation', () => {
    it('should generate complete analysis for valid technology matchup', async () => {
      // Arrange: Create a valid LLM response
      const validLLMResponse = `
### 1. 🥊 The Matchup
React vs Vue for frontend development

### 2. 📊 The Tale of the Tape
Speed | React: Fast virtual DOM | Vue: Optimized reactivity
Cost | React: Free open source | Vue: Free open source
Developer Experience | React: Large ecosystem | Vue: Gentle learning curve
Scalability | React: Component composition | Vue: Progressive framework
Maintainability | React: Explicit state flow | Vue: Template-based clarity

### 3. ⚖️ The Verdicts
**Scenario A (The 'Move Fast' Team):** Which wins? React wins. Why? Massive ecosystem and job market.
**Scenario B (The 'Scale' Team):** Which wins? React wins. Why? Better tooling for large applications.
**Scenario C (The 'Budget' Team):** Which wins? Vue wins. Why? Faster development with less complexity.

### 4. ⚠️ The "Hidden Tax"
If you choose React, be prepared to pay the tax of decision fatigue from too many choices in 6 months.

### 5. 🏁 The Tie-Breaker
Do you have experienced React developers on your team?
      `.trim();

      // Mock successful OpenAI response
      openaiModule.callOpenAI.mockResolvedValue(validLLMResponse);

      // Create mock request
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act: Call the API
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert: Successful response structure
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
      
      const analysis = responseData.data;
      expect(analysis.matchup.technology1).toBe('React');
      expect(analysis.matchup.technology2).toBe('Vue');
      
      // Verify Tale of the Tape structure
      expect(analysis.taleOfTheTape.speed.tech1).toContain('Fast virtual DOM');
      expect(analysis.taleOfTheTape.speed.tech2).toContain('Optimized reactivity');
      expect(analysis.taleOfTheTape.cost.tech1).toContain('Free open source');
      expect(analysis.taleOfTheTape.developerExperience.tech1).toContain('Large ecosystem');
      expect(analysis.taleOfTheTape.scalability.tech1).toContain('Component composition');
      expect(analysis.taleOfTheTape.maintainability.tech1).toContain('Explicit state flow');
      
      // Verify scenarios
      expect(analysis.scenarios).toHaveLength(3);
      expect(analysis.scenarios[0].name).toBe('Move Fast Team');
      expect(analysis.scenarios[1].name).toBe('Scale Team');
      expect(analysis.scenarios[2].name).toBe('Budget Team');
      expect(analysis.scenarios[0].winner).toContain('React');
      expect(analysis.scenarios[2].winner).toContain('Vue');
      
      // Verify hidden tax
      expect(analysis.hiddenTax.technology).toBe('React');
      expect(analysis.hiddenTax.warning).toContain('decision fatigue');
      expect(analysis.hiddenTax.timeframe).toBe('6 months');
      
      // Verify tie-breaker
      expect(analysis.tieBreaker).toContain('experienced React developers');
    });

    it('should handle different technology names correctly', async () => {
      // Arrange: Test with different technology names
      const validLLMResponse = `
### 1. 🥊 The Matchup
PostgreSQL vs MongoDB for database choice

### 2. 📊 The Tale of the Tape
Speed | PostgreSQL: ACID compliance | MongoDB: Document flexibility
Cost | PostgreSQL: Open source | MongoDB: Freemium model
Developer Experience | PostgreSQL: SQL familiarity | MongoDB: JSON-like queries
Scalability | PostgreSQL: Vertical scaling | MongoDB: Horizontal sharding
Maintainability | PostgreSQL: Schema enforcement | MongoDB: Schema flexibility

### 3. ⚖️ The Verdicts
**Scenario A (The 'Move Fast' Team):** Which wins? MongoDB wins. Why? Rapid prototyping with flexible schema.
**Scenario B (The 'Scale' Team):** Which wins? PostgreSQL wins. Why? Better consistency guarantees at scale.
**Scenario C (The 'Budget' Team):** Which wins? PostgreSQL wins. Why? No licensing costs for advanced features.

### 4. ⚠️ The "Hidden Tax"
If you choose MongoDB, be prepared to pay the tax of eventual consistency debugging in 1 year.

### 5. 🏁 The Tie-Breaker
How important is strict data consistency for your use case?
      `.trim();

      openaiModule.callOpenAI.mockResolvedValue(validLLMResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'PostgreSQL', tech2: 'MongoDB' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.matchup.technology1).toBe('PostgreSQL');
      expect(responseData.data.matchup.technology2).toBe('MongoDB');
      expect(responseData.data.hiddenTax.technology).toBe('MongoDB');
      expect(responseData.data.hiddenTax.timeframe).toBe('1 year');
    });

    it('should trim whitespace from technology inputs', async () => {
      // Arrange: Test with whitespace in inputs
      const validLLMResponse = `
### 1. 🥊 The Matchup
Docker vs Kubernetes comparison

### 2. 📊 The Tale of the Tape
Speed | Docker: Fast container startup | Kubernetes: Orchestration overhead
Cost | Docker: Free for development | Kubernetes: Infrastructure complexity
Developer Experience | Docker: Simple containerization | Kubernetes: Steep learning curve
Scalability | Docker: Single host limitation | Kubernetes: Multi-node orchestration
Maintainability | Docker: Container lifecycle | Kubernetes: Declarative management

### 3. ⚖️ The Verdicts
**Scenario A (The 'Move Fast' Team):** Which wins? Docker wins. Why? Immediate containerization benefits.
**Scenario B (The 'Scale' Team):** Which wins? Kubernetes wins. Why? Production-grade orchestration.
**Scenario C (The 'Budget' Team):** Which wins? Docker wins. Why? Lower operational overhead.

### 4. ⚠️ The "Hidden Tax"
If you choose Kubernetes, be prepared to pay the tax of operational complexity in 3 months.

### 5. 🏁 The Tie-Breaker
Do you need to manage containers across multiple hosts?
      `.trim();

      openaiModule.callOpenAI.mockResolvedValue(validLLMResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ 
          tech1: '  Docker  ', 
          tech2: '\tKubernetes\n' 
        })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert: Inputs should be trimmed
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.matchup.technology1).toBe('Docker');
      expect(responseData.data.matchup.technology2).toBe('Kubernetes');
    });
  });

  describe('Error handling for invalid inputs', () => {
    it('should reject request with missing tech1', async () => {
      // Arrange: Request missing tech1
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('MISSING_TECH1');
      expect(responseData.error.message).toContain('tech1 field is required');
      expect(responseData.error.timestamp).toBeDefined();
    });

    it('should reject request with missing tech2', async () => {
      // Arrange: Request missing tech2
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('MISSING_TECH2');
      expect(responseData.error.message).toContain('tech2 field is required');
      expect(responseData.error.timestamp).toBeDefined();
    });

    it('should reject request with empty tech1', async () => {
      // Arrange: Request with empty tech1
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: '', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('MISSING_TECH1');
      expect(responseData.error.message).toContain('tech1 field is required');
    });

    it('should reject request with empty tech2', async () => {
      // Arrange: Request with empty tech2
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: '' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('MISSING_TECH2');
      expect(responseData.error.message).toContain('tech2 field is required');
    });

    it('should reject request with non-string tech1', async () => {
      // Arrange: Request with non-string tech1
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 123, tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('MISSING_TECH1');
      expect(responseData.error.message).toContain('must be a string');
    });

    it('should reject request with non-string tech2', async () => {
      // Arrange: Request with non-string tech2
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: null })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('MISSING_TECH2');
      expect(responseData.error.message).toContain('must be a string');
    });

    it('should reject request with invalid JSON body', async () => {
      // Arrange: Request that throws JSON parse error
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INVALID_JSON');
      expect(responseData.error.message).toContain('valid JSON');
      expect(responseData.error.details).toContain('Unexpected token');
    });

    it('should reject request with non-object body', async () => {
      // Arrange: Request with non-object body
      const mockRequest = {
        json: jest.fn().mockResolvedValue('not an object')
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INVALID_REQUEST_BODY');
      expect(responseData.error.message).toContain('valid JSON object');
    });

    it('should reject request with null body', async () => {
      // Arrange: Request with null body
      const mockRequest = {
        json: jest.fn().mockResolvedValue(null)
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INVALID_REQUEST_BODY');
      expect(responseData.error.message).toContain('valid JSON object');
    });
  });

  describe('OpenAI API failure scenarios', () => {
    it('should handle OpenAI rate limit errors', async () => {
      // Arrange: Mock OpenAI rate limit error
      const rateLimitError = new openaiModule.OpenAIError(
        'Rate limit exceeded',
        'rate_limit_exceeded',
        { status: 429 }
      );
      openaiModule.callOpenAI.mockRejectedValue(rateLimitError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('rate_limit_exceeded');
      expect(responseData.error.message).toContain('Rate limit exceeded');
      expect(responseData.error.details).toContain('429');
    });

    it('should handle OpenAI authentication errors', async () => {
      // Arrange: Mock OpenAI auth error
      const authError = new openaiModule.OpenAIError(
        'Invalid API key',
        'invalid_api_key',
        { status: 401 }
      );
      openaiModule.callOpenAI.mockRejectedValue(authError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('invalid_api_key');
      expect(responseData.error.message).toContain('Invalid API key');
    });

    it('should handle OpenAI model overload errors', async () => {
      // Arrange: Mock OpenAI model overload error
      const overloadError = new openaiModule.OpenAIError(
        'Model is currently overloaded',
        'model_overloaded',
        { status: 503 }
      );
      openaiModule.callOpenAI.mockRejectedValue(overloadError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('model_overloaded');
      expect(responseData.error.message).toContain('Model is currently overloaded');
    });

    it('should handle OpenAI timeout errors', async () => {
      // Arrange: Mock OpenAI timeout error
      const timeoutError = new openaiModule.OpenAIError(
        'Request timed out',
        'timeout',
        { status: 408 }
      );
      openaiModule.callOpenAI.mockRejectedValue(timeoutError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('timeout');
      expect(responseData.error.message).toContain('Request timed out');
    });

    it('should handle generic OpenAI API errors', async () => {
      // Arrange: Mock generic OpenAI error
      const genericError = new openaiModule.OpenAIError(
        'Something went wrong',
        'api_error',
        { status: 500, type: 'server_error' }
      );
      openaiModule.callOpenAI.mockRejectedValue(genericError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('api_error');
      expect(responseData.error.message).toContain('Something went wrong');
      expect(responseData.error.details).toContain('server_error');
    });

    it('should handle non-OpenAI errors gracefully', async () => {
      // Arrange: Mock generic JavaScript error
      const genericError = new Error('Network connection failed');
      openaiModule.callOpenAI.mockRejectedValue(genericError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('INTERNAL_ERROR');
      expect(responseData.error.message).toBe('An unexpected error occurred');
      expect(responseData.error.details).toContain('Network connection failed');
    });

    it('should handle malformed LLM responses', async () => {
      // Arrange: Mock malformed LLM response
      const malformedResponse = 'This is not a properly formatted response';
      openaiModule.callOpenAI.mockResolvedValue(malformedResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('PARSING_ERROR');
      expect(responseData.error.message).toContain('parse');
    });

    it('should handle LLM responses missing sections', async () => {
      // Arrange: Mock LLM response missing required sections
      const incompleteResponse = `
### 1. 🥊 The Matchup
React vs Vue comparison

### 2. 📊 The Tale of the Tape
Speed | React: Fast | Vue: Also fast
      `.trim();

      openaiModule.callOpenAI.mockResolvedValue(incompleteResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error.code).toBe('PARSING_ERROR');
      expect(responseData.error.message).toContain('parse');
    });
  });

  describe('Response structure validation', () => {
    it('should include proper timestamps in all error responses', async () => {
      // Arrange: Mock request that will fail validation
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: '', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert
      expect(responseData.error.timestamp).toBeDefined();
      expect(() => new Date(responseData.error.timestamp)).not.toThrow();
      expect(new Date(responseData.error.timestamp).toISOString()).toBe(responseData.error.timestamp);
    });

    it('should maintain consistent error response structure', async () => {
      // Arrange: Mock OpenAI error
      const openaiError = new openaiModule.OpenAIError('Test error', 'TEST_CODE');
      openaiModule.callOpenAI.mockRejectedValue(openaiError);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert: Consistent error structure
      expect(responseData).toHaveProperty('success', false);
      expect(responseData).toHaveProperty('error');
      expect(responseData.error).toHaveProperty('code');
      expect(responseData.error).toHaveProperty('message');
      expect(responseData.error).toHaveProperty('timestamp');
      expect(responseData).not.toHaveProperty('data');
    });

    it('should maintain consistent success response structure', async () => {
      // Arrange: Mock successful response
      const validLLMResponse = `
### 1. 🥊 The Matchup
React vs Vue

### 2. 📊 The Tale of the Tape
Speed | React: Fast | Vue: Fast
Cost | React: Free | Vue: Free
Developer Experience | React: Good | Vue: Good
Scalability | React: Good | Vue: Good
Maintainability | React: Good | Vue: Good

### 3. ⚖️ The Verdicts
**Scenario A (The 'Move Fast' Team):** Which wins? React wins. Why? Popular.
**Scenario B (The 'Scale' Team):** Which wins? React wins. Why? Mature.
**Scenario C (The 'Budget' Team):** Which wins? Vue wins. Why? Simple.

### 4. ⚠️ The "Hidden Tax"
If you choose React, be prepared to pay the tax of complexity in 6 months.

### 5. 🏁 The Tie-Breaker
What matters more: ecosystem or simplicity?
      `.trim();

      openaiModule.callOpenAI.mockResolvedValue(validLLMResponse);

      const mockRequest = {
        json: jest.fn().mockResolvedValue({ tech1: 'React', tech2: 'Vue' })
      };

      // Act
      const response = await POST(mockRequest);
      const responseData = response.data;

      // Assert: Consistent success structure
      expect(responseData).toHaveProperty('success', true);
      expect(responseData).toHaveProperty('data');
      expect(responseData).not.toHaveProperty('error');
      expect(responseData.data).toHaveProperty('matchup');
      expect(responseData.data).toHaveProperty('taleOfTheTape');
      expect(responseData.data).toHaveProperty('scenarios');
      expect(responseData.data).toHaveProperty('hiddenTax');
      expect(responseData.data).toHaveProperty('tieBreaker');
    });
  });
});

// Feature: tech-referee, Property 15: Response validation
// **Validates: Requirements 5.3**

describe('Response Validation Property Tests', () => {
  let POST: any;
  let openaiModule: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import after mocks are set up
    const routeModule = await import('./route');
    POST = routeModule.POST;
    
    openaiModule = await import('@/lib/openai');
    
    // Default to successful validation
    openaiModule.validateOpenAIConfig.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Property 15: Response validation
  // For any LLM response received, the system should validate that it contains the required structured data before presenting to users
  it('should validate complete LLM responses contain all required sections', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        matchupContent: fc.string({ minLength: 10, maxLength: 200 }),
        taleContent: fc.string({ minLength: 50, maxLength: 500 }),
        verdictsContent: fc.string({ minLength: 100, maxLength: 800 }),
        hiddenTaxContent: fc.string({ minLength: 20, maxLength: 200 }),
        tieBreakerContent: fc.string({ minLength: 10, maxLength: 100 })
      }),
      async ({ tech1, tech2, matchupContent, taleContent, verdictsContent, hiddenTaxContent, tieBreakerContent }) => {
        // Arrange: Create a properly structured LLM response
        const validLLMResponse = `
### 1. 🥊 The Matchup
${matchupContent}

### 2. 📊 The Tale of the Tape
Speed | ${tech1}: Fast startup | ${tech2}: Optimized runtime
Cost | ${tech1}: $0 start cost | ${tech2}: Enterprise pricing
Developer Experience | ${tech1}: Simple setup | ${tech2}: Complex config
Scalability | ${tech1}: Limited scale | ${tech2}: Infinite scale
Maintainability | ${tech1}: Easy updates | ${tech2}: Complex maintenance

### 3. ⚖️ The Verdicts
**Scenario A (The 'Move Fast' Team):** Which wins? ${tech1} wins. Why? ${verdictsContent.substring(0, 100)}
**Scenario B (The 'Scale' Team):** Which wins? ${tech2} wins. Why? ${verdictsContent.substring(100, 200)}
**Scenario C (The 'Budget' Team):** Which wins? ${tech1} wins. Why? ${verdictsContent.substring(200, 300)}

### 4. ⚠️ The "Hidden Tax"
If you choose ${tech1}, be prepared to pay the tax of ${hiddenTaxContent} in 6 months.

### 5. 🏁 The Tie-Breaker
${tieBreakerContent}
        `.trim();

        // Mock successful OpenAI response
        openaiModule.callOpenAI.mockResolvedValue(validLLMResponse);

        // Create mock request
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ tech1, tech2 })
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Valid response structure properties
        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.data).toBeDefined();
        
        // Validate all required sections are present and structured
        const analysis = responseData.data;
        expect(analysis.matchup).toBeDefined();
        expect(analysis.matchup.technology1).toBe(tech1);
        expect(analysis.matchup.technology2).toBe(tech2);
        
        expect(analysis.taleOfTheTape).toBeDefined();
        expect(analysis.taleOfTheTape.speed).toBeDefined();
        expect(analysis.taleOfTheTape.cost).toBeDefined();
        expect(analysis.taleOfTheTape.developerExperience).toBeDefined();
        expect(analysis.taleOfTheTape.scalability).toBeDefined();
        expect(analysis.taleOfTheTape.maintainability).toBeDefined();
        
        expect(analysis.scenarios).toBeDefined();
        expect(Array.isArray(analysis.scenarios)).toBe(true);
        expect(analysis.scenarios.length).toBe(3);
        
        expect(analysis.hiddenTax).toBeDefined();
        expect(analysis.hiddenTax.technology).toBeTruthy();
        expect(analysis.hiddenTax.warning).toBeTruthy();
        
        expect(analysis.tieBreaker).toBeDefined();
        expect(typeof analysis.tieBreaker).toBe('string');
        expect(analysis.tieBreaker.length).toBeGreaterThan(0);
      }
    ), { numRuns: 100 });
  });

  it('should reject LLM responses missing required sections', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        missingSection: fc.constantFrom('matchup', 'taleOfTheTape', 'verdicts', 'hiddenTax', 'tieBreaker')
      }),
      async ({ tech1, tech2, missingSection }) => {
        // Arrange: Create an incomplete LLM response missing one section
        const sections = {
          matchup: '### 1. 🥊 The Matchup\nComparing technologies',
          taleOfTheTape: `### 2. 📊 The Tale of the Tape\nSpeed | ${tech1}: Fast | ${tech2}: Slow\nCost | ${tech1}: Low | ${tech2}: High\nDeveloper Experience | ${tech1}: Good | ${tech2}: Bad\nScalability | ${tech1}: Limited | ${tech2}: Unlimited\nMaintainability | ${tech1}: Easy | ${tech2}: Hard`,
          verdicts: '### 3. ⚖️ The Verdicts\n**Scenario A (The \'Move Fast\' Team):** Which wins? Tech1 wins. Why? Faster.\n**Scenario B (The \'Scale\' Team):** Which wins? Tech2 wins. Why? Scales better.\n**Scenario C (The \'Budget\' Team):** Which wins? Tech1 wins. Why? Cheaper.',
          hiddenTax: `### 4. ⚠️ The "Hidden Tax"\nIf you choose ${tech1}, be prepared to pay the tax of complexity in 6 months.`,
          tieBreaker: '### 5. 🏁 The Tie-Breaker\nDo you need immediate results?'
        };

        // Remove the specified section
        delete sections[missingSection as keyof typeof sections];
        
        const incompleteLLMResponse = Object.values(sections).join('\n\n');

        // Mock OpenAI to return incomplete response
        openaiModule.callOpenAI.mockResolvedValue(incompleteLLMResponse);

        // Create mock request
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ tech1, tech2 })
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Validation error properties
        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.error.code).toBe('PARSING_ERROR');
        expect(responseData.error.message).toContain('parse');
        expect(responseData.error.timestamp).toBeDefined();
        
        // Error should indicate which section is missing
        expect(responseData.error.message.toLowerCase()).toMatch(/missing|parse|structure/);
      }
    ), { numRuns: 50 });
  });

  it('should validate Tale of the Tape contains all required dimensions', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        missingDimension: fc.constantFrom('Speed', 'Cost', 'Developer Experience', 'Scalability', 'Maintainability')
      }),
      async ({ tech1, tech2, missingDimension }) => {
        // Arrange: Create Tale of the Tape missing one dimension
        const dimensions = ['Speed', 'Cost', 'Developer Experience', 'Scalability', 'Maintainability'];
        const availableDimensions = dimensions.filter(d => d !== missingDimension);
        
        const taleContent = availableDimensions
          .map(dim => `${dim} | ${tech1}: Good | ${tech2}: Bad`)
          .join('\n');

        const incompleteLLMResponse = `
### 1. 🥊 The Matchup
Comparing technologies

### 2. 📊 The Tale of the Tape
${taleContent}

### 3. ⚖️ The Verdicts
**Scenario A (The 'Move Fast' Team):** Which wins? ${tech1} wins. Why? Faster.
**Scenario B (The 'Scale' Team):** Which wins? ${tech2} wins. Why? Scales better.
**Scenario C (The 'Budget' Team):** Which wins? ${tech1} wins. Why? Cheaper.

### 4. ⚠️ The "Hidden Tax"
If you choose ${tech1}, be prepared to pay the tax of complexity in 6 months.

### 5. 🏁 The Tie-Breaker
Do you need immediate results?
        `.trim();

        // Mock OpenAI to return incomplete response
        openaiModule.callOpenAI.mockResolvedValue(incompleteLLMResponse);

        // Create mock request
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ tech1, tech2 })
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Validation should catch missing dimension
        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.error.code).toBe('PARSING_ERROR');
        expect(responseData.error.message).toContain('Tale of the Tape');
      }
    ), { numRuns: 50 });
  });

  it('should validate scenarios contain all three required team types', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        missingScenario: fc.constantFrom('Move Fast', 'Scale', 'Budget')
      }),
      async ({ tech1, tech2, missingScenario }) => {
        // Arrange: Create verdicts missing one scenario
        const scenarios = ['Move Fast', 'Scale', 'Budget'];
        const availableScenarios = scenarios.filter(s => s !== missingScenario);
        
        const verdictsContent = availableScenarios
          .map((scenario, index) => `**Scenario ${String.fromCharCode(65 + index)} (The '${scenario}' Team):** Which wins? ${tech1} wins. Why? It's better.`)
          .join('\n');

        const incompleteLLMResponse = `
### 1. 🥊 The Matchup
Comparing technologies

### 2. 📊 The Tale of the Tape
Speed | ${tech1}: Fast | ${tech2}: Slow
Cost | ${tech1}: Low | ${tech2}: High
Developer Experience | ${tech1}: Good | ${tech2}: Bad
Scalability | ${tech1}: Limited | ${tech2}: Unlimited
Maintainability | ${tech1}: Easy | ${tech2}: Hard

### 3. ⚖️ The Verdicts
${verdictsContent}

### 4. ⚠️ The "Hidden Tax"
If you choose ${tech1}, be prepared to pay the tax of complexity in 6 months.

### 5. 🏁 The Tie-Breaker
Do you need immediate results?
        `.trim();

        // Mock OpenAI to return incomplete response
        openaiModule.callOpenAI.mockResolvedValue(incompleteLLMResponse);

        // Create mock request
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ tech1, tech2 })
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Validation should catch missing scenario
        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.error.code).toBe('PARSING_ERROR');
        expect(responseData.error.message).toContain('Verdicts');
      }
    ), { numRuns: 50 });
  });

  it('should validate Hidden Tax follows required format pattern', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        invalidHiddenTax: fc.oneof(
          fc.constant('This is not the right format'),
          fc.constant('Choose wisely'),
          fc.constant('If you choose something, something bad happens')
        )
      }),
      async ({ tech1, tech2, invalidHiddenTax }) => {
        // Arrange: Create response with invalid Hidden Tax format
        const invalidLLMResponse = `
### 1. 🥊 The Matchup
Comparing technologies

### 2. 📊 The Tale of the Tape
Speed | ${tech1}: Fast | ${tech2}: Slow
Cost | ${tech1}: Low | ${tech2}: High
Developer Experience | ${tech1}: Good | ${tech2}: Bad
Scalability | ${tech1}: Limited | ${tech2}: Unlimited
Maintainability | ${tech1}: Easy | ${tech2}: Hard

### 3. ⚖️ The Verdicts
**Scenario A (The 'Move Fast' Team):** Which wins? ${tech1} wins. Why? Faster.
**Scenario B (The 'Scale' Team):** Which wins? ${tech2} wins. Why? Scales better.
**Scenario C (The 'Budget' Team):** Which wins? ${tech1} wins. Why? Cheaper.

### 4. ⚠️ The "Hidden Tax"
${invalidHiddenTax}

### 5. 🏁 The Tie-Breaker
Do you need immediate results?
        `.trim();

        // Mock OpenAI to return response with invalid Hidden Tax
        openaiModule.callOpenAI.mockResolvedValue(invalidLLMResponse);

        // Create mock request
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ tech1, tech2 })
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Validation should catch invalid Hidden Tax format
        expect(response.status).toBe(500);
        expect(responseData.success).toBe(false);
        expect(responseData.error).toBeDefined();
        expect(responseData.error.code).toBe('PARSING_ERROR');
        expect(responseData.error.message).toContain('Hidden Tax');
      }
    ), { numRuns: 50 });
  });

  it('should validate response structure consistency across different valid inputs', async () => {
    await fc.assert(fc.asyncProperty(
      fc.record({
        tech1: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        tech2: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        winner1: fc.oneof(fc.constant('tech1'), fc.constant('tech2')),
        winner2: fc.oneof(fc.constant('tech1'), fc.constant('tech2')),
        winner3: fc.oneof(fc.constant('tech1'), fc.constant('tech2')),
        taxTech: fc.oneof(fc.constant('tech1'), fc.constant('tech2')),
        taxWarning: fc.string({ minLength: 10, maxLength: 100 }),
        timeframe: fc.constantFrom('6 months', '1 year', '2 years', '3 months')
      }),
      async ({ tech1, tech2, winner1, winner2, winner3, taxTech, taxWarning, timeframe }) => {
        // Arrange: Create a valid but varied LLM response
        const winnerTech1 = winner1 === 'tech1' ? tech1 : tech2;
        const winnerTech2 = winner2 === 'tech1' ? tech1 : tech2;
        const winnerTech3 = winner3 === 'tech1' ? tech1 : tech2;
        const taxTechnology = taxTech === 'tech1' ? tech1 : tech2;

        const validLLMResponse = `
### 1. 🥊 The Matchup
Comparing ${tech1} vs ${tech2} for your next project.

### 2. 📊 The Tale of the Tape
Speed | ${tech1}: Lightning fast startup | ${tech2}: Optimized for performance
Cost | ${tech1}: Free tier available | ${tech2}: Enterprise pricing model
Developer Experience | ${tech1}: Minimal configuration | ${tech2}: Extensive tooling
Scalability | ${tech1}: Horizontal scaling | ${tech2}: Vertical optimization
Maintainability | ${tech1}: Simple architecture | ${tech2}: Complex but powerful

### 3. ⚖️ The Verdicts
**Scenario A (The 'Move Fast' Team):** Which wins? ${winnerTech1} wins. Why? Speed is critical for rapid development.
**Scenario B (The 'Scale' Team):** Which wins? ${winnerTech2} wins. Why? Better performance at scale.
**Scenario C (The 'Budget' Team):** Which wins? ${winnerTech3} wins. Why? Lower total cost of ownership.

### 4. ⚠️ The "Hidden Tax"
If you choose ${taxTechnology}, be prepared to pay the tax of ${taxWarning} in ${timeframe}.

### 5. 🏁 The Tie-Breaker
What matters more: development speed or long-term maintainability?
        `.trim();

        // Mock successful OpenAI response
        openaiModule.callOpenAI.mockResolvedValue(validLLMResponse);

        // Create mock request
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ tech1, tech2 })
        };

        // Act: Call the API
        const response = await POST(mockRequest);
        const responseData = response.data;

        // Assert: Consistent structure validation properties
        expect(response.status).toBe(200);
        expect(responseData.success).toBe(true);
        expect(responseData.data).toBeDefined();
        
        const analysis = responseData.data;
        
        // Validate consistent structure regardless of content variation
        expect(analysis).toHaveProperty('matchup');
        expect(analysis).toHaveProperty('taleOfTheTape');
        expect(analysis).toHaveProperty('scenarios');
        expect(analysis).toHaveProperty('hiddenTax');
        expect(analysis).toHaveProperty('tieBreaker');
        
        // Validate data types are consistent
        expect(typeof analysis.matchup.technology1).toBe('string');
        expect(typeof analysis.matchup.technology2).toBe('string');
        expect(Array.isArray(analysis.scenarios)).toBe(true);
        expect(analysis.scenarios.length).toBe(3);
        expect(typeof analysis.tieBreaker).toBe('string');
        
        // Validate all scenarios have required properties
        analysis.scenarios.forEach((scenario: any) => {
          expect(scenario).toHaveProperty('name');
          expect(scenario).toHaveProperty('winner');
          expect(scenario).toHaveProperty('reasoning');
          expect(scenario).toHaveProperty('context');
          expect(['Move Fast Team', 'Scale Team', 'Budget Team']).toContain(scenario.name);
        });
      }
    ), { numRuns: 100 });
  });
});
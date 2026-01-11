// Core TypeScript interfaces and types for Tech Referee

// ============================================================================
// Core Analysis Types
// ============================================================================

/**
 * Main analysis result containing all comparison data
 */
export interface RefereeAnalysis {
  matchup: {
    technology1: string;
    technology2: string;
  };
  taleOfTheTape: ComparisonMatrix;
  scenarios: ScenarioVerdict[];
  hiddenTax: HiddenTax;
  tieBreaker: string;
}

/**
 * Structured comparison across key dimensions
 */
export interface ComparisonMatrix {
  speed: {
    tech1: string;
    tech2: string;
  };
  cost: {
    tech1: string;
    tech2: string;
  };
  developerExperience: {
    tech1: string;
    tech2: string;
  };
  scalability: {
    tech1: string;
    tech2: string;
  };
  maintainability: {
    tech1: string;
    tech2: string;
  };
}

/**
 * Scenario-based verdict with context and reasoning
 */
export interface ScenarioVerdict {
  name: 'Move Fast Team' | 'Scale Team' | 'Budget Team';
  winner: string;
  reasoning: string;
  context: string;
}

/**
 * Hidden cost or downside warning
 */
export interface HiddenTax {
  technology: string;
  warning: string;
  timeframe: string;
  impact: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request payload for referee analysis
 */
export interface RefereeRequest {
  tech1: string;
  tech2: string;
}

/**
 * API response wrapper for referee analysis
 */
export interface RefereeResponse {
  success: boolean;
  data?: RefereeAnalysis;
  error?: ApiError;
}

/**
 * Standardized API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
}

// ============================================================================
// Input Validation Types
// ============================================================================

/**
 * Validation result for user inputs
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Technology input validation constraints
 */
export interface TechnologyInput {
  name: string;
  aliases?: string[];
  category?: string;
}

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Application error categories
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  LLM_ERROR = 'LLM_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Structured application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public code: string,
    public details: any = null,
    public timestamp: Date = new Date(),
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
  errorInfo?: any;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for MatchupInput component
 */
export interface MatchupInputProps {
  onSubmit: (tech1: string, tech2: string) => void;
  loading?: boolean;
  disabled?: boolean;
  initialValues?: {
    tech1?: string;
    tech2?: string;
  };
}

/**
 * Props for VerdictDisplay component
 */
export interface VerdictDisplayProps {
  analysis: RefereeAnalysis;
  loading?: boolean;
}

/**
 * Props for TaleOfTheTape component
 */
export interface TaleOfTheTapeProps {
  comparison: ComparisonMatrix;
  technology1: string;
  technology2: string;
}

/**
 * Props for ScenarioCards component
 */
export interface ScenarioCardsProps {
  scenarios: ScenarioVerdict[];
}

/**
 * Props for HiddenTaxWarning component
 */
export interface HiddenTaxWarningProps {
  warning: HiddenTax;
}

/**
 * Props for LoadingState component
 */
export interface LoadingStateProps {
  message?: string;
  progress?: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

/**
 * Generic async operation result
 */
export type AsyncResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: AppError;
};

/**
 * Technology name normalization mapping
 */
export interface TechnologyAlias {
  canonical: string;
  aliases: string[];
  category: string;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for RefereeAnalysis
 */
export function isRefereeAnalysis(obj: any): obj is RefereeAnalysis {
  return !!(
    obj &&
    typeof obj === 'object' &&
    obj.matchup &&
    typeof obj.matchup.technology1 === 'string' &&
    typeof obj.matchup.technology2 === 'string' &&
    obj.taleOfTheTape &&
    Array.isArray(obj.scenarios) &&
    obj.scenarios.length === 3 &&
    obj.hiddenTax &&
    typeof obj.tieBreaker === 'string'
  );
}

/**
 * Type guard for ComparisonMatrix
 */
export function isComparisonMatrix(obj: any): obj is ComparisonMatrix {
  return !!(
    obj &&
    typeof obj === 'object' &&
    obj.speed &&
    obj.cost &&
    obj.developerExperience &&
    obj.scalability &&
    obj.maintainability &&
    typeof obj.speed.tech1 === 'string' &&
    typeof obj.speed.tech2 === 'string'
  );
}

/**
 * Type guard for ScenarioVerdict
 */
export function isScenarioVerdict(obj: any): obj is ScenarioVerdict {
  const validNames = ['Move Fast Team', 'Scale Team', 'Budget Team'];
  return !!(
    obj &&
    typeof obj === 'object' &&
    validNames.includes(obj.name) &&
    typeof obj.winner === 'string' &&
    typeof obj.reasoning === 'string' &&
    typeof obj.context === 'string'
  );
}

/**
 * Type guard for HiddenTax
 */
export function isHiddenTax(obj: any): obj is HiddenTax {
  return !!(
    obj &&
    typeof obj === 'object' &&
    typeof obj.technology === 'string' &&
    typeof obj.warning === 'string' &&
    typeof obj.timeframe === 'string' &&
    typeof obj.impact === 'string'
  );
}
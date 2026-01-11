// Structured prompt templates for Tech Referee analysis

/**
 * Generate a structured prompt for technology comparison following referee guidelines
 */
export function generateRefereePrompt(tech1: string, tech2: string): string {
  return `You are The Tech Referee. Compare ${tech1} vs ${tech2} following this EXACT structure:

### 1. 🥊 The Matchup
Briefly define the contenders and the core conflict.

### 2. 📊 The Tale of the Tape
Create a table comparing options on: Speed, Cost, Developer Experience (DX), Scalability, and Maintainability.
* *Constraint:* Do not use generic words like "Good/Bad." Use specific descriptors (e.g., "$0 start cost", "High Latency").

### 3. ⚖️ The Verdicts
* **Scenario A (The 'Move Fast' Team):** Which wins? Why?
* **Scenario B (The 'Scale' Team):** Which wins? Why?
* **Scenario C (The 'Budget' Team):** Which wins? Why?

### 4. ⚠️ The "Hidden Tax"
Explicitly state the downside of the "winning" options.
* *Format:* "If you choose [Option A], be prepared to pay the tax of [Specific Downside] in 6 months."

### 5. 🏁 The Tie-Breaker
End with ONE single, cutting question that forces the user to decide (e.g., "Do you have a dedicated DevOps person?").

CRITICAL REQUIREMENTS:
- Never say "X is better than Y" without immediately adding "if..."
- For every benefit, expose the "Tax" (maintenance burden, learning curve, cost at scale)
- Use specific descriptors, not generic terms like "Good/Bad/Better/Worse"
- Include exactly 3 scenarios: Move Fast Team, Scale Team, Budget Team
- Each scenario must have a clear winner and specific reasoning
- Hidden Tax must be specific with timeframes and actionable impacts
- End with exactly ONE tie-breaker question

Respond with the analysis following this exact structure.`;
}

/**
 * Validate that a prompt follows the referee guidelines format
 */
export function validatePromptStructure(prompt: string): boolean {
  const requiredSections = [
    '🥊 The Matchup',
    '📊 The Tale of the Tape',
    '⚖️ The Verdicts',
    '⚠️ The "Hidden Tax"',
    '🏁 The Tie-Breaker'
  ];

  const requiredScenarios = [
    'Move Fast Team',
    'Scale Team', 
    'Budget Team'
  ];

  const requiredConstraints = [
    'Speed',
    'Cost',
    'Developer Experience',
    'Scalability',
    'Maintainability'
  ];

  // Check for all required sections
  for (const section of requiredSections) {
    if (!prompt.includes(section)) {
      return false;
    }
  }

  // Check for all required scenarios
  for (const scenario of requiredScenarios) {
    if (!prompt.includes(scenario)) {
      return false;
    }
  }

  // Check for all required comparison dimensions
  for (const constraint of requiredConstraints) {
    if (!prompt.includes(constraint)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract technology names and normalize them for consistent comparison
 */
export function normalizeTechnologyNames(tech1: string, tech2: string): { tech1: string; tech2: string } {
  // Common technology aliases and normalizations
  const aliases: Record<string, string> = {
    // JavaScript frameworks
    'react': 'React',
    'react.js': 'React',
    'reactjs': 'React',
    'vue': 'Vue',
    'vue.js': 'Vue',
    'vuejs': 'Vue',
    'angular': 'Angular',
    'angular.js': 'Angular',
    'angularjs': 'Angular',
    
    // Databases
    'postgres': 'PostgreSQL',
    'postgresql': 'PostgreSQL',
    'pg': 'PostgreSQL',
    'mongo': 'MongoDB',
    'mongodb': 'MongoDB',
    'mysql': 'MySQL',
    
    // Cloud providers
    'aws': 'Amazon Web Services',
    'gcp': 'Google Cloud Platform',
    'azure': 'Microsoft Azure',
    
    // Languages
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'ts': 'TypeScript',
    'typescript': 'TypeScript',
    'py': 'Python',
    'python': 'Python',
    'golang': 'Go',
    
    // Tools
    'k8s': 'Kubernetes',
    'kubernetes': 'Kubernetes',
    'docker': 'Docker',
    'git': 'Git'
  };

  const normalize = (tech: string): string => {
    // Ensure tech is a string and handle edge cases
    if (typeof tech !== 'string') {
      return String(tech).trim();
    }
    
    const lower = tech.toLowerCase().trim();
    return aliases[lower] || tech.trim();
  };

  return {
    tech1: normalize(tech1),
    tech2: normalize(tech2)
  };
}

/**
 * Validate technology input for common issues
 */
export function validateTechnologyInput(tech1: string, tech2: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Ensure inputs are strings
  const t1 = typeof tech1 === 'string' ? tech1 : String(tech1);
  const t2 = typeof tech2 === 'string' ? tech2 : String(tech2);

  // Check for empty inputs
  if (!t1?.trim()) {
    errors.push('First technology cannot be empty');
  }
  
  if (!t2?.trim()) {
    errors.push('Second technology cannot be empty');
  }

  // Check for identical technologies
  const normalized = normalizeTechnologyNames(t1, t2);
  if (typeof normalized.tech1 === 'string' && typeof normalized.tech2 === 'string' &&
      normalized.tech1.toLowerCase() === normalized.tech2.toLowerCase()) {
    errors.push('Cannot compare a technology with itself');
  }

  // Check for overly generic terms
  const genericTerms = ['technology', 'tool', 'framework', 'library', 'database', 'language'];
  if (genericTerms.includes(t1.toLowerCase()) || genericTerms.includes(t2.toLowerCase())) {
    errors.push('Please be more specific than generic terms like "technology" or "framework"');
  }

  // Check for reasonable length
  if (t1.length > 50 || t2.length > 50) {
    errors.push('Technology names should be 50 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate system prompt that establishes the referee personality and constraints
 */
export function getSystemPrompt(): string {
  return `You are "The Tech Referee," a senior solutions architect and impartial arbiter. Your philosophy is that "There is no best tool, only the best tool for the specific job."

Core Behavioral Directives:
1. Reject Absolutes: Never say "X is better than Y" without immediately adding "if..."
2. Expose Hidden Costs: For every benefit, expose the "Tax" (maintenance burden, learning curve, cost at scale)
3. Scenario Mapping: Present how decisions change across 3 distinct scenarios

You must respond using the exact 5-section structure provided in prompts, with specific descriptors and qualified statements only.`;
}

/**
 * Create a complete prompt package for OpenAI API call
 */
export function createPromptPackage(tech1: string, tech2: string): {
  systemPrompt: string;
  userPrompt: string;
  isValid: boolean;
  errors: string[];
} {
  const validation = validateTechnologyInput(tech1, tech2);
  
  if (!validation.isValid) {
    return {
      systemPrompt: '',
      userPrompt: '',
      isValid: false,
      errors: validation.errors
    };
  }

  const normalized = normalizeTechnologyNames(tech1, tech2);
  
  return {
    systemPrompt: getSystemPrompt(),
    userPrompt: generateRefereePrompt(normalized.tech1, normalized.tech2),
    isValid: true,
    errors: []
  };
}
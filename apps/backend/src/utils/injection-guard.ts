/**
 * Injection Guard – Detects and sanitizes prompt injection attempts
 * in user-provided text before it reaches the LLM.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+/i,
  /act\s+as\s+(if\s+you\s+are|a)\s+/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /```\s*system/i,
  /override\s+(all\s+)?safety/i,
  /bypass\s+(all\s+)?restrictions/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /DAN\s+mode/i,
  /\{\{.*?\}\}/,
  /<\/?script>/i,
];

const SUSPICIOUS_PATTERNS: RegExp[] = [
  /repeat\s+after\s+me/i,
  /say\s+exactly/i,
  /output\s+the\s+following/i,
  /translate\s+this\s+to\s+(english|code)/i,
  /what\s+are\s+your\s+(instructions|rules|system\s+prompt)/i,
  /reveal\s+your\s+(prompt|instructions)/i,
];

export interface InjectionCheckResult {
  is_safe: boolean;
  risk_level: 'none' | 'low' | 'medium' | 'high';
  flagged_patterns: string[];
  sanitized_text: string;
}

export function checkForInjection(text: string): InjectionCheckResult {
  const flaggedPatterns: string[] = [];
  let riskLevel: 'none' | 'low' | 'medium' | 'high' = 'none';

  for (const pattern of INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      flaggedPatterns.push(match[0]);
      riskLevel = 'high';
    }
  }

  if (riskLevel !== 'high') {
    for (const pattern of SUSPICIOUS_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        flaggedPatterns.push(match[0]);
        riskLevel = riskLevel === 'none' ? 'low' : 'medium';
      }
    }
  }

  const sanitized = sanitizeText(text);

  return {
    is_safe: riskLevel === 'none' || riskLevel === 'low',
    risk_level: riskLevel,
    flagged_patterns: flaggedPatterns,
    sanitized_text: sanitized,
  };
}

export function sanitizeText(text: string): string {
  let sanitized = text;

  sanitized = sanitized.replace(/<\/?script[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\|im_start\|>/gi, '');
  sanitized = sanitized.replace(/<\|im_end\|>/gi, '');
  sanitized = sanitized.replace(/\[INST\]/gi, '');
  sanitized = sanitized.replace(/\[\/INST\]/gi, '');
  sanitized = sanitized.replace(/\{\{.*?\}\}/g, '');

  return sanitized.trim();
}

export function enforceTextBoundary(text: string, maxLength: number = 50000): string {
  if (text.length > maxLength) {
    return text.slice(0, maxLength);
  }
  return text;
}

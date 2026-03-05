/**
 * Keyword Matcher – Extracts and matches keywords between resume and JD.
 * Part of the deterministic UniScore computation.
 */

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'i', 'me',
  'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours', 'he',
  'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them',
  'their', 'theirs', 'what', 'which', 'who', 'whom', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'because', 'about', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'up', 'down',
  'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
  'etc', 'also', 'well', 'back', 'even', 'still', 'new', 'old',
  'work', 'working', 'worked', 'able', 'including', 'experience',
  'required', 'preferred', 'must', 'strong', 'good', 'excellent',
]);

export interface KeywordMatchResult {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  jd_keywords: string[];
  resume_keywords: string[];
  match_percentage: number;
}

export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  
  // Extract multi-word technical terms first
  const multiWordPatterns = extractMultiWordTerms(normalized);
  
  // Extract single tokens
  const tokens = normalized
    .replace(/[^a-z0-9\s+#./-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1)
    .filter(t => !STOP_WORDS.has(t));

  // Deduplicate
  const all = new Set([...multiWordPatterns, ...tokens]);
  return Array.from(all);
}

function extractMultiWordTerms(text: string): string[] {
  const patterns: RegExp[] = [
    /machine\s*learning/g,
    /deep\s*learning/g,
    /natural\s*language\s*processing/g,
    /artificial\s*intelligence/g,
    /data\s*science/g,
    /data\s*engineering/g,
    /data\s*analysis/g,
    /project\s*management/g,
    /product\s*management/g,
    /software\s*engineering/g,
    /software\s*development/g,
    /full\s*stack/g,
    /front\s*end/g,
    /back\s*end/g,
    /dev\s*ops/g,
    /ci\s*\/?\s*cd/g,
    /cloud\s*computing/g,
    /web\s*development/g,
    /mobile\s*development/g,
    /user\s*experience/g,
    /user\s*interface/g,
    /quality\s*assurance/g,
    /test\s*driven/g,
    /version\s*control/g,
    /agile\s*methodology/g,
    /scrum\s*master/g,
    /rest\s*api/g,
    /micro\s*services/g,
    /object\s*oriented/g,
    /problem\s*solving/g,
    /team\s*lead/g,
    /cross\s*functional/g,
    /supply\s*chain/g,
    /business\s*intelligence/g,
    /power\s*bi/g,
    /time\s*series/g,
    /a\s*\/?\s*b\s*testing/g,
  ];

  const terms: string[] = [];
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        terms.push(m.replace(/\s+/g, ' ').trim());
      }
    }
  }
  return terms;
}

export function matchKeywords(resumeText: string, jdRequiredSkills: string[], jdPreferredSkills: string[]): KeywordMatchResult {
  const resumeKeywords = extractKeywords(resumeText);
  const resumeKeywordSet = new Set(resumeKeywords);
  const resumeTextLower = resumeText.toLowerCase();

  const allJdKeywords = [
    ...jdRequiredSkills.map(s => s.toLowerCase()),
    ...jdPreferredSkills.map(s => s.toLowerCase()),
  ];

  const uniqueJdKeywords = Array.from(new Set(allJdKeywords));

  const matched: string[] = [];
  const missing: string[] = [];

  // Weight required skills more heavily
  let weightedMatches = 0;
  let totalWeight = 0;

  for (const skill of jdRequiredSkills) {
    const skillLower = skill.toLowerCase();
    totalWeight += 2; // Double weight for required
    if (resumeKeywordSet.has(skillLower) || resumeTextLower.includes(skillLower)) {
      matched.push(skill);
      weightedMatches += 2;
    } else {
      // Check for partial matches / synonyms
      const partialMatch = checkPartialMatch(skillLower, resumeKeywords, resumeTextLower);
      if (partialMatch) {
        matched.push(skill);
        weightedMatches += 1.5; // Partial credit
      } else {
        missing.push(skill);
      }
    }
  }

  for (const skill of jdPreferredSkills) {
    const skillLower = skill.toLowerCase();
    totalWeight += 1;
    if (resumeKeywordSet.has(skillLower) || resumeTextLower.includes(skillLower)) {
      if (!matched.includes(skill)) matched.push(skill);
      weightedMatches += 1;
    } else {
      const partialMatch = checkPartialMatch(skillLower, resumeKeywords, resumeTextLower);
      if (partialMatch) {
        if (!matched.includes(skill)) matched.push(skill);
        weightedMatches += 0.75;
      } else {
        if (!missing.includes(skill)) missing.push(skill);
      }
    }
  }

  const matchPercentage = totalWeight > 0 ? (weightedMatches / totalWeight) * 100 : 0;
  const score = Math.min(100, Math.round(matchPercentage));

  return {
    score,
    matched_keywords: matched,
    missing_keywords: missing,
    jd_keywords: uniqueJdKeywords,
    resume_keywords: resumeKeywords,
    match_percentage: Math.round(matchPercentage * 100) / 100,
  };
}

function checkPartialMatch(skill: string, resumeKeywords: string[], resumeText: string): boolean {
  const skillParts = skill.split(/[\s/,-]+/).filter(p => p.length > 2 && !STOP_WORDS.has(p));

  if (skillParts.length === 0) return false;

  // If more than half of the skill parts are found, consider it a partial match
  let partsFound = 0;
  for (const part of skillParts) {
    if (resumeKeywords.some(k => k.includes(part) || part.includes(k)) || resumeText.includes(part)) {
      partsFound++;
    }
  }

  return partsFound >= Math.ceil(skillParts.length * 0.5);
}

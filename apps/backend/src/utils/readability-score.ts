/**
 * Readability Score – Computes readability metrics for resume text.
 * Uses deterministic formulas (Flesch-Kincaid inspired) adapted for resumes.
 */

export interface ReadabilityResult {
  score: number; // 0-100
  avg_sentence_length: number;
  avg_word_length: number;
  complex_word_ratio: number;
  passive_voice_ratio: number;
  bullet_point_quality: number;
  action_verb_ratio: number;
}

const ACTION_VERBS = new Set([
  'achieved', 'accomplished', 'accelerated', 'administered', 'analyzed',
  'architected', 'automated', 'boosted', 'built', 'championed',
  'collaborated', 'conceived', 'conducted', 'configured', 'consolidated',
  'constructed', 'coordinated', 'created', 'cultivated', 'customized',
  'decreased', 'delivered', 'deployed', 'designed', 'developed',
  'devised', 'directed', 'doubled', 'drove', 'earned',
  'eliminated', 'enabled', 'engineered', 'enhanced', 'established',
  'evaluated', 'exceeded', 'executed', 'expanded', 'expedited',
  'facilitated', 'formulated', 'founded', 'generated', 'grew',
  'guided', 'headed', 'identified', 'implemented', 'improved',
  'increased', 'influenced', 'initiated', 'innovated', 'integrated',
  'introduced', 'launched', 'led', 'leveraged', 'managed',
  'maximized', 'mentored', 'migrated', 'minimized', 'modernized',
  'negotiated', 'optimized', 'orchestrated', 'organized', 'outperformed',
  'overhauled', 'oversaw', 'partnered', 'pioneered', 'planned',
  'presented', 'prioritized', 'produced', 'propelled', 'proposed',
  'published', 'raised', 'recommended', 'redesigned', 'reduced',
  'refactored', 'refined', 'remodeled', 'reorganized', 'resolved',
  'restructured', 'revamped', 'reviewed', 'revitalized', 'saved',
  'scaled', 'secured', 'simplified', 'spearheaded', 'standardized',
  'streamlined', 'strengthened', 'supervised', 'surpassed', 'sustained',
  'trained', 'transformed', 'tripled', 'unified', 'upgraded',
  'utilized', 'validated', 'visualized', 'won',
]);

const PASSIVE_PATTERNS = [
  /\b(?:was|were|is|are|been|being)\s+\w+ed\b/gi,
  /\b(?:was|were|is|are|been|being)\s+\w+en\b/gi,
  /\bresponsible\s+for\b/gi,
  /\btasked\s+with\b/gi,
  /\bassigned\s+to\b/gi,
];

export function computeReadabilityScore(text: string): ReadabilityResult {
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const bullets = text.split('\n').filter(l => l.trim().match(/^[-•*]\s|^\d+\.\s/));

  if (words.length === 0) {
    return {
      score: 0,
      avg_sentence_length: 0,
      avg_word_length: 0,
      complex_word_ratio: 0,
      passive_voice_ratio: 0,
      bullet_point_quality: 0,
      action_verb_ratio: 0,
    };
  }

  // Average sentence length (ideal: 10-20 words for resumes)
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : words.length;
  const sentenceLengthScore = scoreSentenceLength(avgSentenceLength);

  // Average word length (ideal: 4-7 characters)
  const totalChars = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0);
  const avgWordLength = totalChars / words.length;
  const wordLengthScore = scoreWordLength(avgWordLength);

  // Complex word ratio (words with 3+ syllables)
  const complexWords = words.filter(w => estimateSyllables(w) >= 3).length;
  const complexWordRatio = complexWords / words.length;
  const complexityScore = scoreComplexity(complexWordRatio);

  // Passive voice detection
  let passiveCount = 0;
  for (const pattern of PASSIVE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) passiveCount += matches.length;
  }
  const passiveRatio = sentences.length > 0 ? passiveCount / sentences.length : 0;
  const passiveScore = scorePassiveVoice(passiveRatio);

  // Bullet point quality
  const bulletQuality = scoreBulletQuality(bullets);

  // Action verb usage
  const firstWords = bullets.map(b => {
    const cleaned = b.replace(/^[-•*]\s+|\d+\.\s+/, '').trim();
    return cleaned.split(/\s+/)[0]?.toLowerCase() || '';
  });
  const actionVerbCount = firstWords.filter(w => ACTION_VERBS.has(w)).length;
  const actionVerbRatio = bullets.length > 0 ? actionVerbCount / bullets.length : 0;
  const actionVerbScore = scoreActionVerbs(actionVerbRatio);

  // Weighted final score
  const score = Math.round(
    sentenceLengthScore * 0.15 +
    wordLengthScore * 0.10 +
    complexityScore * 0.15 +
    passiveScore * 0.20 +
    bulletQuality * 0.20 +
    actionVerbScore * 0.20
  );

  return {
    score: clamp(score, 0, 100),
    avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
    avg_word_length: Math.round(avgWordLength * 10) / 10,
    complex_word_ratio: Math.round(complexWordRatio * 1000) / 1000,
    passive_voice_ratio: Math.round(passiveRatio * 1000) / 1000,
    bullet_point_quality: bulletQuality,
    action_verb_ratio: Math.round(actionVerbRatio * 1000) / 1000,
  };
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.split(/\s+/).length > 2);
}

function estimateSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;

  let count = 0;
  const vowels = 'aeiouy';
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  if (w.endsWith('e') && !w.endsWith('le')) count--;
  if (w.endsWith('ed') && w.length > 3) count--;
  return Math.max(1, count);
}

function scoreSentenceLength(avg: number): number {
  if (avg >= 8 && avg <= 20) return 100;
  if (avg < 8) return Math.max(40, 100 - (8 - avg) * 10);
  return Math.max(30, 100 - (avg - 20) * 5);
}

function scoreWordLength(avg: number): number {
  if (avg >= 4 && avg <= 7) return 100;
  if (avg < 4) return Math.max(50, 100 - (4 - avg) * 20);
  return Math.max(40, 100 - (avg - 7) * 15);
}

function scoreComplexity(ratio: number): number {
  if (ratio <= 0.15) return 100;
  if (ratio <= 0.25) return 80;
  if (ratio <= 0.35) return 60;
  return Math.max(20, 100 - ratio * 200);
}

function scorePassiveVoice(ratio: number): number {
  if (ratio <= 0.05) return 100;
  if (ratio <= 0.10) return 85;
  if (ratio <= 0.20) return 65;
  if (ratio <= 0.30) return 45;
  return Math.max(10, 100 - ratio * 250);
}

function scoreBulletQuality(bullets: string[]): number {
  if (bullets.length === 0) return 50; // No bullets = neutral

  let totalQuality = 0;
  for (const bullet of bullets) {
    const cleaned = bullet.replace(/^[-•*]\s+|\d+\.\s+/, '').trim();
    const words = cleaned.split(/\s+/);
    let quality = 50;

    // Ideal bullet length: 10-25 words
    if (words.length >= 10 && words.length <= 25) quality += 20;
    else if (words.length >= 5 && words.length < 10) quality += 10;
    else if (words.length > 25) quality += 5;

    // Starts with action verb
    if (ACTION_VERBS.has(words[0]?.toLowerCase())) quality += 15;

    // Contains quantifiable results
    if (/\d+%|\$[\d,]+|\d+x|\d+\+/.test(cleaned)) quality += 15;

    totalQuality += Math.min(100, quality);
  }

  return Math.round(totalQuality / bullets.length);
}

function scoreActionVerbs(ratio: number): number {
  if (ratio >= 0.8) return 100;
  if (ratio >= 0.6) return 85;
  if (ratio >= 0.4) return 65;
  if (ratio >= 0.2) return 45;
  return 25;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

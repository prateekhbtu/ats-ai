/**
 * Role Market Benchmark – Maps job roles to industry-standard expectations.
 * Used for the market alignment component of UniScore.
 */

export interface MarketBenchmark {
  typical_skills: string[];
  min_experience_years: number;
  expected_sections: string[];
  industry_keywords: string[];
  seniority_indicators: SeniorityIndicator[];
}

interface SeniorityIndicator {
  level: string;
  keywords: string[];
  min_years: number;
}

const ROLE_BENCHMARKS: Record<string, MarketBenchmark> = {
  'software engineer': {
    typical_skills: [
      'programming', 'algorithms', 'data structures', 'git', 'testing',
      'debugging', 'code review', 'agile', 'ci/cd', 'api',
    ],
    min_experience_years: 1,
    expected_sections: ['summary', 'experience', 'skills', 'education', 'projects'],
    industry_keywords: ['software', 'development', 'engineering', 'code', 'deploy'],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'associate', 'intern'], min_years: 0 },
      { level: 'mid', keywords: ['mid', 'intermediate'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'lead', 'principal', 'staff'], min_years: 5 },
    ],
  },
  'data scientist': {
    typical_skills: [
      'python', 'r', 'machine learning', 'statistics', 'sql', 'data visualization',
      'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
    ],
    min_experience_years: 1,
    expected_sections: ['summary', 'experience', 'skills', 'education', 'projects'],
    industry_keywords: ['data', 'analytics', 'model', 'prediction', 'research'],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'associate'], min_years: 0 },
      { level: 'mid', keywords: ['mid', 'data scientist'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'lead', 'principal', 'staff'], min_years: 5 },
    ],
  },
  'product manager': {
    typical_skills: [
      'product strategy', 'roadmap', 'user research', 'agile', 'stakeholder management',
      'analytics', 'a/b testing', 'prioritization', 'okrs', 'jira',
    ],
    min_experience_years: 2,
    expected_sections: ['summary', 'experience', 'skills', 'education'],
    industry_keywords: ['product', 'roadmap', 'stakeholder', 'feature', 'sprint'],
    seniority_indicators: [
      { level: 'junior', keywords: ['associate', 'apm', 'junior'], min_years: 0 },
      { level: 'mid', keywords: ['product manager'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'director', 'vp', 'head of', 'group'], min_years: 5 },
    ],
  },
  'frontend developer': {
    typical_skills: [
      'html', 'css', 'javascript', 'typescript', 'react', 'vue', 'angular',
      'responsive design', 'accessibility', 'performance', 'testing',
    ],
    min_experience_years: 1,
    expected_sections: ['summary', 'experience', 'skills', 'education', 'projects'],
    industry_keywords: ['frontend', 'ui', 'web', 'browser', 'component'],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'associate'], min_years: 0 },
      { level: 'mid', keywords: ['mid', 'frontend developer'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'lead', 'principal', 'staff'], min_years: 5 },
    ],
  },
  'backend developer': {
    typical_skills: [
      'api design', 'databases', 'sql', 'nosql', 'microservices',
      'cloud', 'docker', 'kubernetes', 'security', 'scalability',
    ],
    min_experience_years: 1,
    expected_sections: ['summary', 'experience', 'skills', 'education', 'projects'],
    industry_keywords: ['backend', 'server', 'api', 'database', 'infrastructure'],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'associate'], min_years: 0 },
      { level: 'mid', keywords: ['mid', 'backend developer'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'lead', 'principal', 'staff'], min_years: 5 },
    ],
  },
  'devops engineer': {
    typical_skills: [
      'ci/cd', 'docker', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure',
      'monitoring', 'linux', 'scripting', 'automation',
    ],
    min_experience_years: 2,
    expected_sections: ['summary', 'experience', 'skills', 'certifications', 'education'],
    industry_keywords: ['devops', 'infrastructure', 'deployment', 'automation', 'cloud'],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'associate'], min_years: 0 },
      { level: 'mid', keywords: ['devops', 'sre'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'lead', 'principal', 'staff'], min_years: 5 },
    ],
  },
  'data engineer': {
    typical_skills: [
      'sql', 'python', 'spark', 'airflow', 'etl', 'data warehouse',
      'aws', 'gcp', 'kafka', 'databricks', 'data modeling',
    ],
    min_experience_years: 1,
    expected_sections: ['summary', 'experience', 'skills', 'education', 'projects'],
    industry_keywords: ['data', 'pipeline', 'etl', 'warehouse', 'processing'],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'associate'], min_years: 0 },
      { level: 'mid', keywords: ['data engineer'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'lead', 'principal', 'staff'], min_years: 5 },
    ],
  },
  'designer': {
    typical_skills: [
      'figma', 'sketch', 'adobe xd', 'user research', 'wireframing',
      'prototyping', 'design systems', 'typography', 'color theory', 'usability testing',
    ],
    min_experience_years: 1,
    expected_sections: ['summary', 'experience', 'skills', 'education', 'projects'],
    industry_keywords: ['design', 'ux', 'ui', 'user', 'interface', 'prototype'],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'associate'], min_years: 0 },
      { level: 'mid', keywords: ['designer', 'ux designer'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'lead', 'principal', 'head of'], min_years: 5 },
    ],
  },
  'project manager': {
    typical_skills: [
      'agile', 'scrum', 'project planning', 'risk management', 'budgeting',
      'stakeholder communication', 'jira', 'gantt', 'pmp', 'resource allocation',
    ],
    min_experience_years: 2,
    expected_sections: ['summary', 'experience', 'skills', 'certifications', 'education'],
    industry_keywords: ['project', 'timeline', 'deliverable', 'milestone', 'stakeholder'],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'coordinator'], min_years: 0 },
      { level: 'mid', keywords: ['project manager'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'director', 'program manager'], min_years: 5 },
    ],
  },
  'default': {
    typical_skills: [
      'communication', 'teamwork', 'problem solving', 'leadership',
      'time management', 'analytical skills', 'adaptability',
    ],
    min_experience_years: 0,
    expected_sections: ['summary', 'experience', 'skills', 'education'],
    industry_keywords: [],
    seniority_indicators: [
      { level: 'junior', keywords: ['entry', 'junior', 'associate', 'intern'], min_years: 0 },
      { level: 'mid', keywords: ['mid', 'intermediate'], min_years: 2 },
      { level: 'senior', keywords: ['senior', 'lead', 'manager', 'director'], min_years: 5 },
    ],
  },
};

export function getMarketBenchmark(jobTitle: string, _industry: string): MarketBenchmark {
  const titleLower = jobTitle.toLowerCase();

  // Try exact match first
  for (const [role, benchmark] of Object.entries(ROLE_BENCHMARKS)) {
    if (role === 'default') continue;
    if (titleLower.includes(role)) return benchmark;
  }

  // Try keyword matching
  const roleKeywords: Record<string, string[]> = {
    'software engineer': ['developer', 'programmer', 'coder', 'sde', 'swe'],
    'data scientist': ['ml engineer', 'machine learning', 'ai engineer', 'research scientist'],
    'product manager': ['product owner', 'po'],
    'frontend developer': ['frontend', 'front-end', 'ui developer', 'web developer'],
    'backend developer': ['backend', 'back-end', 'server-side'],
    'devops engineer': ['sre', 'site reliability', 'platform engineer', 'infrastructure'],
    'data engineer': ['data architect', 'analytics engineer', 'etl developer'],
    'designer': ['ux designer', 'ui designer', 'visual designer', 'interaction designer'],
    'project manager': ['program manager', 'scrum master', 'delivery manager'],
  };

  for (const [role, keywords] of Object.entries(roleKeywords)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return ROLE_BENCHMARKS[role];
      }
    }
  }

  // Fallback: use default benchmark
  return ROLE_BENCHMARKS['default'];
}

export interface MarketAlignmentResult {
  score: number;
  matched_benchmarks: string[];
  missing_benchmarks: string[];
  seniority_match: boolean;
  detected_seniority: string;
}

export function computeMarketAlignment(
  resumeText: string,
  resumeSkills: string[],
  resumeExperienceCount: number,
  jdTitle: string,
  jdIndustry: string,
  jdSeniorityLevel: string
): MarketAlignmentResult {
  const benchmark = getMarketBenchmark(jdTitle, jdIndustry);
  const resumeTextLower = resumeText.toLowerCase();
  const resumeSkillsLower = new Set(resumeSkills.map(s => s.toLowerCase()));

  // Check how many typical skills are present
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of benchmark.typical_skills) {
    if (resumeSkillsLower.has(skill) || resumeTextLower.includes(skill)) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const skillMatchRatio = benchmark.typical_skills.length > 0
    ? matched.length / benchmark.typical_skills.length
    : 0.5;

  // Estimate experience years from resume
  const experienceYears = estimateExperienceYears(resumeText, resumeExperienceCount);

  // Check seniority alignment
  let detectedSeniority = 'unknown';
  let seniorityMatch = false;
  const jdSeniorityLower = jdSeniorityLevel.toLowerCase();

  for (const indicator of benchmark.seniority_indicators) {
    if (experienceYears >= indicator.min_years) {
      detectedSeniority = indicator.level;
    }
  }

  if (jdSeniorityLower.includes(detectedSeniority) || detectedSeniority === 'unknown') {
    seniorityMatch = true;
  }

  // Industry keyword coverage
  const industryHits = benchmark.industry_keywords.filter(k => resumeTextLower.includes(k)).length;
  const industryRatio = benchmark.industry_keywords.length > 0
    ? industryHits / benchmark.industry_keywords.length
    : 0.5;

  // Compute overall market alignment score
  const score = Math.round(
    skillMatchRatio * 50 +
    industryRatio * 25 +
    (seniorityMatch ? 25 : 10)
  );

  return {
    score: Math.min(100, score),
    matched_benchmarks: matched,
    missing_benchmarks: missing,
    seniority_match: seniorityMatch,
    detected_seniority: detectedSeniority,
  };
}

function estimateExperienceYears(text: string, experienceCount: number): number {
  // Try to extract years from common patterns
  const yearPatterns = [
    /(\d+)\+?\s*years?\s*(?:of\s*)?experience/gi,
    /experience\s*:\s*(\d+)\+?\s*years?/gi,
    /(\d{4})\s*[-–]\s*(present|\d{4})/gi,
  ];

  let maxYears = 0;

  for (const pattern of yearPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[2] && /^\d{4}$/.test(match[1])) {
        const startYear = parseInt(match[1]);
        const endYear = match[2].toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(match[2]);
        const years = endYear - startYear;
        if (years > 0 && years < 50) {
          maxYears = Math.max(maxYears, years);
        }
      } else {
        const years = parseInt(match[1]);
        if (years > 0 && years < 50) {
          maxYears = Math.max(maxYears, years);
        }
      }
    }
  }

  // Fallback: estimate from number of experience entries
  if (maxYears === 0 && experienceCount > 0) {
    maxYears = Math.min(experienceCount * 2, 15);
  }

  return maxYears;
}

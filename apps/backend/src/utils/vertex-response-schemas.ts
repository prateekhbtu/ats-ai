export const resumeSectionsSchema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING', nullable: true },
    experience: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          company: { type: 'STRING' },
          duration: { type: 'STRING' },
          bullets: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['title', 'company', 'duration', 'bullets'],
      },
    },
    education: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          degree: { type: 'STRING' },
          institution: { type: 'STRING' },
          year: { type: 'STRING' },
          details: { type: 'STRING' },
        },
        required: ['degree', 'institution', 'year', 'details'],
      },
    },
    skills: { type: 'ARRAY', items: { type: 'STRING' } },
    certifications: { type: 'ARRAY', items: { type: 'STRING' } },
    projects: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          description: { type: 'STRING' },
          technologies: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['name', 'description', 'technologies'],
      },
    },
    other: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['summary', 'experience', 'education', 'skills', 'certifications', 'projects', 'other'],
} as const;

export const jdExtractedDataSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    company: { type: 'STRING' },
    required_skills: { type: 'ARRAY', items: { type: 'STRING' } },
    preferred_skills: { type: 'ARRAY', items: { type: 'STRING' } },
    experience_requirements: { type: 'STRING' },
    role_expectations: { type: 'ARRAY', items: { type: 'STRING' } },
    industry: { type: 'STRING' },
    seniority_level: { type: 'STRING' },
  },
  required: ['title', 'company', 'required_skills', 'preferred_skills', 'experience_requirements', 'role_expectations', 'industry', 'seniority_level'],
} as const;

export const strengthsWeaknessesSchema = {
  type: 'OBJECT',
  properties: {
    strengths: { type: 'ARRAY', items: { type: 'STRING' } },
    weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['strengths', 'weaknesses'],
} as const;

export const coverLetterSchema = {
  type: 'OBJECT',
  properties: {
    content: { type: 'STRING' },
    word_count: { type: 'NUMBER' },
  },
  required: ['content', 'word_count'],
} as const;

export const writingAnalysisSchema = {
  type: 'OBJECT',
  properties: {
    additional_issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type: { type: 'STRING', enum: ['weak_phrasing', 'grammar_risk', 'clarity'] },
          text: { type: 'STRING' },
          suggestion: { type: 'STRING' },
          position: {
            type: 'OBJECT',
            properties: {
              start: { type: 'NUMBER' },
              end: { type: 'NUMBER' },
            },
            required: ['start', 'end'],
          },
          severity: { type: 'STRING', enum: ['low', 'medium', 'high'] },
        },
        required: ['type', 'text', 'suggestion', 'position', 'severity'],
      },
    },
    summary: { type: 'STRING' },
  },
  required: ['additional_issues', 'summary'],
} as const;

export const interviewQuestionsSchema = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: ['technical', 'behavioral', 'situational'] },
          question: { type: 'STRING' },
          context: { type: 'STRING' },
          suggested_approach: { type: 'STRING' },
        },
        required: ['category', 'question', 'context', 'suggested_approach'],
      },
    },
  },
  required: ['questions'],
} as const;

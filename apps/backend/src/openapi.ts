/**
 * OpenAPI 3.0 specification for ATS AI Backend
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ATS AI — Resume Optimizer API',
    description:
      'AI-powered ATS resume optimizer with scoring, enhancement, cover letters, interview prep, and writing analysis.',
    version: '1.0.0',
    contact: { name: 'ATS AI Support' },
  },
  servers: [
    { url: 'http://localhost:8787', description: 'Local dev' },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication & password management' },
    { name: 'Profile', description: 'User profile CRUD & picture management' },
    { name: 'Resume', description: 'Resume upload & retrieval' },
    { name: 'Job Description', description: 'JD processing' },
    { name: 'Analysis', description: 'Resume–JD scoring' },
    { name: 'Enhancer', description: 'AI resume enhancement & refinement' },
    { name: 'Cover Letter', description: 'AI cover letter generation' },
    { name: 'Interview', description: 'AI interview question generation' },
    { name: 'Writing', description: 'AI writing analysis' },
    { name: 'Version', description: 'Version history & restore' },
  ],

  // ── Security ────────────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/* endpoints',
      },
    },
    schemas: {
      // ── Common ──
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/PublicProfile' },
        },
      },
      PublicProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          picture: { type: 'string' },
          phone: { type: 'string', nullable: true },
          headline: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true },
          linkedin_url: { type: 'string', nullable: true },
          website_url: { type: 'string', nullable: true },
          email_verified: { type: 'boolean' },
          auth_provider: { type: 'string', enum: ['google', 'email'] },
        },
      },
      ResumeSections: {
        type: 'object',
        properties: {
          summary: { type: 'string', nullable: true },
          experience: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                company: { type: 'string' },
                duration: { type: 'string' },
                bullets: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          education: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                degree: { type: 'string' },
                institution: { type: 'string' },
                year: { type: 'string' },
                details: { type: 'string' },
              },
            },
          },
          skills: { type: 'array', items: { type: 'string' } },
          certifications: { type: 'array', items: { type: 'string' } },
          projects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                technologies: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          other: { type: 'array', items: { type: 'string' } },
        },
      },
      JdExtractedData: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          company: { type: 'string' },
          required_skills: { type: 'array', items: { type: 'string' } },
          preferred_skills: { type: 'array', items: { type: 'string' } },
          experience_requirements: { type: 'string' },
          role_expectations: { type: 'array', items: { type: 'string' } },
          industry: { type: 'string' },
          seniority_level: { type: 'string' },
        },
      },
      ScoreBreakdown: {
        type: 'object',
        properties: {
          keyword_match: { type: 'number' },
          market_alignment: { type: 'number' },
          section_completeness: { type: 'number' },
          readability: { type: 'number' },
          experience_depth: { type: 'number' },
        },
      },
      UniScoreResult: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          uniscore: { type: 'number' },
          breakdown: { $ref: '#/components/schemas/ScoreBreakdown' },
          strengths: { type: 'array', items: { type: 'string' } },
          weaknesses: { type: 'array', items: { type: 'string' } },
        },
      },
      DiffResult: {
        type: 'object',
        properties: {
          section: { type: 'string' },
          original: { type: 'string' },
          enhanced: { type: 'string' },
          change_type: { type: 'string', enum: ['modified', 'added', 'removed', 'unchanged'] },
        },
      },
      WritingIssue: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['weak_phrasing', 'long_sentence', 'passive_voice', 'grammar_risk', 'clarity'] },
          text: { type: 'string' },
          suggestion: { type: 'string' },
          position: {
            type: 'object',
            properties: { start: { type: 'number' }, end: { type: 'number' } },
          },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
      InterviewQuestion: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['technical', 'behavioral', 'situational'] },
          question: { type: 'string' },
          context: { type: 'string' },
          suggested_approach: { type: 'string' },
        },
      },
    },
  },

  // ── Paths ───────────────────────────────────────────────────────
  paths: {
    // ── Auth ──────────────────────────────────────────────────────
    '/api/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in with Google',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id_token'],
                properties: { id_token: { type: 'string', description: 'Google OAuth ID token' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Auth success', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register with email & password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8, description: 'Min 8 chars' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          409: { description: 'Email already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email & password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login success', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify email with token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: { token: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Email verified', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/api/auth/resend-verify': {
      post: {
        tags: ['Auth'],
        summary: 'Resend verification email',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Email sent', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password (authenticated)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['current_password', 'new_password'],
                properties: {
                  current_password: { type: 'string' },
                  new_password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed' },
          401: { description: 'Current password incorrect' },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'If account exists, reset email sent' },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'new_password'],
                properties: {
                  token: { type: 'string' },
                  new_password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },

    // ── Profile ───────────────────────────────────────────────────
    '/api/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Profile', content: { 'application/json': { schema: { type: 'object', properties: { profile: { $ref: '#/components/schemas/PublicProfile' } } } } } },
        },
      },
      put: {
        tags: ['Profile'],
        summary: 'Update profile fields',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  headline: { type: 'string' },
                  location: { type: 'string' },
                  bio: { type: 'string' },
                  linkedin_url: { type: 'string' },
                  website_url: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated profile', content: { 'application/json': { schema: { type: 'object', properties: { profile: { $ref: '#/components/schemas/PublicProfile' } } } } } },
        },
      },
      delete: {
        tags: ['Profile'],
        summary: 'Delete account permanently',
        description: 'Email-auth users must supply their password. Google-auth users can omit it.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { password: { type: 'string', description: 'Required for email-auth users' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Account deleted' },
          401: { description: 'Wrong password' },
        },
      },
    },
    '/api/profile/picture': {
      post: {
        tags: ['Profile'],
        summary: 'Upload profile picture',
        description: 'Send as multipart/form-data (field: picture) or raw binary with Content-Type: image/*',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { picture: { type: 'string', format: 'binary' } },
              },
            },
            'image/*': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        responses: {
          200: { description: 'Updated profile with picture', content: { 'application/json': { schema: { type: 'object', properties: { profile: { $ref: '#/components/schemas/PublicProfile' } } } } } },
        },
      },
      delete: {
        tags: ['Profile'],
        summary: 'Remove profile picture',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Profile picture removed' },
        },
      },
    },

    // ── Resume ────────────────────────────────────────────────────
    '/api/resume/upload': {
      post: {
        tags: ['Resume'],
        summary: 'Upload & parse a resume (PDF/DOCX)',
        description: 'Send as multipart/form-data (field: file, max 10 MB) or raw binary with X-Filename header.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Parsed resume',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    sections: { $ref: '#/components/schemas/ResumeSections' },
                    raw_text: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/resume/{id}': {
      get: {
        tags: ['Resume'],
        summary: 'Get a resume by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Resume',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    resume: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        original_filename: { type: 'string' },
                        raw_text: { type: 'string' },
                        sections: { $ref: '#/components/schemas/ResumeSections' },
                        created_at: { type: 'string' },
                        updated_at: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Not found' },
        },
      },
    },

    // ── Job Description ───────────────────────────────────────────
    '/api/jd/process': {
      post: {
        tags: ['Job Description'],
        summary: 'Process a job description (text or URL)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  text: { type: 'string', description: 'JD text (min 30 chars)' },
                  url: { type: 'string', description: 'URL to scrape JD from' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Processed JD',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    extracted_data: { $ref: '#/components/schemas/JdExtractedData' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Analysis ──────────────────────────────────────────────────
    '/api/analysis/uniscore': {
      post: {
        tags: ['Analysis'],
        summary: 'Get UniScore (resume vs JD match)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resume_id', 'jd_id'],
                properties: {
                  resume_id: { type: 'string', format: 'uuid' },
                  jd_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Score result', content: { 'application/json': { schema: { $ref: '#/components/schemas/UniScoreResult' } } } },
        },
      },
    },

    // ── Enhancer ──────────────────────────────────────────────────
    '/api/enhancer/resume': {
      post: {
        tags: ['Enhancer'],
        summary: 'AI-enhance a resume for a JD',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resume_id', 'jd_id', 'analysis_id'],
                properties: {
                  resume_id: { type: 'string', format: 'uuid' },
                  jd_id: { type: 'string', format: 'uuid' },
                  analysis_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Enhanced resume',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    version: { type: 'number' },
                    enhanced_sections: { $ref: '#/components/schemas/ResumeSections' },
                    diff: { type: 'array', items: { $ref: '#/components/schemas/DiffResult' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/enhancer/refine': {
      post: {
        tags: ['Enhancer'],
        summary: 'Refine an enhanced resume with instructions',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['enhanced_resume_id', 'instructions'],
                properties: {
                  enhanced_resume_id: { type: 'string', format: 'uuid' },
                  instructions: { type: 'string', minLength: 5, maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Refined resume',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    version: { type: 'number' },
                    enhanced_sections: { $ref: '#/components/schemas/ResumeSections' },
                    diff: { type: 'array', items: { $ref: '#/components/schemas/DiffResult' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Cover Letter ──────────────────────────────────────────────
    '/api/cover-letter/generate': {
      post: {
        tags: ['Cover Letter'],
        summary: 'Generate an AI cover letter',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resume_id', 'jd_id', 'tone'],
                properties: {
                  resume_id: { type: 'string', format: 'uuid' },
                  jd_id: { type: 'string', format: 'uuid' },
                  tone: { type: 'string', enum: ['formal', 'conversational', 'assertive'] },
                  template: { type: 'string', description: 'Optional custom template' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Generated cover letter',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    tone: { type: 'string' },
                    content: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Interview ─────────────────────────────────────────────────
    '/api/interview/generate': {
      post: {
        tags: ['Interview'],
        summary: 'Generate interview questions from resume + JD',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['resume_id', 'jd_id'],
                properties: {
                  resume_id: { type: 'string', format: 'uuid' },
                  jd_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Interview questions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    questions: { type: 'array', items: { $ref: '#/components/schemas/InterviewQuestion' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Writing ───────────────────────────────────────────────────
    '/api/writing/analyze': {
      post: {
        tags: ['Writing'],
        summary: 'Analyze writing quality',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: { text: { type: 'string', minLength: 20, maxLength: 50000 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Writing analysis',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    issues: { type: 'array', items: { $ref: '#/components/schemas/WritingIssue' } },
                    overall_score: { type: 'number' },
                    summary: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── Version ───────────────────────────────────────────────────
    '/api/version/{resume_id}': {
      get: {
        tags: ['Version'],
        summary: 'Get version history for a resume',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'resume_id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Version list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    versions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          entity_type: { type: 'string' },
                          entity_id: { type: 'string' },
                          version_number: { type: 'number' },
                          created_at: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/version/restore': {
      post: {
        tags: ['Version'],
        summary: 'Restore a specific version',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['version_id'],
                properties: { version_id: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Version restored' },
          404: { description: 'Version not found' },
        },
      },
    },
  },
} as const;

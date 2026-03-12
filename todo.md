You are working on a production backend for an AI Resume Optimizer.

Tech stack:

* Backend: Hono running on Cloudflare Workers
* Database: Neon PostgreSQL
* LLM: Gemini 2.0 Flash via Vertex AI
* Auth: JWT + Google OAuth + Email/Password
* File uploads: PDF and DOCX resumes
* Architecture: monorepo with backend first, frontend later
* Backend already exposes REST APIs via OpenAPI

Your task is to implement and refine the complete AI pipeline so that resume parsing, job description processing, ATS scoring, resume enhancement, cover letter generation, interview questions, and writing analysis work reliably.

Important constraints:

1. The AI must never hallucinate information that is not present in the resume.
2. Resume parsing must strictly use the uploaded file content.
3. The backend schema, migrations, and API response formats must stay fully synchronized with the OpenAPI specification and the frontend expectations.
4. All data must be user-scoped. No user must ever be able to access another user's data.
5. Every record must include a user_id and all queries must filter by user_id.

Implement the following system.

---

RESUME INGESTION PIPELINE

When a user uploads a resume (PDF or DOCX):

1. Extract raw text from the file.

   * Use a reliable PDF parser for PDFs.
   * Use a DOCX parser for Word files.
   * Clean artifacts such as repeated spaces, headers, and broken lines.

2. Send the cleaned text to Gemini 2.0 Flash using Vertex AI.

3. The LLM must convert the raw resume text into structured JSON.

The structured JSON must contain:

{
summary,
experience[],
education[],
skills[],
certifications[],
projects[],
other[]
}

Each experience object must contain:
title
company
duration
bullets[]

Each education object must contain:
degree
institution
year
details

Projects must contain:
name
description
technologies[]

Return strict JSON only.

---

JOB DESCRIPTION PROCESSING

Users can paste a job description or provide a job URL.

Process the job description using the LLM and extract structured data:

{
title,
company,
required_skills[],
preferred_skills[],
experience_requirements,
role_expectations[],
industry,
seniority_level
}

Store this structured JD data in the database.

---

UNISCORE (ATS SCORING ENGINE)

Implement the ATS scoring system called UniScore.

UniScore must range from 0 to 100.

It must be calculated using these weighted categories:

keyword_match: 30%
market_alignment: 25%
section_completeness: 15%
readability: 15%
experience_depth: 15%

Return:

{
uniscore,
breakdown,
strengths[],
weaknesses[]
}

The AI must evaluate only the structured resume and structured job description.

---

RESUME ENHANCER

The system must generate an improved version of the resume tailored to the job description.

Rules:

* Never invent experience.
* Only rewrite wording to better match the job requirements.
* Preserve factual information.

Return:

{
enhanced_sections,
diff[]
}

The diff array must contain:

{
section,
original,
enhanced,
change_type
}

---

COVER LETTER GENERATION

Generate a cover letter using:

* resume
* job description
* tone selected by the user

Supported tones:
formal
conversational
assertive

Return a structured response:

{
tone,
content
}

---

WRITING ANALYSIS

Implement a Grammarly-like analyzer.

Input: arbitrary text.

Output:

{
issues[],
overall_score,
summary
}

Each issue must contain:

{
type,
text,
suggestion,
severity,
position
}

Types include:
weak_phrasing
passive_voice
long_sentence
grammar_risk
clarity

---

INTERVIEW QUESTION GENERATOR

Generate interview questions based on the resume and job description.

Return:

{
questions[]
}

Each question must include:

category
question
context
suggested_approach

Categories include:
technical
behavioral
situational

---

DATABASE DESIGN REQUIREMENTS

Design the database so that:

* Every table includes user_id
* All queries filter by user_id
* Data from one user cannot be accessed by another user

Tables required:

users
resumes
job_descriptions
analyses
enhanced_resumes
cover_letters
versions

Relationships:

users → resumes
users → job_descriptions
users → analyses
users → cover_letters

Ensure foreign keys enforce ownership.

Example:

resumes.user_id references users.id

When querying resumes, job descriptions, or analyses, always include:

WHERE user_id = current_user_id

---

MIGRATIONS

Update the database schema and generate migrations so that:

* the schema matches the backend models
* the API responses match the OpenAPI specification
* the frontend can safely parse responses

Migrations must be idempotent and safe for production.

---

API CONTRACT CONSISTENCY

Ensure:

* Backend response shapes match the OpenAPI spec.
* JSON keys remain stable.
* No field names change unexpectedly.
* Frontend parsing will not break.

---

LLM PROMPTING RULES

All prompts sent to Gemini must follow these rules:

1. Always return strict JSON.
2. Never add markdown or explanation.
3. Never fabricate resume details.
4. If data is missing return null or empty arrays.

---

OUTPUT

Implement:

1. AI service layer
2. Gemini integration using Vertex AI
3. Resume parser
4. JD parser
5. UniScore engine
6. Resume enhancer
7. Cover letter generator
8. Writing analyzer
9. Interview generator
10. Updated database schema
11. Migration scripts
12. Secure user-scoped queries
13. API responses aligned with OpenAPI
14. Clean modular service architecture

Ensure the system is production ready and privacy safe.

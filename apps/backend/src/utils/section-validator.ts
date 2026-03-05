/**
 * Section Validator – Validates completeness of resume sections.
 * Part of the deterministic UniScore computation.
 */

import type { ResumeSections } from '../types/index.js';

export interface SectionCompletenessResult {
  score: number; // 0-100
  present_sections: string[];
  missing_sections: string[];
  section_scores: Record<string, number>;
}

const SECTION_WEIGHTS: Record<string, number> = {
  summary: 10,
  experience: 30,
  skills: 20,
  education: 15,
  projects: 10,
  certifications: 10,
  other: 5,
};

export function validateSections(
  sections: ResumeSections,
  expectedSections: string[] = ['summary', 'experience', 'skills', 'education']
): SectionCompletenessResult {
  const present: string[] = [];
  const missing: string[] = [];
  const sectionScores: Record<string, number> = {};

  // Summary
  const summaryScore = scoreSummary(sections.summary);
  sectionScores['summary'] = summaryScore;
  if (summaryScore > 0) present.push('summary');
  else if (expectedSections.includes('summary')) missing.push('summary');

  // Experience
  const experienceScore = scoreExperience(sections.experience);
  sectionScores['experience'] = experienceScore;
  if (experienceScore > 0) present.push('experience');
  else if (expectedSections.includes('experience')) missing.push('experience');

  // Skills
  const skillsScore = scoreSkills(sections.skills);
  sectionScores['skills'] = skillsScore;
  if (skillsScore > 0) present.push('skills');
  else if (expectedSections.includes('skills')) missing.push('skills');

  // Education
  const educationScore = scoreEducation(sections.education);
  sectionScores['education'] = educationScore;
  if (educationScore > 0) present.push('education');
  else if (expectedSections.includes('education')) missing.push('education');

  // Projects
  const projectsScore = scoreProjects(sections.projects);
  sectionScores['projects'] = projectsScore;
  if (projectsScore > 0) present.push('projects');
  else if (expectedSections.includes('projects')) missing.push('projects');

  // Certifications
  const certsScore = scoreCertifications(sections.certifications);
  sectionScores['certifications'] = certsScore;
  if (certsScore > 0) present.push('certifications');
  else if (expectedSections.includes('certifications')) missing.push('certifications');

  // Other
  const otherScore = sections.other.length > 0 ? 70 : 0;
  sectionScores['other'] = otherScore;
  if (otherScore > 0) present.push('other');

  // Calculate weighted total
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [section, weight] of Object.entries(SECTION_WEIGHTS)) {
    totalWeight += weight;
    weightedSum += (sectionScores[section] || 0) * (weight / 100);
  }

  const finalScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100 * 100) / 100 : 0;

  return {
    score: Math.min(100, Math.round(finalScore)),
    present_sections: present,
    missing_sections: missing,
    section_scores: sectionScores,
  };
}

function scoreSummary(summary: string | null): number {
  if (!summary || summary.trim().length === 0) return 0;

  const wordCount = summary.trim().split(/\s+/).length;

  if (wordCount < 10) return 30;
  if (wordCount < 20) return 50;
  if (wordCount <= 60) return 100;
  if (wordCount <= 100) return 80;
  return 60; // Too long
}

function scoreExperience(experience: ResumeSections['experience']): number {
  if (experience.length === 0) return 0;

  let totalQuality = 0;

  for (const exp of experience) {
    let quality = 0;

    // Has title
    if (exp.title && exp.title.trim().length > 0) quality += 20;

    // Has company
    if (exp.company && exp.company.trim().length > 0) quality += 20;

    // Has duration
    if (exp.duration && exp.duration.trim().length > 0) quality += 15;

    // Has bullet points
    if (exp.bullets.length > 0) {
      quality += 15;
      // Quality of bullets
      const avgBulletLength = exp.bullets.reduce((s, b) => s + b.split(/\s+/).length, 0) / exp.bullets.length;
      if (avgBulletLength >= 5 && avgBulletLength <= 25) quality += 15;
      else quality += 5;

      // Good number of bullets
      if (exp.bullets.length >= 2 && exp.bullets.length <= 6) quality += 15;
      else quality += 5;
    }

    totalQuality += Math.min(100, quality);
  }

  return Math.round(totalQuality / experience.length);
}

function scoreSkills(skills: string[]): number {
  if (skills.length === 0) return 0;
  if (skills.length < 3) return 30;
  if (skills.length < 5) return 50;
  if (skills.length <= 15) return 100;
  if (skills.length <= 25) return 85;
  return 70; // Too many skills might indicate lack of focus
}

function scoreEducation(education: ResumeSections['education']): number {
  if (education.length === 0) return 0;

  let totalQuality = 0;

  for (const edu of education) {
    let quality = 0;

    if (edu.degree && edu.degree.trim().length > 0) quality += 35;
    if (edu.institution && edu.institution.trim().length > 0) quality += 35;
    if (edu.year && edu.year.trim().length > 0) quality += 15;
    if (edu.details && edu.details.trim().length > 0) quality += 15;

    totalQuality += Math.min(100, quality);
  }

  return Math.round(totalQuality / education.length);
}

function scoreProjects(projects: ResumeSections['projects']): number {
  if (projects.length === 0) return 0;

  let totalQuality = 0;

  for (const proj of projects) {
    let quality = 0;

    if (proj.name && proj.name.trim().length > 0) quality += 30;
    if (proj.description && proj.description.trim().length > 10) quality += 40;
    if (proj.technologies && proj.technologies.length > 0) quality += 30;

    totalQuality += Math.min(100, quality);
  }

  return Math.round(totalQuality / projects.length);
}

function scoreCertifications(certifications: string[]): number {
  if (certifications.length === 0) return 0;
  if (certifications.length === 1) return 60;
  if (certifications.length <= 3) return 85;
  return 100;
}

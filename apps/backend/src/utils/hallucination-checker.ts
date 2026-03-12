/**
 * Hallucination Checker – Validates that enhanced resume content
 * does not contain fabricated information. Ensures all content
 * is grounded in the original resume.
 */

import type { ResumeSections } from '../types/index.js';

export interface HallucinationCheckResult {
  is_valid: boolean;
  violations: HallucinationViolation[];
  confidence: number; // 0-1
}

export interface HallucinationViolation {
  type: 'new_skill' | 'new_company' | 'new_certification' | 'new_degree' | 'fabricated_metric' | 'inflated_claim';
  description: string;
  original_context: string;
  enhanced_content: string;
}

export function checkHallucinations(
  original: ResumeSections,
  enhanced: ResumeSections
): HallucinationCheckResult {
  const violations: HallucinationViolation[] = [];

  // Check for fabricated companies
  checkCompanies(original, enhanced, violations);

  // Check for fabricated degrees/institutions
  checkEducation(original, enhanced, violations);

  // Check for fabricated certifications
  checkCertifications(original, enhanced, violations);

  // Check for fabricated skills (new skills not derivable from original)
  checkSkills(original, enhanced, violations);

  // Check for fabricated projects
  checkProjects(original, enhanced, violations);

  // Check for fabricated metrics in experience bullets
  checkMetrics(original, enhanced, violations);

  const confidence = violations.length === 0 ? 1.0 : Math.max(0, 1 - violations.length * 0.15);

  return {
    is_valid: violations.length === 0,
    violations,
    confidence,
  };
}

function checkCompanies(original: ResumeSections, enhanced: ResumeSections, violations: HallucinationViolation[]): void {
  const originalCompanies = new Set(
    original.experience.map(e => normalizeText(e.company))
  );

  for (const exp of enhanced.experience) {
    const normalized = normalizeText(exp.company);
    if (normalized && !originalCompanies.has(normalized)) {
      // Check if it's a slight rewording
      const isClose = Array.from(originalCompanies).some(oc => 
        stringSimilarity(oc, normalized) > 0.7
      );
      if (!isClose) {
        violations.push({
          type: 'new_company',
          description: `Company "${exp.company}" not found in original resume`,
          original_context: `Original companies: ${original.experience.map(e => e.company).join(', ')}`,
          enhanced_content: exp.company,
        });
      }
    }
  }
}

function checkEducation(original: ResumeSections, enhanced: ResumeSections, violations: HallucinationViolation[]): void {
  const originalDegrees = new Set(
    original.education.map(e => normalizeText(e.degree))
  );
  const originalInstitutions = new Set(
    original.education.map(e => normalizeText(e.institution))
  );

  for (const edu of enhanced.education) {
    const normDegree = normalizeText(edu.degree);
    if (normDegree && !originalDegrees.has(normDegree)) {
      const isClose = Array.from(originalDegrees).some(od => stringSimilarity(od, normDegree) > 0.7);
      if (!isClose) {
        violations.push({
          type: 'new_degree',
          description: `Degree "${edu.degree}" not found in original resume`,
          original_context: `Original degrees: ${original.education.map(e => e.degree).join(', ')}`,
          enhanced_content: edu.degree,
        });
      }
    }

    const normInst = normalizeText(edu.institution);
    if (normInst && !originalInstitutions.has(normInst)) {
      const isClose = Array.from(originalInstitutions).some(oi => stringSimilarity(oi, normInst) > 0.7);
      if (!isClose) {
        violations.push({
          type: 'new_degree',
          description: `Institution "${edu.institution}" not found in original resume`,
          original_context: `Original institutions: ${original.education.map(e => e.institution).join(', ')}`,
          enhanced_content: edu.institution,
        });
      }
    }
  }
}

function checkCertifications(original: ResumeSections, enhanced: ResumeSections, violations: HallucinationViolation[]): void {
  const originalCerts = new Set(
    original.certifications.map(c => normalizeText(c))
  );

  for (const cert of enhanced.certifications) {
    const normalized = normalizeText(cert);
    if (normalized && !originalCerts.has(normalized)) {
      const isClose = Array.from(originalCerts).some(oc => stringSimilarity(oc, normalized) > 0.7);
      if (!isClose) {
        violations.push({
          type: 'new_certification',
          description: `Certification "${cert}" not found in original resume`,
          original_context: `Original certifications: ${original.certifications.join(', ')}`,
          enhanced_content: cert,
        });
      }
    }
  }
}

function checkSkills(original: ResumeSections, enhanced: ResumeSections, violations: HallucinationViolation[]): void {
  // Build a comprehensive set of all skills/keywords from original resume
  const originalText = buildFullText(original).toLowerCase();
  const originalSkillSet = new Set(original.skills.map(s => normalizeText(s)));

  // Allow skills that appear in the original text even if not in the skills section
  const newSkills = enhanced.skills.filter(s => {
    const normalized = normalizeText(s);
    if (originalSkillSet.has(normalized)) return false;
    if (originalText.includes(normalized)) return false;
    // Check partial matches
    const parts = normalized.split(/\s+/);
    if (parts.every(p => originalText.includes(p))) return false;
    return true;
  });

  // Only flag if there are many new skills (some rewording is acceptable)
  if (newSkills.length > Math.max(3, original.skills.length * 0.3)) {
    for (const skill of newSkills.slice(0, 5)) {
      violations.push({
        type: 'new_skill',
        description: `Skill "${skill}" not found in original resume content`,
        original_context: `Original skills: ${original.skills.join(', ')}`,
        enhanced_content: skill,
      });
    }
  }
}

function checkProjects(original: ResumeSections, enhanced: ResumeSections, violations: HallucinationViolation[]): void {
  const originalProjectNames = new Set(
    original.projects.map(p => normalizeText(p.name))
  );

  for (const proj of enhanced.projects) {
    const normalized = normalizeText(proj.name);
    if (normalized && !originalProjectNames.has(normalized)) {
      const isClose = Array.from(originalProjectNames).some(op => stringSimilarity(op, normalized) > 0.6);
      if (!isClose) {
        violations.push({
          type: 'inflated_claim',
          description: `Project "${proj.name}" not found in original resume`,
          original_context: `Original projects: ${original.projects.map(p => p.name).join(', ')}`,
          enhanced_content: proj.name,
        });
      }
    }
  }
}

function checkMetrics(original: ResumeSections, enhanced: ResumeSections, violations: HallucinationViolation[]): void {
  // Extract all numbers / percentages from original
  const originalText = buildFullText(original);
  const originalNumbers = extractNumbers(originalText);

  // Check enhanced bullets for new numbers that don't appear in original
  for (const exp of enhanced.experience) {
    for (const bullet of exp.bullets) {
      const bulletNumbers = extractNumbers(bullet);
      for (const num of bulletNumbers) {
        if (!originalNumbers.has(num)) {
          // Check if it could be a reasonable transformation (e.g., "15 team members" -> "15+")
          const baseNum = num.replace(/[%$+,x]/g, '');
          const isDerivable = originalNumbers.has(baseNum) || 
            Array.from(originalNumbers).some(on => on.replace(/[%$+,x]/g, '') === baseNum);
          
          if (!isDerivable && /\d/.test(num)) {
            violations.push({
              type: 'fabricated_metric',
              description: `Metric "${num}" in enhanced bullet not found in original resume`,
              original_context: `Bullet: ${bullet}`,
              enhanced_content: num,
            });
          }
        }
      }
    }
  }
}

/**
 * Sanitize an enhanced resume by removing or replacing any fabricated entries.
 * Instead of throwing, strip:
 *  - experience entries whose company doesn't match any original
 *  - education entries with new degree/institution that don't match originals
 *  - certifications not in original
 *  - projects not in original
 *  - excess new skills beyond the original set
 * Metrics in bullets are cleaned by removing numeric tokens not in the original.
 */
export function sanitizeEnhancedSections(
  original: ResumeSections,
  enhanced: ResumeSections
): ResumeSections {
  const originalCompanies = new Set(original.experience.map(e => normalizeText(e.company)));
  const originalDegrees = new Set(original.education.map(e => normalizeText(e.degree)));
  const originalInstitutions = new Set(original.education.map(e => normalizeText(e.institution)));
  const originalCerts = new Set(original.certifications.map(c => normalizeText(c)));
  const originalProjectNames = new Set(original.projects.map(p => normalizeText(p.name)));
  const originalText = buildFullText(original).toLowerCase();
  const originalNumbers = extractNumbers(buildFullText(original));

  // --- experience: remove entries whose company is fabricated ---
  const cleanedExperience = enhanced.experience.filter(exp => {
    const norm = normalizeText(exp.company);
    if (!norm) return true;
    if (originalCompanies.has(norm)) return true;
    return Array.from(originalCompanies).some(oc => stringSimilarity(oc, norm) > 0.7);
  }).map(exp => ({
    ...exp,
    // clean fabricated metrics out of bullets – replace with original bullet if one matches
    bullets: exp.bullets.map(bullet => {
      const bulletNums = extractNumbers(bullet);
      let cleaned = bullet;
      for (const num of bulletNums) {
        const base = num.replace(/[%$+,x]/g, '');
        const isDerivable =
          originalNumbers.has(num) ||
          originalNumbers.has(base) ||
          Array.from(originalNumbers).some(on => on.replace(/[%$+,x]/g, '') === base);
        if (!isDerivable && /\d/.test(num)) {
          // Remove the number and any % / $ suffix attached to it
          cleaned = cleaned.replace(new RegExp(num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        }
      }
      return cleaned.replace(/\s{2,}/g, ' ').trim();
    }).filter(b => b.length > 0),
  }));

  // If all experience was stripped (very unlikely), fall back to original
  const safeExperience = cleanedExperience.length > 0 ? cleanedExperience : original.experience;

  // --- education: remove entries with fabricated degree OR institution ---
  const cleanedEducation = enhanced.education.filter(edu => {
    const normDeg = normalizeText(edu.degree);
    const normInst = normalizeText(edu.institution);
    const degOk = !normDeg || originalDegrees.has(normDeg) ||
      Array.from(originalDegrees).some(od => stringSimilarity(od, normDeg) > 0.7);
    const instOk = !normInst || originalInstitutions.has(normInst) ||
      Array.from(originalInstitutions).some(oi => stringSimilarity(oi, normInst) > 0.7);
    return degOk && instOk;
  });
  const safeEducation = cleanedEducation.length > 0 ? cleanedEducation : original.education;

  // --- certifications: keep only those present in original ---
  const cleanedCerts = enhanced.certifications.filter(cert => {
    const norm = normalizeText(cert);
    return !norm || originalCerts.has(norm) ||
      Array.from(originalCerts).some(oc => stringSimilarity(oc, norm) > 0.7);
  });

  // --- projects: remove fabricated projects ---
  const cleanedProjects = enhanced.projects.filter(proj => {
    const norm = normalizeText(proj.name);
    return !norm || originalProjectNames.has(norm) ||
      Array.from(originalProjectNames).some(op => stringSimilarity(op, norm) > 0.6);
  });
  const safeProjects = cleanedProjects.length > 0 ? cleanedProjects : original.projects;

  // --- skills: remove fabricated skills beyond a reasonable expansion ---
  const originalSkillSet = new Set(original.skills.map(s => normalizeText(s)));
  const cleanedSkills = enhanced.skills.filter(s => {
    const norm = normalizeText(s);
    if (originalSkillSet.has(norm)) return true;
    if (originalText.includes(norm)) return true;
    const parts = norm.split(/\s+/);
    return parts.every(p => p.length <= 2 || originalText.includes(p));
  });
  // If cleaning removed everything, fall back to original skills
  const safeSkills = cleanedSkills.length > 0 ? cleanedSkills : original.skills;

  return {
    summary: enhanced.summary,
    experience: safeExperience,
    education: safeEducation,
    skills: safeSkills,
    certifications: cleanedCerts,
    projects: safeProjects,
    other: enhanced.other,
  };
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function buildFullText(sections: ResumeSections): string {
  const parts: string[] = [];
  if (sections.summary) parts.push(sections.summary);
  for (const exp of sections.experience) {
    parts.push(exp.title, exp.company, ...exp.bullets);
  }
  parts.push(...sections.skills);
  for (const edu of sections.education) {
    parts.push(edu.degree, edu.institution, edu.details);
  }
  for (const proj of sections.projects) {
    parts.push(proj.name, proj.description, ...proj.technologies);
  }
  parts.push(...sections.certifications);
  parts.push(...sections.other);
  return parts.join(' ');
}

function extractNumbers(text: string): Set<string> {
  const matches = text.match(/\$?[\d,]+\.?\d*[%x+]?/g) || [];
  return new Set(matches.map(m => m.trim()));
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Use Jaccard similarity on word tokens
  const tokensA = new Set(a.split(/\s+/));
  const tokensB = new Set(b.split(/\s+/));

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

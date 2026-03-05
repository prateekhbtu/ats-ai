/**
 * Diff Generator – Computes differences between original and enhanced resume sections.
 */

import type { ResumeSections, DiffResult } from '../types/index.js';

export function generateDiff(original: ResumeSections, enhanced: ResumeSections): DiffResult[] {
  const diffs: DiffResult[] = [];

  // Summary diff
  diffs.push({
    section: 'summary',
    original: original.summary || '',
    enhanced: enhanced.summary || '',
    change_type: getChangeType(original.summary || '', enhanced.summary || ''),
  });

  // Experience diff
  const maxExp = Math.max(original.experience.length, enhanced.experience.length);
  for (let i = 0; i < maxExp; i++) {
    const origExp = original.experience[i];
    const enhExp = enhanced.experience[i];

    if (origExp && enhExp) {
      const origText = formatExperience(origExp);
      const enhText = formatExperience(enhExp);
      diffs.push({
        section: `experience[${i}] - ${origExp.title} at ${origExp.company}`,
        original: origText,
        enhanced: enhText,
        change_type: getChangeType(origText, enhText),
      });
    } else if (origExp && !enhExp) {
      diffs.push({
        section: `experience[${i}] - ${origExp.title} at ${origExp.company}`,
        original: formatExperience(origExp),
        enhanced: '',
        change_type: 'removed',
      });
    } else if (!origExp && enhExp) {
      diffs.push({
        section: `experience[${i}] - ${enhExp.title} at ${enhExp.company}`,
        original: '',
        enhanced: formatExperience(enhExp),
        change_type: 'added',
      });
    }
  }

  // Skills diff
  diffs.push({
    section: 'skills',
    original: original.skills.join(', '),
    enhanced: enhanced.skills.join(', '),
    change_type: getChangeType(original.skills.join(', '), enhanced.skills.join(', ')),
  });

  // Education diff
  const maxEdu = Math.max(original.education.length, enhanced.education.length);
  for (let i = 0; i < maxEdu; i++) {
    const origEdu = original.education[i];
    const enhEdu = enhanced.education[i];

    if (origEdu && enhEdu) {
      const origText = formatEducation(origEdu);
      const enhText = formatEducation(enhEdu);
      diffs.push({
        section: `education[${i}] - ${origEdu.degree}`,
        original: origText,
        enhanced: enhText,
        change_type: getChangeType(origText, enhText),
      });
    } else if (origEdu && !enhEdu) {
      diffs.push({
        section: `education[${i}] - ${origEdu.degree}`,
        original: formatEducation(origEdu),
        enhanced: '',
        change_type: 'removed',
      });
    } else if (!origEdu && enhEdu) {
      diffs.push({
        section: `education[${i}] - ${enhEdu.degree}`,
        original: '',
        enhanced: formatEducation(enhEdu),
        change_type: 'added',
      });
    }
  }

  // Projects diff
  const maxProj = Math.max(original.projects.length, enhanced.projects.length);
  for (let i = 0; i < maxProj; i++) {
    const origProj = original.projects[i];
    const enhProj = enhanced.projects[i];

    if (origProj && enhProj) {
      const origText = formatProject(origProj);
      const enhText = formatProject(enhProj);
      diffs.push({
        section: `projects[${i}] - ${origProj.name}`,
        original: origText,
        enhanced: enhText,
        change_type: getChangeType(origText, enhText),
      });
    } else if (origProj && !enhProj) {
      diffs.push({
        section: `projects[${i}] - ${origProj.name}`,
        original: formatProject(origProj),
        enhanced: '',
        change_type: 'removed',
      });
    } else if (!origProj && enhProj) {
      diffs.push({
        section: `projects[${i}] - ${enhProj.name}`,
        original: '',
        enhanced: formatProject(enhProj),
        change_type: 'added',
      });
    }
  }

  // Certifications diff
  diffs.push({
    section: 'certifications',
    original: original.certifications.join(', '),
    enhanced: enhanced.certifications.join(', '),
    change_type: getChangeType(original.certifications.join(', '), enhanced.certifications.join(', ')),
  });

  return diffs;
}

function getChangeType(original: string, enhanced: string): DiffResult['change_type'] {
  const origTrimmed = original.trim();
  const enhTrimmed = enhanced.trim();

  if (origTrimmed === enhTrimmed) return 'unchanged';
  if (origTrimmed === '' && enhTrimmed !== '') return 'added';
  if (origTrimmed !== '' && enhTrimmed === '') return 'removed';
  return 'modified';
}

function formatExperience(exp: { title: string; company: string; duration: string; bullets: string[] }): string {
  const lines = [`${exp.title} at ${exp.company} (${exp.duration})`];
  for (const bullet of exp.bullets) {
    lines.push(`• ${bullet}`);
  }
  return lines.join('\n');
}

function formatEducation(edu: { degree: string; institution: string; year: string; details: string }): string {
  return `${edu.degree} - ${edu.institution} (${edu.year})${edu.details ? ': ' + edu.details : ''}`;
}

function formatProject(proj: { name: string; description: string; technologies: string[] }): string {
  return `${proj.name}: ${proj.description}\nTechnologies: ${proj.technologies.join(', ')}`;
}

export function sectionsToText(sections: ResumeSections): string {
  const parts: string[] = [];

  if (sections.summary) {
    parts.push(`SUMMARY\n${sections.summary}`);
  }

  if (sections.experience.length > 0) {
    parts.push('EXPERIENCE');
    for (const exp of sections.experience) {
      parts.push(formatExperience(exp));
    }
  }

  if (sections.skills.length > 0) {
    parts.push(`SKILLS\n${sections.skills.join(', ')}`);
  }

  if (sections.education.length > 0) {
    parts.push('EDUCATION');
    for (const edu of sections.education) {
      parts.push(formatEducation(edu));
    }
  }

  if (sections.projects.length > 0) {
    parts.push('PROJECTS');
    for (const proj of sections.projects) {
      parts.push(formatProject(proj));
    }
  }

  if (sections.certifications.length > 0) {
    parts.push(`CERTIFICATIONS\n${sections.certifications.join(', ')}`);
  }

  if (sections.other.length > 0) {
    parts.push(`OTHER\n${sections.other.join('\n')}`);
  }

  return parts.join('\n\n');
}

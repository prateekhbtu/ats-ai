// User-scoped localStorage store for resource metadata.
// Keys are namespaced by user ID to ensure data isolation between users.

export interface ResumeRecord {
  id: string;
  original_filename: string;
  file_url?: string | null;    // Supabase Storage public URL (set after upload)
  created_at: string;
  ats_score?: number;
}

export interface JdRecord {
  id: string;
  title: string;
  company: string;
  created_at: string;
  url?: string;
  extracted_data?: {
    title: string;
    company: string;
    required_skills: string[];
    preferred_skills: string[];
    experience_requirements: string;
    role_expectations: string[];
    industry: string;
    seniority_level: string;
  };
}

export interface OptimizationRecord {
  id: string;           // analysis/enhanced-resume id
  resume_id: string;
  jd_id: string;
  resume_filename: string;
  jd_title: string;
  jd_company: string;
  uniscore: number;
  created_at: string;
}

// ─── User-scoped key generation ──────────────────────────────────────────────

function getUserId(): string {
  // Try to get user info from auth token payload for isolation
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.id || 'anonymous';
    }
  } catch {
    // fallback
  }
  return 'anonymous';
}

function scopedKey(base: string): string {
  const userId = getUserId();
  return `atsai_${userId}_${base}`;
}

function load<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Resumes ─────────────────────────────────────────────────────────────────

export const resumeStore = {
  list: (): ResumeRecord[] => load<ResumeRecord>(scopedKey('resumes')),

  add: (record: ResumeRecord) => {
    const items = resumeStore.list();
    save(scopedKey('resumes'), [record, ...items]);
  },

  update: (id: string, updates: Partial<ResumeRecord>) => {
    const items = resumeStore.list().map((r) =>
      r.id === id ? { ...r, ...updates } : r,
    );
    save(scopedKey('resumes'), items);
  },

  remove: (id: string) => {
    save(
      scopedKey('resumes'),
      resumeStore.list().filter((r) => r.id !== id),
    );
  },
};

// ─── Job Descriptions ─────────────────────────────────────────────────────────

export const jdStore = {
  list: (): JdRecord[] => load<JdRecord>(scopedKey('jds')),

  add: (record: JdRecord) => {
    const items = jdStore.list();
    save(scopedKey('jds'), [record, ...items]);
  },

  remove: (id: string) => {
    save(
      scopedKey('jds'),
      jdStore.list().filter((j) => j.id !== id),
    );
  },

  update: (id: string, updates: Partial<JdRecord>) => {
    const items = jdStore.list().map(j => j.id === id ? { ...j, ...updates } : j);
    save(scopedKey('jds'), items);
  },

  setAll: (records: JdRecord[]) => {
    save(scopedKey('jds'), records);
  },
};

// ─── Optimizations ────────────────────────────────────────────────────────────

export const optimizationStore = {
  list: (): OptimizationRecord[] => load<OptimizationRecord>(scopedKey('optimizations')),

  add: (record: OptimizationRecord) => {
    const items = optimizationStore.list();
    save(scopedKey('optimizations'), [record, ...items]);
  },

  remove: (id: string) => {
    save(
      scopedKey('optimizations'),
      optimizationStore.list().filter((o) => o.id !== id),
    );
  },
};

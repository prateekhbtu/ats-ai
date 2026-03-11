// Simple localStorage-backed store for resource metadata
// since the backend doesn't expose list endpoints in the OpenAPI spec.

export interface ResumeRecord {
  id: string;
  original_filename: string;
  created_at: string;
}

export interface JdRecord {
  id: string;
  title: string;
  company: string;
  created_at: string;
  url?: string;
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

const KEYS = {
  resumes: 'atsai_resumes',
  jds: 'atsai_jds',
  optimizations: 'atsai_optimizations',
};

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
  list: (): ResumeRecord[] => load<ResumeRecord>(KEYS.resumes),

  add: (record: ResumeRecord) => {
    const items = resumeStore.list();
    save(KEYS.resumes, [record, ...items]);
  },

  remove: (id: string) => {
    save(
      KEYS.resumes,
      resumeStore.list().filter((r) => r.id !== id),
    );
  },
};

// ─── Job Descriptions ─────────────────────────────────────────────────────────

export const jdStore = {
  list: (): JdRecord[] => load<JdRecord>(KEYS.jds),

  add: (record: JdRecord) => {
    const items = jdStore.list();
    save(KEYS.jds, [record, ...items]);
  },

  remove: (id: string) => {
    save(
      KEYS.jds,
      jdStore.list().filter((j) => j.id !== id),
    );
  },
};

// ─── Optimizations ────────────────────────────────────────────────────────────

export const optimizationStore = {
  list: (): OptimizationRecord[] => load<OptimizationRecord>(KEYS.optimizations),

  add: (record: OptimizationRecord) => {
    const items = optimizationStore.list();
    save(KEYS.optimizations, [record, ...items]);
  },

  remove: (id: string) => {
    save(
      KEYS.optimizations,
      optimizationStore.list().filter((o) => o.id !== id),
    );
  },
};

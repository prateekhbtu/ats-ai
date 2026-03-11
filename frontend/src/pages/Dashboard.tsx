import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, MoreVertical, Sparkles, TrendingUp, Briefcase, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { optimizationStore, resumeStore, jdStore, type OptimizationRecord } from '../lib/storage';

export function Dashboard() {
  const [optimizations, setOptimizations] = useState<OptimizationRecord[]>([]);
  const [resumeCount, setResumeCount] = useState(0);
  const [jdCount, setJdCount] = useState(0);

  useEffect(() => {
    const opts = optimizationStore.list();
    setOptimizations(opts);
    setResumeCount(resumeStore.list().length);
    setJdCount(jdStore.list().length);
  }, []);

  const avgScore =
    optimizations.length > 0
      ? Math.round(optimizations.reduce((s, o) => s + o.uniscore, 0) / optimizations.length)
      : 0;

  const stats = [
    { label: 'Total Optimizations', value: String(optimizations.length), icon: Sparkles, color: 'orange' },
    { label: 'Avg. ATS Score', value: optimizations.length ? `${avgScore}%` : '—', icon: TrendingUp, color: 'green' },
    { label: 'Saved Jobs', value: String(jdCount), icon: Briefcase, color: 'blue' },
  ];

  return (
    <DashboardLayout>
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Optimizations</h1>
          <p className="text-gray-500">Manage your tailored resumes and cover letters.</p>
        </div>
        <Link
          to="/editor"
          className="inline-flex items-center gap-2 bg-[#0A0A0A] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10 self-start sm:self-auto"
        >
          <Sparkles size={16} /> New Optimization
        </Link>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-500">{stat.label}</div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stat.color === 'orange' ? 'bg-orange-50 text-orange-500' :
                stat.color === 'green' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-500'
              }`}>
                <stat.icon size={16} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Activity */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>

        {optimizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-400 flex items-center justify-center mb-4">
              <Zap size={28} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No optimizations yet</h3>
            <p className="text-gray-500 text-sm max-w-sm mb-6">
              Upload a resume, add a job description, then run an optimization from the Editor.
            </p>
            <Link
              to="/editor"
              className="bg-[#0A0A0A] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-black/80 transition-all"
            >
              Start your first optimization
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {optimizations.map((opt, i) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 + 0.3 }}
                key={opt.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {opt.jd_title} — {opt.jd_company}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {opt.resume_filename} • {new Date(opt.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 ml-4">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-medium text-gray-500 mb-1.5">ATS Score</span>
                    <div className="flex items-center gap-3">
                      <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${opt.uniscore >= 80 ? 'bg-green-500' : opt.uniscore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${opt.uniscore}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-8 text-right">{opt.uniscore}</span>
                    </div>
                  </div>

                  <button className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-md hover:bg-gray-100">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      {resumeCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Link
            to="/resumes"
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
              <FileText size={22} />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Upload a Base Resume</div>
              <div className="text-xs text-gray-500 mt-0.5">Start by uploading your master resume</div>
            </div>
          </Link>
          <Link
            to="/jobs"
            className="flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
              <Briefcase size={22} />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">Save a Job Description</div>
              <div className="text-xs text-gray-500 mt-0.5">Add a job you want to target</div>
            </div>
          </Link>
        </motion.div>
      )}
    </DashboardLayout>
  );
}

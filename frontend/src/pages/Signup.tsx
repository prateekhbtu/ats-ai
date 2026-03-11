import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, ArrowLeft, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const FEATURES = [
  'Detailed ATS Scoring & Feedback',
  'Strict AI Fact-Checking (No Hallucinations)',
  'Custom Cover Letter Builder',
  'Interactive Resume Editing',
];

export function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern-dark opacity-20 pointer-events-none" />

      <header className="p-6 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center">

          {/* Left: Value Prop */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden md:flex flex-col gap-8 pr-12"
          >
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Land your dream job faster.
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed">
                Join thousands of professionals using atsai to bypass automated
                filters and get noticed by human recruiters.
              </p>
            </div>

            <div className="space-y-4">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-gray-300">
                  <CheckCircle2 size={20} className="text-orange-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: Auth Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl"
          >
            <div className="flex justify-center mb-6 md:hidden">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-black shadow-lg">
                <Layers size={24} strokeWidth={2.5} />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                Create your account
              </h2>
              <p className="text-sm text-gray-400">
                Start optimizing your resume for free.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm mb-6">
                <AlertCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Smith"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-gray-900 py-3 px-4 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg mt-2"
              >
                {loading ? 'Creating account…' : 'Create free account'}
              </button>
            </form>

            <div className="relative flex items-center py-5">
              <div className="flex-grow border-t border-white/10" />
              <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-medium uppercase">
                or
              </span>
              <div className="flex-grow border-t border-white/10" />
            </div>

            <button className="w-full bg-white text-gray-900 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-3 hover:bg-gray-100 transition-all shadow-sm">
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Sign up with Google
            </button>

            <p className="text-center text-xs text-gray-500 leading-relaxed mt-4">
              By signing up you agree to our{' '}
              <a href="#" className="underline hover:text-gray-300">
                Terms
              </a>{' '}
              &amp;{' '}
              <a href="#" className="underline hover:text-gray-300">
                Privacy Policy
              </a>
              .
            </p>

            <div className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-white hover:underline">
                Log in
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

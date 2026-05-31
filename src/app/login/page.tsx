'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-950 overflow-hidden">
      {/* Abstract Background Blur Accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-[80px]" />

      <div className="w-full max-w-md z-10">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-bold text-2xl shadow-lg shadow-emerald-500/10 mb-3">
            AL
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            AeroLedger AI
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            The intelligent reporting suite for accountants & bookkeepers
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
          <h2 className="text-xl font-semibold text-slate-200 mb-6">Welcome Back</h2>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 rounded-xl text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 rounded-xl text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] outline-none transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:scale-100"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-400 border-t border-slate-800/80 pt-6">
            New to AeroLedger?{' '}
            <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              Create a firm account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

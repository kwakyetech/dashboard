'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, Shield, Sparkles, UploadCloud } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent blur-[120px] pointer-events-none rounded-full" />
      
      {/* Header / Navbar */}
      <header className="max-w-7xl w-full mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-900 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-extrabold text-lg shadow-lg shadow-emerald-500/10">
            AL
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            AeroLedger AI
          </span>
        </div>

        <nav className="flex items-center gap-4">
          {user ? (
            <Link
              href="/companies"
              className="py-2.5 px-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98]"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-400 hover:text-slate-100 transition-colors px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="py-2.5 px-5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-sm font-semibold text-slate-200 transition-all"
              >
                Register Firm
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl w-full mx-auto px-6 py-20 md:py-32 flex flex-col items-center justify-center text-center z-10 flex-1">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Claude 3.5 Sonnet
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] bg-gradient-to-b from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
          AI-Powered Financial Insights For Accountants
        </h1>

        <p className="text-base md:text-xl text-slate-400 max-w-2xl mt-6 leading-relaxed">
          Simplify client reporting. Upload transaction CSVs, auto-categorize data with Claude, and generate visual, boardroom-ready dashboards and statements instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10 w-full sm:w-auto">
          {user ? (
            <Link
              href="/companies"
              className="w-full sm:w-56 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              Access Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="w-full sm:w-56 py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-56 py-3.5 px-6 bg-slate-900/60 backdrop-blur-md hover:bg-slate-900 border border-slate-800 rounded-xl font-semibold text-slate-300 hover:text-white transition-all flex items-center justify-center"
              >
                Sign In to Firm
              </Link>
            </>
          )}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mt-24 border-t border-slate-900 pt-16">
          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl text-left">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl inline-block mb-4">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-lg">Smart Ingestion</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Drag and drop transaction CSVs or Excel spreadsheets. Simple matching map processes headers instantly.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl text-left">
            <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl inline-block mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-lg">AI Categorization</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Claude Sonnet auto-categorizes bookkeeping line items in seconds. Review, override, and refine manually.
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 p-6 rounded-2xl text-left">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl inline-block mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-200 text-lg">Intelligent Dashboards</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Interactive visualizations and trend analyses for your clients. Seamlessly export summaries to PDF reports.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500 z-10">
        <p>© 2026 AeroLedger AI. All rights reserved. Designed for accounting firms & CPA professionals.</p>
      </footer>
    </div>
  );
}

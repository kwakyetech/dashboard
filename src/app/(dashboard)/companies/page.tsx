'use client';

import React, { useState } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';
import { Building2, Plus, Trash2, ArrowRight, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function CompaniesPage() {
  const { user } = useAuth();
  const { companies, activeCompany, selectCompany, createCompany, deleteCompany } = useCompany();
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role === 'CLIENT') {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Access Denied</h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Client viewers do not have permission to manage the firm company portfolio.
        </p>
      </div>
    );
  }
  
  // State for delete confirmations
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Company name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await createCompany(name, taxId, currency);
      if (res.success) {
        setName('');
        setTaxId('');
        setCurrency('GHS');
      } else {
        setError(res.error || 'Failed to create company');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteCompany(id);
      if (res.success) {
        setConfirmDeleteId(null);
      } else {
        alert(res.error || 'Failed to delete company');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Client Companies
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Manage your accounting firm's portfolio of client companies
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Add Company Form */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            Add Client Company
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Company Name
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 rounded-xl text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="taxId" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Tax ID / EIN (Optional)
              </label>
              <input
                id="taxId"
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. XX-XXXXXXX"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 rounded-xl text-slate-100 placeholder-slate-600 outline-none transition-all"
              />
            </div>

            <div>
              <label htmlFor="baseCurrency" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Base Currency *
              </label>
              <select
                id="baseCurrency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 rounded-xl text-slate-100 outline-none transition-all cursor-not-allowed opacity-70"
                disabled
              >
                <option value="GHS">GHS (₵)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/10 active:scale-[0.98] outline-none transition-all flex justify-center items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Adding Company...</span>
                </>
              ) : (
                <span>Add Client</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Companies List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">
              Active Portfolio ({companies.length})
            </h2>
          </div>

          {companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <Building2 className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">No client companies added yet</p>
              <p className="text-xs text-slate-600 mt-1">Use the form on the left to add your first client</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companies.map((c) => {
                const isActive = activeCompany?.id === c.id;
                const isConfirming = confirmDeleteId === c.id;

                return (
                  <div
                    key={c.id}
                    className={`relative border rounded-2xl p-5 transition-all flex flex-col justify-between h-44 ${
                      isActive
                        ? 'border-emerald-500/40 bg-emerald-500/[0.02] shadow-emerald-950/20 shadow-lg'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 pr-6">
                          <h3 className="font-semibold text-slate-100 text-base line-clamp-1 leading-snug">
                            {c.name}
                          </h3>
                          {c.taxId && (
                            <p className="text-xs text-slate-500 font-medium">Tax ID: {c.taxId}</p>
                          )}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-[10px] font-bold text-slate-400">
                              Base: {c.currency || 'GHS'}
                            </span>
                          </div>
                        </div>
                        
                        {!isConfirming && (
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all absolute top-4 right-4"
                            title="Delete Company"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isConfirming ? (
                      <div className="bg-red-950/30 border border-red-900/50 p-2.5 rounded-xl flex items-center justify-between text-xs mt-3">
                        <span className="text-red-400 font-medium flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          Confirm Delete?
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => selectCompany(c.id)}
                          className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {isActive ? 'Active Client' : 'Select Client'}
                        </button>
                        
                        {isActive ? (
                          <Link
                            href={`/companies/${c.id}/dashboard`}
                            className="py-2 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                          >
                            Go
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <button
                            onClick={() => {
                              selectCompany(c.id);
                            }}
                            className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs flex items-center gap-1 transition-all"
                          >
                            Select & Go
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

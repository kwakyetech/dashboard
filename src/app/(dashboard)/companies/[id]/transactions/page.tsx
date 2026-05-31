'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/format';
import { 
  UploadCloud, 
  Search, 
  Filter, 
  Calendar, 
  Sparkles, 
  Check, 
  AlertCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
  Plus,
  X,
  Trash2
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: string;
  type: 'income' | 'expense';
  category: string;
  categoryAiGenerated: boolean;
  notes: string | null;
}

const CATEGORIES = [
  'consulting',
  'travel',
  'supplies',
  'utilities',
  'payroll',
  'tax',
  'equipment',
  'marketing',
  'legal',
  'insurance',
  'rent',
  'maintenance',
  'meals',
  'other'
];

const getCurrencySymbol = (code: string) => {
  const symbols: Record<string, string> = {
    GHS: '₵',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'A$',
  };
  return symbols[code.toUpperCase()] || code;
};

export default function TransactionsPage() {
  const { id: companyId } = useParams();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Manual Add Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [addDesc, setAddDesc] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addType, setAddType] = useState('expense');
  const [addCategory, setAddCategory] = useState('other');
  const [addNotes, setAddNotes] = useState('');
  const [addCurrency, setAddCurrency] = useState('GHS');
  const [addExchangeRate, setAddExchangeRate] = useState('1.0');
  const [adding, setAdding] = useState(false);
  const [fetchingRate, setFetchingRate] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [type, setType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');



  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category !== 'all') params.append('category', category);
      if (type !== 'all') params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/companies/${companyId}/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred loading transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchTransactions();
    }
  }, [companyId, category, type, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  // Category manual override
  const handleCategoryChange = async (transactionId: string, newCategory: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/transactions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, category: newCategory }),
      });

      if (res.ok) {
        const data = await res.json();
        setTransactions((prev) =>
          prev.map((t) => (t.id === transactionId ? data.transaction : t))
        );
      } else {
        alert('Failed to update category');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/companies/${companyId}/transactions?transactionId=${transactionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete transaction');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting transaction');
    }
  };

  // Manual Transaction submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDate || !addDesc || !addAmount || !addType || !addCategory) {
      alert('Please fill in all required fields');
      return;
    }

    setAdding(true);
    setError(null);
    setUploadSuccess(null);

    const originalAmountNum = parseFloat(addAmount);
    const exchangeRateNum = parseFloat(addExchangeRate) || 1.0;
    const convertedAmount = originalAmountNum * exchangeRateNum;

    try {
      const res = await fetch(`/api/companies/${companyId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: addDate,
          description: addDesc,
          amount: convertedAmount,
          originalAmount: originalAmountNum,
          currency: addCurrency,
          exchangeRate: exchangeRateNum,
          type: addType,
          category: addCategory,
          notes: addNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Prepend new transaction to list
        setTransactions((prev) => [data.transaction, ...prev]);
        setUploadSuccess('Manual transaction added successfully.');
        
        // Reset form & Close modal
        setAddDesc('');
        setAddAmount('');
        setAddCategory('other');
        setAddNotes('');
        setAddCurrency('GHS');
        setAddExchangeRate('1.0');
        setAddDate(new Date().toISOString().split('T')[0]);
        setShowAddModal(false);
      } else {
        setError(data.error || 'Failed to add manual transaction');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error adding transaction');
    } finally {
      setAdding(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/companies/${companyId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setUploadSuccess(`Successfully ingested and AI-categorized ${data.inserted} transactions.`);
        fetchTransactions();
      } else {
        setError(data.error || 'Failed to upload CSV');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error uploading file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Transaction Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Ingest and review transaction logs for <span className="text-emerald-400 font-semibold">{activeCompany?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          {!isClient && (
            <button
              onClick={() => {
                setAddCurrency(activeCompany?.currency || 'GHS');
                setAddExchangeRate('1.0');
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>
          )}

          <button
            onClick={fetchTransactions}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-slate-100 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Reload Ledger
          </button>
        </div>
      </div>

      {/* CSV Uploader */}
      {!isClient && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-900/10 ${
            dragActive 
              ? 'border-emerald-500 bg-emerald-500/[0.02]' 
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl mb-4 text-emerald-400">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="font-semibold text-slate-200">Import Client CSV Statement</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-normal">
            Drag & drop your CSV file here, or{' '}
            <label htmlFor="csv-file-input" className="text-emerald-400 hover:underline cursor-pointer font-medium">
              browse local files
            </label>. Date, Description, and Amount columns are automatically matched.
          </p>

          <div className="flex items-center gap-6 text-[10px] uppercase font-bold tracking-widest text-slate-500 border-t border-slate-900 pt-3.5 w-full max-w-md justify-center">
            <span>Date</span>
            <span className="text-slate-700">•</span>
            <span>Description</span>
            <span className="text-slate-700">•</span>
            <span>Amount</span>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-emerald-500 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-emerald-400">Claude is categorizing transactions...</p>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/60 text-red-400 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-400 text-sm flex items-center gap-2.5">
          <Check className="w-5 h-5 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search descriptions..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-sm text-slate-200 outline-none transition-all placeholder-slate-600"
            />
          </div>
          
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-4 items-center border-t border-slate-850 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters:
          </div>

          {/* Type filter */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
          >
            <option value="all">All Types</option>
            <option value="income">Income Only</option>
            <option value="expense">Expenses Only</option>
          </select>

          {/* Category filter */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none capitalize"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Start Date */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-300 text-xs w-24"
              title="Start Date"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-300 text-xs w-24"
              title="End Date"
            />
          </div>

          {/* Clear Filters */}
          {(search || category !== 'all' || type !== 'all' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearch('');
                setCategory('all');
                setType('all');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors py-2 px-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading ledger records...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <p className="text-slate-400 font-medium">No transactions found</p>
            <p className="text-xs text-slate-600 mt-1">Try resetting filters or import a new bank statement CSV above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Category</th>
                  {!isClient && <th className="py-4 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/30 transition-colors">
                    {/* Date */}
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-medium">
                      {new Date(tx.date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    
                    {/* Description */}
                    <td className="py-4 px-6 text-sm font-semibold text-slate-100 max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>

                    {/* Type */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {tx.type === 'income' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/5 border border-emerald-500/10 uppercase">
                          <TrendingUp className="w-3 h-3" />
                          Income
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 px-2 py-0.5 rounded bg-red-500/5 border border-red-500/10 uppercase">
                          <TrendingDown className="w-3 h-3" />
                          Expense
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-6 whitespace-nowrap text-sm font-bold">
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, activeCompany?.currency || 'GHS')}
                    </td>

                    {/* Category (Static display) */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 capitalize">
                          {tx.category}
                        </span>

                        {tx.categoryAiGenerated && (
                          <span 
                            className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 rounded-full px-2 py-0.5 inline-flex items-center gap-1"
                            title="Automatically categorized by Claude Sonnet"
                          >
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            AI
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions (Delete action for staff/admins) */}
                    {!isClient && (
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-colors"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Add Individual Transaction
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Type *
                  </label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none"
                  >
                    <option value="expense">Expense (-)</option>
                    <option value="income">Income (+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Cloud Invoice"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Amount ({getCurrencySymbol(addCurrency)}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none capitalize"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>



              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Memo / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add details, receipt references or audit trails..."
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:scale-100"
                >
                  {adding ? (
                    <>
                      <div className="w-3.5 h-3.5 border-t border-slate-950 rounded-full animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Transaction</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

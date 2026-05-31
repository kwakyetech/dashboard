'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/format';
import { 
  PiggyBank, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Loader2
} from 'lucide-react';

interface CategoryBudget {
  id?: string;
  category: string;
  amount: number;
  spent: number;
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

export default function BudgetsPage() {
  const { id: companyId } = useParams();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [allSpent, setAllSpent] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Quick edit state for budget amounts
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});

  const fetchBudgets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/budgets?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setAllSpent(data.allSpent || {});
        
        // Map all categories, combining fetched budgets and spent details
        const mappedBudgets = CATEGORIES.map((cat) => {
          const existing = data.budgets.find((b: any) => b.category === cat);
          return {
            id: existing?.id,
            category: cat,
            amount: existing?.amount || 0,
            spent: data.allSpent[cat] || 0,
          };
        });
        
        setBudgets(mappedBudgets);

        // Prepopulate edit inputs
        const initialEdits: Record<string, string> = {};
        mappedBudgets.forEach((b) => {
          initialEdits[b.category] = b.amount > 0 ? String(b.amount) : '';
        });
        setEditAmounts(initialEdits);
      } else {
        setError('Failed to fetch budgets list.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred loading budgets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchBudgets();
    }
  }, [companyId, year, month]);

  const handleMonthChange = (direction: 'next' | 'prev') => {
    if (direction === 'prev') {
      if (month === 1) {
        setMonth(12);
        setYear((y) => y - 1);
      } else {
        setMonth((m) => m - 1);
      }
    } else {
      if (month === 12) {
        setMonth(1);
        setYear((y) => y + 1);
      } else {
        setMonth((m) => m + 1);
      }
    }
  };

  const handleSaveBudget = async (category: string) => {
    if (isClient) return;
    const value = editAmounts[category];
    const amountNum = value.trim() === '' ? 0 : parseFloat(value);
    
    if (isNaN(amountNum) || amountNum < 0) {
      alert('Please enter a valid positive number');
      return;
    }

    setSavingCategory(category);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/companies/${companyId}/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          amount: amountNum,
          year,
          month,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBudgets((prev) =>
          prev.map((b) =>
            b.category === category
              ? { ...b, id: data.budget.id, amount: amountNum }
              : b
          )
        );
        setSuccess(`Budget updated for ${category}.`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update budget limit.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error updating budget.');
    } finally {
      setSavingCategory(null);
    }
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
  };

  // Math helper
  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Expense Budgets
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Establish financial controls and trace budget variances for <span className="text-emerald-400 font-semibold">{activeCompany?.name}</span>
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 self-start">
          <button 
            onClick={() => handleMonthChange('prev')}
            className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="text-xs font-bold text-slate-200 uppercase min-w-32 text-center select-none flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            {getMonthName(month)} {year}
          </span>

          <button 
            onClick={() => handleMonthChange('next')}
            className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/60 text-red-400 text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-400 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Overall Variance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Monthly Budget</p>
          <p className="text-2xl font-extrabold text-slate-200 mt-2">{formatCurrency(totalBudgeted, activeCompany?.currency || 'GHS')}</p>
          <p className="text-[10px] text-slate-500 mt-1">Aggregated target expenditure limit</p>
        </div>
        
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Outflow (Actual Spent)</p>
          <p className="text-2xl font-extrabold text-slate-200 mt-2">{formatCurrency(totalSpent, activeCompany?.currency || 'GHS')}</p>
          <p className="text-[10px] text-slate-500 mt-1">Total expenses recorded in ledger</p>
        </div>

        <div className={`border rounded-2xl p-5 shadow-lg ${
          totalBudgeted > 0 && totalSpent > totalBudgeted 
            ? 'bg-red-950/10 border-red-900/50' 
            : 'bg-slate-900/40 border-slate-800'
        }`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remaining Buffer / Deficit</p>
          <p className={`text-2xl font-extrabold mt-2 ${
            totalBudgeted > 0 && totalSpent > totalBudgeted 
              ? 'text-red-400' 
              : totalBudgeted > 0 
                ? 'text-emerald-400' 
                : 'text-slate-300'
          }`}>
            {totalBudgeted > 0 
              ? `${totalSpent > totalBudgeted ? '-' : ''}${formatCurrency(Math.abs(totalBudgeted - totalSpent), activeCompany?.currency || 'GHS')}`
              : formatCurrency(0, activeCompany?.currency || 'GHS')
            }
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            {totalBudgeted > 0 && totalSpent > totalBudgeted 
              ? 'Aggregate budget limit breached!' 
              : 'Remaining cushion under budget'}
          </p>
        </div>
      </div>

      {/* Budgets Table list */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading monthly budget matrices...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6 w-1/4">Category</th>
                  <th className="py-4 px-6 w-1/4">Monthly Budget Limit</th>
                  <th className="py-4 px-6 w-1/4">Actual Outflow</th>
                  <th className="py-4 px-6 w-1/4">Variance & Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {budgets.map((b) => {
                  const percent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
                  const isBreached = b.amount > 0 && b.spent > b.amount;
                  const isWarning = b.amount > 0 && b.spent > b.amount * 0.9 && b.spent <= b.amount;
                  
                  return (
                    <tr key={b.category} className="hover:bg-slate-900/20 transition-colors">
                      {/* Category Name */}
                      <td className="py-5 px-6 whitespace-nowrap text-sm font-semibold text-slate-200 capitalize">
                        {b.category}
                      </td>

                      {/* Budget Input / Label */}
                      <td className="py-5 px-6 whitespace-nowrap text-sm">
                        {isClient ? (
                          <span className="font-semibold text-slate-400">
                            {b.amount > 0 ? formatCurrency(b.amount, activeCompany?.currency || 'GHS') : 'No budget set'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">
                                ₵
                              </span>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={editAmounts[b.category] ?? ''}
                                onChange={(e) => setEditAmounts({ ...editAmounts, [b.category]: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500/50 rounded-lg pl-6 pr-2.5 py-1.5 text-xs text-slate-200 outline-none"
                              />
                            </div>
                            <button
                              onClick={() => handleSaveBudget(b.category)}
                              disabled={savingCategory === b.category}
                              className="p-2 bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 rounded-lg border border-slate-800 hover:border-transparent transition-all shrink-0"
                              title="Save budget limit"
                            >
                              {savingCategory === b.category ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actual Outflow */}
                      <td className="py-5 px-6 whitespace-nowrap text-sm font-bold text-slate-300">
                        {formatCurrency(b.spent, activeCompany?.currency || 'GHS')}
                      </td>

                      {/* Progress Variance Bar */}
                      <td className="py-5 px-6">
                        <div className="space-y-1.5 max-w-xs">
                          {b.amount > 0 ? (
                            <>
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className={
                                  isBreached ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-500'
                                }>
                                  {isBreached ? 'Breached' : isWarning ? 'Warning 90%+' : 'Within Limit'}
                                </span>
                                <span className="text-slate-400">{percent.toFixed(0)}%</span>
                              </div>

                              {/* Progress bar background */}
                              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isBreached 
                                      ? 'bg-gradient-to-r from-red-600 to-red-400' 
                                      : isWarning 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-300' 
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  }`}
                                  style={{ width: `${Math.min(percent, 100)}%` }}
                                />
                              </div>

                              <div className="flex justify-between text-[9px] text-slate-500">
                                <span>Remain: {formatCurrency(b.amount - b.spent, activeCompany?.currency || 'GHS')}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Configure limit to view analytics</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

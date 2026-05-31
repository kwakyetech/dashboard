'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCompany } from '@/context/CompanyContext';
import { formatCurrency } from '@/lib/format';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  PieChart as PieIcon, 
  Calendar,
  Download,
  AlertCircle,
  PiggyBank
} from 'lucide-react';

const COLORS = [
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', 
  '#f43f5e', '#ef4444', '#f97316', '#eab308'
];

export default function DashboardPage() {
  const { id: companyId } = useParams();
  const { activeCompany } = useCompany();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0 },
    expenseBreakdown: [],
    monthlyTrends: [],
  });
  const [budgets, setBudgets] = useState<any[]>([]);

  // Range selection presets: 'ytd', 'month', 'quarter', 'custom'
  const [preset, setPreset] = useState('ytd');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Use state to prevent Recharts SSR hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateDatesForPreset = (selectedPreset: string) => {
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    if (selectedPreset === 'ytd') {
      start = `${now.getFullYear()}-01-01`;
    } else if (selectedPreset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      start = monthStart.toISOString().split('T')[0];
    } else if (selectedPreset === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      start = quarterStart.toISOString().split('T')[0];
    }

    return { start, end };
  };

  const fetchBudgets = async () => {
    try {
      const now = new Date();
      const res = await fetch(`/api/companies/${companyId}/budgets?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      if (res.ok) {
        const json = await res.json();
        setBudgets(json.budgets.filter((b: any) => b.amount > 0));
      }
    } catch (err) {
      console.error('Error fetching budgets for dashboard:', err);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/companies/${companyId}/dashboard?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      await fetchBudgets();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger when preset, dates, or company ID changes
  useEffect(() => {
    if (companyId) {
      if (preset !== 'custom') {
        const { start, end } = calculateDatesForPreset(preset);
        setStartDate(start);
        setEndDate(end);
      } else {
        fetchMetrics();
      }
    }
  }, [companyId, preset]);

  useEffect(() => {
    if (companyId && (preset !== 'custom' || (startDate && endDate))) {
      fetchMetrics();
    }
  }, [startDate, endDate]);

  // Export current list to CSV
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/companies/${companyId}/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions for export');
      
      const json = await res.json();
      const txs = json.transactions;

      if (!txs || txs.length === 0) {
        alert('No transactions found in the selected date range to export.');
        return;
      }

      // Convert JSON array to CSV format
      const csvHeaders = ['Date', 'Description', 'Type', 'Amount', 'Category', 'Notes'];
      const csvRows = [csvHeaders.join(',')];

      for (const t of txs) {
        const row = [
          new Date(t.date).toLocaleDateString().replace(/,/g, ''),
          `"${t.description.replace(/"/g, '""')}"`,
          t.type,
          t.amount,
          t.category,
          `"${(t.notes || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${activeCompany?.name}_transactions_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Error exporting CSV log file.');
    }
  };

  if (!mounted) return null;

  const totalIncome = data.summary?.totalIncome || 0;
  const totalExpenses = data.summary?.totalExpenses || 0;
  const netProfit = data.summary?.netProfit || 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top bar with Switcher/Dates */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            {activeCompany?.name} Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Overview of client financial metrics, category weights, and monthly performance.
          </p>
        </div>

        {/* Date Filters & Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-2 border border-slate-800 rounded-2xl self-start">
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-850">
            <button
              onClick={() => setPreset('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                preset === 'month' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setPreset('quarter')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                preset === 'quarter' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quarter
            </button>
            <button
              onClick={() => setPreset('ytd')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                preset === 'ytd' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              YTD
            </button>
            <button
              onClick={() => setPreset('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                preset === 'custom' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Custom
            </button>
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 outline-none w-32"
                title="Start Date"
              />
              <span className="text-slate-500 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 outline-none w-32"
                title="End Date"
              />
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            title="Download CSV log"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2">
          <div className="w-10 h-10 border-t-2 border-emerald-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Aggregating visual ledger analytics...</p>
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Income */}
            <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Income</span>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl md:text-3xl font-extrabold text-slate-100">
                  {formatCurrency(totalIncome, activeCompany?.currency || 'GHS')}
                </span>
                <p className="text-[10px] text-emerald-400/80 font-medium mt-1">Receipt entries recorded in period</p>
              </div>
            </div>
 
            {/* Total Expenses */}
            <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Expenses</span>
                <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                  <TrendingDown className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl md:text-3xl font-extrabold text-slate-100">
                  {formatCurrency(totalExpenses, activeCompany?.currency || 'GHS')}
                </span>
                <p className="text-[10px] text-red-400/80 font-medium mt-1">Cash outflows parsed in period</p>
              </div>
            </div>
 
            {/* Net Profit */}
            <div className={`relative overflow-hidden bg-slate-900/40 backdrop-blur-xl border rounded-2xl p-6 shadow-md ${
              netProfit >= 0 ? 'border-emerald-500/25 bg-emerald-500/[0.005]' : 'border-red-500/25 bg-red-500/[0.005]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Profit / Loss</span>
                <div className={`p-2 rounded-xl border ${
                  netProfit >= 0 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className={`text-2xl md:text-3xl font-extrabold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(netProfit, activeCompany?.currency || 'GHS')}
                </span>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Retained profit margin index</p>
              </div>
            </div>
          </div>

          {/* Budget Watchlist Alerts & Progress */}
          {budgets.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <PiggyBank className="w-4.5 h-4.5 text-emerald-400" />
                Budget Variance Watchlist (Current Month)
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgets.map((b) => {
                  const percent = b.amount > 0 ? (b.spent / b.amount) * 100 : 0;
                  const isBreached = b.spent > b.amount;
                  const isWarning = b.spent > b.amount * 0.9 && b.spent <= b.amount;

                  return (
                    <div key={b.category} className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 capitalize">{b.category}</span>
                        {isBreached ? (
                          <span className="text-[9px] text-red-400 font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 animate-pulse uppercase">
                            Breached
                          </span>
                        ) : isWarning ? (
                          <span className="text-[9px] text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 uppercase">
                            Warning 90%+
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase">
                            Healthy
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>Spent: {formatCurrency(b.spent, activeCompany?.currency || 'GHS')}</span>
                          <span>Limit: {formatCurrency(b.amount, activeCompany?.currency || 'GHS')}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Income vs Expenses trend line/bar */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-base font-semibold text-slate-200 mb-6 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-400" />
                Performance Trend (Income vs Expense)
              </h2>

              {data.monthlyTrends.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-xl bg-slate-950/20">
                  <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                  <span className="text-xs text-slate-500">No monthly trends data available for selected range</span>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.monthlyTrends}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} 
                        labelStyle={{ fontWeight: 'bold', color: '#f8fafc' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar name="Income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar name="Expense" dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Expense breakdown pie chart */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
              <h2 className="text-base font-semibold text-slate-200 mb-6 flex items-center gap-2">
                <PieIcon className="w-4.5 h-4.5 text-emerald-400" />
                Expense Breakdown
              </h2>

              {data.expenseBreakdown.length === 0 ? (
                <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-xl bg-slate-950/20">
                  <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                  <span className="text-xs text-slate-500">No expense records found to allocate</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between">
                  <div className="h-[180px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {data.expenseBreakdown.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [formatCurrency(Number(value || 0), activeCompany?.currency || 'GHS'), 'Total Cost']}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Net Label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Allocated</span>
                      <span className="text-sm font-extrabold text-slate-200">
                        {formatCurrency(totalExpenses, activeCompany?.currency || 'GHS')}
                      </span>
                    </div>
                  </div>

                  {/* List of top categories */}
                  <div className="space-y-2 mt-4 max-h-[140px] overflow-y-auto pr-1">
                    {data.expenseBreakdown.slice(0, 5).map((entry: any, idx: number) => {
                      const percentage = totalExpenses > 0 ? ((entry.value / totalExpenses) * 100).toFixed(0) : 0;
                      return (
                        <div key={entry.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                            <span className="capitalize truncate text-slate-400 font-medium">{entry.name}</span>
                          </div>
                          <div className="flex gap-2 shrink-0 font-semibold">
                            <span className="text-slate-300">{formatCurrency(entry.value, activeCompany?.currency || 'GHS')}</span>
                            <span className="text-slate-500 font-normal">({percentage}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

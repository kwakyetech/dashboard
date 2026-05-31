'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/format';
import { 
  FileSpreadsheet, 
  Sparkles, 
  History, 
  Printer, 
  Calendar,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Percent
} from 'lucide-react';

interface ReportHistoryItem {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  summary: string;
}

export default function ReportsPage() {
  const { id: companyId } = useParams();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';

  const [reportsList, setReportsList] = useState<ReportHistoryItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [reportType, setReportType] = useState('income_statement');
  const [datePreset, setDatePreset] = useState('ytd');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const calculateDates = (preset: string) => {
    const now = new Date();
    let start = '';
    let end = now.toISOString().split('T')[0];

    if (preset === 'ytd') {
      start = `${now.getFullYear()}-01-01`;
    } else if (preset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      start = monthStart.toISOString().split('T')[0];
    } else if (preset === 'quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      start = quarterStart.toISOString().split('T')[0];
    }

    return { start, end };
  };

  useEffect(() => {
    if (datePreset !== 'custom') {
      const { start, end } = calculateDates(datePreset);
      setStartDate(start);
      setEndDate(end);
    }
  }, [datePreset]);

  // Fetch reports list
  const fetchReportsList = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/reports`);
      if (res.ok) {
        const data = await res.json();
        setReportsList(data.reports);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchReportsList();
      setSelectedReport(null);
    }
  }, [companyId]);

  // Load specific report
  const handleLoadReport = async (reportId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/reports/${reportId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data.report);
      } else {
        setError('Failed to fetch report details.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred loading report details.');
    } finally {
      setLoading(false);
    }
  };

  // Generate new report
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      return;
    }

    setGenerating(true);
    setError(null);
    setSelectedReport(null);

    try {
      const res = await fetch(`/api/companies/${companyId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          startDate,
          endDate,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSelectedReport(data.report);
        fetchReportsList(); // refresh list
      } else {
        setError(data.error || 'Failed to generate financial report.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error generating report.');
    } finally {
      setGenerating(false);
    }
  };

  // Format printable stylesheet trigger
  const handlePrint = () => {
    window.print();
  };

  const getReportName = (type: string) => {
    if (type === 'income_statement') return 'Income Statement';
    if (type === 'balance_sheet') return 'Balance Sheet';
    if (type === 'cash_flow') return 'Cash Flow';
    if (type === 'shareholders_equity') return "Statement of Shareholders' Equity";
    return 'Financial Report';
  };

  const parsedContent = selectedReport ? (selectedReport.content as any) : null;
  const statement = parsedContent?.statement;
  const insights = parsedContent?.insights || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto print:p-0 print:bg-white print:text-black">
      {/* Header (Hidden when printing) */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            AI Financial Reports
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Generate and export professional statements backed by Claude Sonnet insights
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Column: Report Builder & History (Hidden when printing) */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          {/* Builder Form */}
          {!isClient && (
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-lg">
              <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Configure Statement
              </h2>

              <form onSubmit={handleGenerateReport} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                  >
                    <option value="income_statement">Income Statement</option>
                    <option value="balance_sheet">Balance Sheet</option>
                    <option value="cash_flow">Cash Flow</option>
                    <option value="shareholders_equity">Statement of Shareholders' Equity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Range Preset
                  </label>
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                  >
                    <option value="ytd">Year-to-Date</option>
                    <option value="quarter">This Quarter</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Dates</option>
                  </select>
                </div>

                {datePreset === 'custom' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/10 active:scale-[0.98] outline-none transition-all flex justify-center items-center gap-2 text-xs"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin h-4.5 w-4.5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* History Panel */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col max-h-[300px]">
            <h2 className="text-sm font-semibold text-slate-200 mb-3.5 flex items-center gap-1.5 shrink-0">
              <History className="w-4 h-4 text-emerald-400" />
              Report History
            </h2>

            {reportsList.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-6 text-center border border-dashed border-slate-850 rounded-xl bg-slate-950/20">
                <span className="text-[11px] text-slate-500 font-medium">No cached reports found</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {reportsList.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleLoadReport(r.id)}
                    className="w-full flex items-center justify-between p-2 hover:bg-slate-850/80 rounded-xl text-left border border-transparent hover:border-slate-800 transition-all text-xs group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-300 group-hover:text-slate-100 truncate capitalize">
                        {r.type.replace('_', ' ')}
                      </p>
                      <p className="text-[9px] text-slate-500 font-medium mt-0.5">
                        {new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Columns: Report Viewer (Takes full width in print mode) */}
        <div className="lg:col-span-3 space-y-6 print:w-full print:max-w-none">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/60 text-red-400 text-sm flex items-center gap-2.5 print:hidden">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {generating && (
            <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl py-24 flex flex-col items-center justify-center gap-3 print:hidden">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-emerald-400">Claude Sonnet is analyzing accounts and drafting insights...</p>
              <p className="text-xs text-slate-500">This can take up to 10 seconds.</p>
            </div>
          )}

          {!selectedReport && !generating && (
            <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl py-24 flex flex-col items-center justify-center text-center px-4 print:hidden">
              <FileSpreadsheet className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">No report generated or loaded</p>
              <p className="text-xs text-slate-600 mt-1">Configure options on the left and click "Generate Report", or load an existing one from the history panel.</p>
            </div>
          )}

          {selectedReport && (
            <div className="space-y-6 print:space-y-8">
              {/* Report Actions (Hidden when printing) */}
              <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-4 rounded-2xl print:hidden">
                <span className="text-xs font-semibold text-slate-400">
                  Generated on {new Date(selectedReport.generatedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-750"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save as PDF
                </button>
              </div>

              {/* Core Printable Sheet Wrapper */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
                {/* Print Title Header */}
                <div className="border-b border-slate-800/80 print:border-slate-300 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 print:text-emerald-600">Financial Statement</span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100 print:text-black mt-1">
                      {getReportName(selectedReport.type)}
                    </h2>
                    <p className="text-sm font-semibold text-slate-400 print:text-slate-600 mt-1.5 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span>
                        For the period starting {new Date(selectedReport.startDate).toLocaleDateString()} to {new Date(selectedReport.endDate).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <h3 className="font-extrabold text-base text-slate-300 print:text-black leading-tight">
                      {activeCompany?.name}
                    </h3>
                    {activeCompany?.taxId && (
                      <p className="text-xs text-slate-500 print:text-slate-500 mt-0.5">Tax ID: {activeCompany.taxId}</p>
                    )}
                  </div>
                </div>

                {/* Grid layout for statement & insights */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start print:flex print:flex-col print:gap-8">
                  {/* Ledger Income Statement Table (Takes 3/5 cols) */}
                  <div className="xl:col-span-3 space-y-8 print:w-full">
                    {statement ? (
                      <div className="space-y-6">
                        {/* INCOME STATEMENT */}
                        {selectedReport.type === 'income_statement' && (
                          <div className="space-y-6">
                            {/* Revenues section */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Revenues</h4>
                              <div className="space-y-2.5">
                                {Object.entries(statement.income || {}).map(([cat, val]: [string, any]) => (
                                  <div key={cat} className="flex justify-between text-sm">
                                    <span className="capitalize text-slate-400 print:text-slate-600">{cat} Fee Income</span>
                                    <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(val, activeCompany?.currency || 'GHS')}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Total Revenue</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(Number(statement.totals?.totalIncome || 0), activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Operating Expenses section */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Operating Expenses</h4>
                              <div className="space-y-2.5 max-h-[300px] overflow-y-auto print:max-h-none pr-1">
                                {Object.entries(statement.expenses || {}).map(([cat, val]: [string, any]) => (
                                  <div key={cat} className="flex justify-between text-sm">
                                    <span className="capitalize text-slate-400 print:text-slate-600">{cat} Expense</span>
                                    <span className="font-semibold text-slate-300 print:text-slate-850">{formatCurrency(val, activeCompany?.currency || 'GHS')}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Total Operating Expenses</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(Number(statement.totals?.totalExpenses || 0), activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Bottom line net income */}
                            <div className="bg-slate-900/60 border border-slate-800 print:border-slate-300 p-4 rounded-xl print:bg-slate-50 flex justify-between items-center">
                              <span className="text-sm font-extrabold uppercase text-slate-300 print:text-black tracking-wide">Net Income (Profit / Loss)</span>
                              <span className={`text-lg font-black ${
                                Number(statement.totals?.netIncome || 0) >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-red-400 print:text-red-700'
                              }`}>
                                {formatCurrency(Number(statement.totals?.netIncome || 0), activeCompany?.currency || 'GHS')}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* BALANCE SHEET */}
                        {selectedReport.type === 'balance_sheet' && (
                          <div className="space-y-6">
                            {/* Assets section */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Assets</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Cash and Cash Equivalents</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.assets?.cash || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Accounts Receivable</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.assets?.accountsReceivable || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Equipment / Fixed Assets</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.assets?.equipment || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Total Assets</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(statement.assets?.totalAssets || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Liabilities section */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Liabilities</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Accounts Payable</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.liabilities?.accountsPayable || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Credit Card Balance</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.liabilities?.creditCard || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Total Liabilities</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(statement.liabilities?.totalLiabilities || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Equity section */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Equity</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Paid-in Capital</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.equity?.paidInCapital || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Retained Earnings</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.equity?.retainedEarnings || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Total Equity</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(statement.equity?.totalEquity || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Balancing summary */}
                            <div className="bg-slate-900/60 border border-slate-800 print:border-slate-300 p-4 rounded-xl print:bg-slate-50 flex justify-between items-center">
                              <span className="text-sm font-extrabold uppercase text-slate-300 print:text-black tracking-wide">Total Liabilities & Equity</span>
                              <span className="text-lg font-black text-emerald-400 print:text-emerald-700">
                                {formatCurrency((statement.liabilities?.totalLiabilities || 0) + (statement.equity?.totalEquity || 0), activeCompany?.currency || 'GHS')}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* CASH FLOW STATEMENT */}
                        {selectedReport.type === 'cash_flow' && (
                          <div className="space-y-6">
                            {/* Operating activities */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Operating Activities</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Cash Receipts from Customers</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.operating?.receipts || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Cash Payments for Operating Expenses</span>
                                  <span className="font-semibold text-slate-300 print:text-red-700">{formatCurrency(statement.operating?.payments || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Net Cash from Operating Activities</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(statement.operating?.netOperating || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Investing activities */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Investing Activities</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Purchase of Equipment / Fixed Assets</span>
                                  <span className="font-semibold text-slate-300 print:text-red-700">{formatCurrency(statement.investing?.equipment || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Net Cash from Investing Activities</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(statement.investing?.netInvesting || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Financing activities */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Financing Activities</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Net Internal & External Transfers</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.financing?.transfers || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Net Cash from Financing Activities</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(statement.financing?.netFinancing || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reconciliation totals */}
                            <div className="bg-slate-900/60 border border-slate-800 print:border-slate-300 p-4 rounded-xl print:bg-slate-50 space-y-2">
                              <div className="flex justify-between text-xs font-semibold text-slate-400 print:text-slate-600">
                                <span>Beginning Cash Balance</span>
                                <span>{formatCurrency(statement.totals?.beginningCash || 0, activeCompany?.currency || 'GHS')}</span>
                              </div>
                              <div className="flex justify-between text-xs font-semibold text-slate-400 print:text-slate-600">
                                <span>Net Cash Change in Period</span>
                                <span className={Number(statement.totals?.netChange || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                  {formatCurrency(statement.totals?.netChange || 0, activeCompany?.currency || 'GHS')}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm font-extrabold border-t border-slate-800/65 print:border-slate-300 pt-2.5 mt-1.5 text-slate-200 print:text-black">
                                <span>Ending Cash Balance</span>
                                <span className="text-emerald-400 print:text-emerald-700 font-bold">
                                  {formatCurrency(statement.totals?.endingCash || 0, activeCompany?.currency || 'GHS')}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* STATEMENT OF SHAREHOLDERS' EQUITY */}
                        {selectedReport.type === 'shareholders_equity' && (
                          <div className="space-y-6">
                            {/* Beginning Balances */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Beginning Balances</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Paid-in Capital</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.beginning?.paidInCapital || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Retained Earnings</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.beginning?.retainedEarnings || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold border-t border-slate-800/60 print:border-slate-200 pt-2.5 mt-2">
                                  <span className="text-slate-300 print:text-black">Total Beginning Equity</span>
                                  <span className="text-slate-100 print:text-black">{formatCurrency(statement.beginning?.totalEquity || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Changes in Equity */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Changes in Equity (Period Activity)</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Net Income / (Loss)</span>
                                  <span className={`font-semibold ${Number(statement.changes?.netIncome || 0) >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-red-400 print:text-red-700'}`}>{formatCurrency(statement.changes?.netIncome || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Capital Contributions</span>
                                  <span className="font-semibold text-emerald-400 print:text-emerald-700">{formatCurrency(statement.changes?.contributions || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Distributions / Dividends Paid</span>
                                  <span className="font-semibold text-red-400 print:text-red-700">({formatCurrency(statement.changes?.distributions || 0, activeCompany?.currency || 'GHS')})</span>
                                </div>
                              </div>
                            </div>

                            {/* Ending Balances */}
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 print:text-slate-500 border-b border-slate-850 print:border-slate-200 pb-2 mb-3">Ending Balances</h4>
                              <div className="space-y-2.5">
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Ending Paid-in Capital</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.ending?.paidInCapital || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-400 print:text-slate-600">Ending Retained Earnings</span>
                                  <span className="font-semibold text-slate-200 print:text-black">{formatCurrency(statement.ending?.retainedEarnings || 0, activeCompany?.currency || 'GHS')}</span>
                                </div>
                              </div>
                            </div>

                            {/* Total Equity Summary */}
                            <div className="bg-slate-900/60 border border-slate-800 print:border-slate-300 p-4 rounded-xl print:bg-slate-50 flex justify-between items-center">
                              <span className="text-sm font-extrabold uppercase text-slate-300 print:text-black tracking-wide">Total Ending Shareholders' Equity</span>
                              <span className="text-lg font-black text-emerald-400 print:text-emerald-700">
                                {formatCurrency(statement.ending?.totalEquity || 0, activeCompany?.currency || 'GHS')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                        Detailed layout unavailable.
                      </div>
                    )}
                  </div>

                  {/* AI Summaries & Insights (Takes 2/5 cols) */}
                  <div className="xl:col-span-2 space-y-6 print:w-full print:page-break-before">
                    {/* Executive Narrative */}
                    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm print:bg-white print:border-slate-300">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 print:text-emerald-700 flex items-center gap-1.5 mb-4 shrink-0">
                        <Sparkles className="w-4 h-4" />
                        Executive Commentary
                      </h4>
                      <div className="text-xs text-slate-400 print:text-slate-700 space-y-3.5 leading-relaxed">
                        {selectedReport.summary.split('\n\n').map((para: string, idx: number) => (
                          <p key={idx}>{para}</p>
                        ))}
                      </div>
                    </div>

                    {/* Bulleted Insights */}
                    {insights.length > 0 && (
                      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl shadow-sm print:bg-white print:border-slate-300">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200 print:text-black flex items-center gap-1.5 mb-4 shrink-0">
                          <Percent className="w-4 h-4 text-emerald-400" />
                          Key Observations
                        </h4>
                        <ul className="space-y-3 print:space-y-4">
                          {insights.map((insight: string, idx: number) => (
                            <li key={idx} className="flex gap-2 text-xs">
                              <span className="h-4 w-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-slate-400 print:text-slate-700 leading-normal">{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

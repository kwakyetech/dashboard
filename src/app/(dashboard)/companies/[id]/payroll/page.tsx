'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/format';
import { 
  Users, 
  Plus, 
  Trash2, 
  Calendar, 
  Coins, 
  UserPlus, 
  Calculator, 
  CheckCircle2, 
  FileText, 
  TrendingUp, 
  Activity, 
  AlertCircle, 
  Loader2, 
  Lock,
  Pencil
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  role: string;
  baseSalary: string;
  allowances: string;
  ssnitNo: string | null;
  tin: string | null;
}

interface PayrunEntry {
  id: string;
  baseSalary: string;
  allowances: string;
  ssnit: string;
  tax: string;
  netPay: string;
  employee: Employee;
}

interface Payrun {
  id: string;
  year: number;
  month: number;
  status: 'DRAFT' | 'APPROVED';
  totalBase: string;
  totalTax: string;
  totalSsnit: string;
  totalNet: string;
  entries: PayrunEntry[];
}

export default function PayrollPage() {
  const { id: companyId } = useParams();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';

  const [activeTab, setActiveTab] = useState<'payruns' | 'employees'>('payruns');
  
  // Date states
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrun, setPayrun] = useState<Payrun | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add Employee Form States
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [empAllowances, setEmpAllowances] = useState('');
  const [empSsnit, setEmpSsnit] = useState('');
  const [empTin, setEmpTin] = useState('');
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // Fetch all employees
  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/companies/${companyId}/employees`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  // Fetch payrun
  const fetchPayrun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/payroll?year=${year}&month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setPayrun(data.payrun || null);
      } else {
        setPayrun(null);
      }
    } catch (err) {
      console.error('Failed to load payrun:', err);
      setError('An error occurred loading payroll summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchEmployees();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchPayrun();
    }
  }, [companyId, year, month]);

  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName || !empRole || !empSalary) {
      setError('Employee name, role, and base salary are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const isEdit = !!editingEmployeeId;
    const url = `/api/companies/${companyId}/employees`;
    const method = isEdit ? 'PATCH' : 'POST';
    const payload = {
      employeeId: editingEmployeeId,
      name: empName,
      role: empRole,
      baseSalary: empSalary,
      allowances: empAllowances || '0',
      ssnitNo: empSsnit,
      tin: empTin,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        if (isEdit) {
          setSuccess(`Successfully updated employee ${data.employee.name}.`);
          setEmployees((prev) =>
            prev.map((emp) => (emp.id === data.employee.id ? data.employee : emp))
          );
          setEditingEmployeeId(null);
        } else {
          setSuccess(`Successfully added employee ${data.employee.name}.`);
          setEmployees((prev) => [...prev, data.employee]);
        }
        // Reset form
        setEmpName('');
        setEmpRole('');
        setEmpSalary('');
        setEmpAllowances('');
        setEmpSsnit('');
        setEmpTin('');
      } else {
        setError(data.error || `Failed to ${isEdit ? 'update' : 'add'} employee.`);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEmpName(emp.name);
    setEmpRole(emp.role);
    setEmpSalary(Number(emp.baseSalary).toString());
    setEmpAllowances(Number(emp.allowances).toString());
    setEmpSsnit(emp.ssnitNo || '');
    setEmpTin(emp.tin || '');
    setError(null);
    setSuccess(null);
    
    const formElement = document.getElementById('employee-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingEmployeeId(null);
    setEmpName('');
    setEmpRole('');
    setEmpSalary('');
    setEmpAllowances('');
    setEmpSsnit('');
    setEmpTin('');
    setError(null);
    setSuccess(null);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this employee? This will affect future payruns.')) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/companies/${companyId}/employees?employeeId=${employeeId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccess('Employee removed successfully.');
        setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to remove employee.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error removing employee.');
    }
  };

  const handleGeneratePayroll = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/companies/${companyId}/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });

      const data = await res.json();
      if (res.ok) {
        setPayrun(data.payrun);
        setSuccess(`Draft payroll batch generated successfully for ${getMonthName(month)} ${year}.`);
      } else {
        setError(data.error || 'Failed to generate payroll batch.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error generating payroll.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePayroll = async () => {
    if (!confirm('Are you sure you want to approve this payroll? Once approved, it will be locked and posted directly as an expense transaction to the ledger.')) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/companies/${companyId}/payroll`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });

      const data = await res.json();
      if (res.ok) {
        setPayrun(data.payrun);
        setSuccess('Payroll batch approved! Expense transaction successfully posted to the ledger.');
      } else {
        setError(data.error || 'Failed to approve payroll.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error approving payroll.');
    } finally {
      setActionLoading(false);
    }
  };

  const getMonthName = (m: number) => {
    return new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
  };

  const totalGross = payrun 
    ? Number(payrun.totalNet) + Number(payrun.totalTax) + Number(payrun.totalSsnit) 
    : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Payroll Management System
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Calculate deductions, trace tax liabilities, and approve staff payruns for <span className="text-emerald-400 font-semibold">{activeCompany?.name}</span>
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl self-start">
          <button
            onClick={() => { setActiveTab('payruns'); setError(null); setSuccess(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'payruns'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Monthly Payruns
          </button>
          <button
            onClick={() => { setActiveTab('employees'); setError(null); setSuccess(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'employees'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Employee Registry
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/60 text-red-400 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-400 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* MAIN LAYOUT */}
      {activeTab === 'payruns' ? (
        <div className="space-y-6">
          {/* Payrun Header Controls */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none"
              >
                {[year - 2, year - 1, year, year + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {!isClient && (
              <div className="flex items-center gap-3 self-start md:self-auto">
                {(!payrun || payrun.status === 'DRAFT') ? (
                  <>
                    <button
                      onClick={handleGeneratePayroll}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Calculator className="w-3.5 h-3.5" />
                      )}
                      {payrun ? 'Recalculate Draft' : 'Calculate Monthly Pay'}
                    </button>
                    
                    {payrun && (
                      <button
                        onClick={handleApprovePayroll}
                        disabled={actionLoading}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {actionLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve & Post Ledger
                      </button>
                    )}
                  </>
                ) : (
                  <span className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Payroll Approved & Locked
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Payrun stats summary cards */}
          {payrun && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Gross Salary</p>
                <p className="text-2xl font-extrabold text-slate-200 mt-2">{formatCurrency(totalGross)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Sum of Base + Allowances</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total PAYE Income Tax</p>
                <p className="text-2xl font-extrabold text-red-400 mt-2">{formatCurrency(payrun.totalTax)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Total income tax withheld</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Employee SSNIT</p>
                <p className="text-2xl font-extrabold text-amber-400 mt-2">{formatCurrency(payrun.totalSsnit)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Withheld SSNIT trust contributions</p>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Net Salary</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-2">{formatCurrency(payrun.totalNet)}</p>
                <p className="text-[10px] text-slate-500 mt-1">Net actual payout to employees</p>
              </div>
            </div>
          )}

          {/* Payrun Details Table */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Loading payroll details...</p>
              </div>
            ) : !payrun ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <Coins className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-slate-400 font-semibold">No payrun calculated yet</p>
                <p className="text-xs text-slate-600 mt-1">Select month and click "Calculate Monthly Pay" above to generate a draft payslip batch</p>
              </div>
            ) : (
              <div>
                <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/40 flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">DEDUCTION ENGINE STATUS:</span>
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                      payrun.status === 'APPROVED' 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                    }`}>
                      {payrun.status}
                    </span>
                  </div>
                  {payrun.status === 'DRAFT' && (
                    <span className="text-[10px] text-slate-400 italic">
                      Approval will automatically post a GH₵{totalGross.toFixed(2)} expense transaction under the category 'payroll'.
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-4 px-6">Employee</th>
                        <th className="py-4 px-6">Role</th>
                        <th className="py-4 px-6">Base Salary</th>
                        <th className="py-4 px-6">Allowances</th>
                        <th className="py-4 px-6">SSNIT (5.5%)</th>
                        <th className="py-4 px-6">PAYE Tax</th>
                        <th className="py-4 px-6">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {(payrun.entries || []).map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="py-4 px-6 font-semibold text-slate-200">
                            {entry.employee?.name || 'Removed Employee'}
                          </td>
                          <td className="py-4 px-6 text-slate-400 capitalize">
                            {entry.employee?.role || 'Staff'}
                          </td>
                          <td className="py-4 px-6 font-medium">
                            {formatCurrency(entry.baseSalary)}
                          </td>
                          <td className="py-4 px-6 font-medium text-emerald-400/80">
                            {Number(entry.allowances) > 0 ? `+${formatCurrency(entry.allowances)}` : '-'}
                          </td>
                          <td className="py-4 px-6 font-medium text-amber-400/80">
                            {formatCurrency(entry.ssnit)}
                          </td>
                          <td className="py-4 px-6 font-medium text-red-400/80">
                            {formatCurrency(entry.tax)}
                          </td>
                          <td className="py-4 px-6 font-bold text-emerald-400">
                            {formatCurrency(entry.netPay)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Employees Registry Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left: Add Employee form */}
          {!isClient && (
            <div id="employee-form-container" className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
                {editingEmployeeId ? (
                  <Pencil className="w-5 h-5 text-emerald-400" />
                ) : (
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                )}
                {editingEmployeeId ? 'Edit Employee Details' : 'Add Employee'}
              </h2>

              <form onSubmit={handleSubmitEmployee} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Ama Serwaa"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Job Role / Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    placeholder="e.g. Sales Executive"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Base Salary (₵) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={empSalary}
                      onChange={(e) => setEmpSalary(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Allowances (₵)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={empAllowances}
                      onChange={(e) => setEmpAllowances(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    SSNIT ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={empSsnit}
                    onChange={(e) => setEmpSsnit(e.target.value)}
                    placeholder="e.g. C012345678901"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    TIN / Tax Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={empTin}
                    onChange={(e) => setEmpTin(e.target.value)}
                    placeholder="e.g. GHA-987654321-0"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/10 active:scale-[0.98] outline-none transition-all flex justify-center items-center gap-2 text-xs"
                  >
                    {submitting ? (
                      editingEmployeeId ? 'Updating...' : 'Registering...'
                    ) : (
                      editingEmployeeId ? 'Update Employee' : 'Register Employee'
                    )}
                  </button>

                  {editingEmployeeId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-full py-2 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-350 border border-slate-800 font-bold transition-all text-xs"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Right: Employees List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">
              Registered Employees ({employees.length})
            </h2>

            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              {employees.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <Users className="w-12 h-12 text-slate-700 mb-3" />
                  <p className="text-slate-400 font-semibold">No registered employees</p>
                  <p className="text-xs text-slate-600 mt-1">Use the registry panel to add staff to this client company</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-5">Name</th>
                        <th className="py-3 px-5">Job Role</th>
                        <th className="py-3 px-5">Base Salary</th>
                        <th className="py-3 px-5">Allowances</th>
                        <th className="py-3 px-5">SSNIT / TIN</th>
                        {!isClient && <th className="py-3 px-5 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="py-3.5 px-5 font-semibold text-slate-200">
                            {emp.name}
                          </td>
                          <td className="py-3.5 px-5 text-slate-400 capitalize">
                            {emp.role}
                          </td>
                          <td className="py-3.5 px-5 font-medium">
                            {formatCurrency(emp.baseSalary)}
                          </td>
                          <td className="py-3.5 px-5 font-medium text-emerald-400/80">
                            {Number(emp.allowances) > 0 ? formatCurrency(emp.allowances) : '-'}
                          </td>
                          <td className="py-3.5 px-5 font-mono text-[10px] text-slate-500">
                            {emp.ssnitNo && <p>SSNIT: {emp.ssnitNo}</p>}
                            {emp.tin && <p>TIN: {emp.tin}</p>}
                            {!emp.ssnitNo && !emp.tin && <span className="italic">N/A</span>}
                          </td>
                          {!isClient && (
                            <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-1">
                              <button
                                onClick={() => handleStartEdit(emp)}
                                className="p-1.5 text-slate-500 hover:text-emerald-400 rounded-xl hover:bg-emerald-500/5 border border-transparent hover:border-emerald-500/10 transition-colors"
                                title="Edit employee details"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(emp.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-colors"
                                title="Remove employee"
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
          </div>
        </div>
      )}
    </div>
  );
}

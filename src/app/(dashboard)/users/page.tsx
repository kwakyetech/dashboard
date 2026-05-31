'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { UserPlus, Shield, User as UserIcon, Building2, Check, AlertCircle, ShieldAlert, Trash2 } from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  role: string;
  companies: { id: string; name: string }[];
  createdAt: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { companies } = useCompany();

  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('ACCOUNTANT');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/users?userId=${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('User removed successfully.');
        setUsersList((prev) => prev.filter((u) => u.id !== userId));
        setConfirmDeleteUserId(null);
      } else {
        setError(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error deleting user.');
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchUsers();
    }
  }, [user]);

  // Handle company checklist toggling
  const handleCompanyToggle = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    );
  };

  // Submit User invitation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !role) {
      setError('Email, password, and role are required.');
      return;
    }

    if (role === 'CLIENT' && selectedCompanies.length === 0) {
      setError('Client portal users must be assigned to at least one company.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          role,
          companyIds: role === 'CLIENT' ? selectedCompanies : [],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`Successfully registered ${data.user.email} as ${data.user.role}.`);
        
        // Reset form
        setEmail('');
        setPassword('');
        setName('');
        setRole('ACCOUNTANT');
        setSelectedCompanies([]);
        
        // Refresh users list
        fetchUsers();
      } else {
        setError(data.error || 'Failed to register user.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Guard page: Only ADMIN has access to this settings module
  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center space-y-6">
        <div className="inline-flex p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Access Denied</h1>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Only Firm Administrators have permission to manage staff profiles, client invitations, and credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
          Staff & Client Management
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Manage accountant credentials and configure client portal access rights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Form Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            Add User
          </h2>

          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4.5 h-4.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe, CPA"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@firm.com"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Temporary password"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setSelectedCompanies([]); // reset selections
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3 py-2.5 text-xs text-slate-300 outline-none"
              >
                <option value="ACCOUNTANT">Accountant (Read/Write)</option>
                <option value="CLIENT">Client Viewer (Read-only)</option>
              </select>
            </div>

            {/* Client Company Assignments */}
            {role === 'CLIENT' && (
              <div className="space-y-2 border-t border-slate-850 pt-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assign Client Companies *
                </label>
                {companies.length === 0 ? (
                  <span className="text-[10px] text-slate-500 italic block">No active companies to assign.</span>
                ) : (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {companies.map((c) => (
                      <label 
                        key={c.id} 
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(c.id)}
                          onChange={() => handleCompanyToggle(c.id)}
                          className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/10 active:scale-[0.98] outline-none transition-all flex justify-center items-center gap-2 text-xs"
            >
              {submitting ? 'Creating...' : 'Register User'}
            </button>
          </form>
        </div>

        {/* Right Column: User list table */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">
            Active Members List
          </h2>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center border border-slate-800 rounded-2xl bg-slate-900/10">
              <div className="w-8 h-8 rounded-full border-t-2 border-emerald-500 animate-spin" />
            </div>
          ) : usersList.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
              <p className="text-slate-500 text-sm font-medium">No users found</p>
            </div>
          ) : (
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Name / Email</th>
                      <th className="py-3 px-5">Role</th>
                      <th className="py-3 px-5">Assigned Portfolios</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="py-3.5 px-5">
                          <p className="font-semibold text-slate-100">{u.name || 'Anonymous User'}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{u.email}</p>
                        </td>
                        
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {u.role === 'ADMIN' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15 uppercase tracking-wide">
                              <Shield className="w-2.5 h-2.5" />
                              Firm Admin
                            </span>
                          ) : u.role === 'ACCOUNTANT' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-400 px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/15 uppercase tracking-wide">
                              <UserIcon className="w-2.5 h-2.5" />
                              Accountant
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/15 uppercase tracking-wide">
                              <Building2 className="w-2.5 h-2.5" />
                              Client Viewer
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5">
                          {u.role === 'CLIENT' ? (
                            u.companies.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {u.companies.map((c) => (
                                  <span 
                                    key={c.id}
                                    className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-[10px] rounded text-slate-400 truncate max-w-[100px]"
                                    title={c.name}
                                  >
                                    {c.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-red-500/80 font-medium">Unassigned</span>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-500 font-semibold italic">Full Portfolio Access</span>
                          )}
                        </td>
                        
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          {u.id !== user?.id ? (
                            confirmDeleteUserId === u.id ? (
                              <div className="flex justify-end gap-1.5 text-xs">
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteUserId(u.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/5 border border-transparent hover:border-red-500/10 transition-colors"
                                title="Remove user"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            )
                          ) : (
                            <span className="text-[10px] text-slate-650 italic px-2">Current Admin</span>
                          )}
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
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { 
  LayoutDashboard, 
  Receipt, 
  FileSpreadsheet, 
  Building2, 
  LogOut, 
  Menu, 
  X, 
  ChevronDown,
  User as UserIcon,
  Plus,
  PiggyBank,
  Coins,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading: authLoading, refreshSession } = useAuth();
  const { companies, activeCompany, selectCompany, loading: companyLoading } = useCompany();
  const pathname = usePathname();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Profile Edit states
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileFirmName, setProfileFirmName] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Billing states
  const [billingTab, setBillingTab] = useState<'profile' | 'billing'>('profile');
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const openProfileModal = () => {
    setProfileName(user?.name || '');
    setProfileEmail(user?.email || '');
    setProfilePassword('');
    setProfileFirmName(user?.firmName || '');
    setProfileError(null);
    setProfileSuccess(null);
    setBillingTab('profile');
    setBillingError(null);
    setProfileOpen(true);
  };

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const res = await fetch('/api/billing/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setBillingError(data.error || 'Failed to redirect to payment gateway.');
      }
    } catch (err) {
      console.error(err);
      setBillingError('Connection error contacting billing server.');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileUpdating(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          password: profilePassword || undefined,
          firmName: user?.role === 'ADMIN' ? profileFirmName : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileSuccess('Profile updated successfully.');
        setProfilePassword('');
        await refreshSession();
      } else {
        setProfileError(data.error || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setProfileError('Connection error updating profile.');
    } finally {
      setProfileUpdating(false);
    }
  };

  if (authLoading || (!user && pathname !== '/login' && pathname !== '/signup')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-emerald-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-teal-500 animate-spin-reverse" />
        </div>
        <p className="text-slate-400 text-sm font-medium tracking-wide animate-pulse">Loading AeroLedger AI...</p>
      </div>
    );
  }

  const companyId = activeCompany?.id;
  
  const navItems = [
    {
      name: 'Dashboard',
      href: companyId ? `/companies/${companyId}/dashboard` : '#',
      icon: LayoutDashboard,
      disabled: !companyId,
    },
    {
      name: 'Transactions',
      href: companyId ? `/companies/${companyId}/transactions` : '#',
      icon: Receipt,
      disabled: !companyId,
    },
    {
      name: 'AI Reports',
      href: companyId ? `/companies/${companyId}/reports` : '#',
      icon: FileSpreadsheet,
      disabled: !companyId,
    },
    {
      name: 'Budgets',
      href: companyId ? `/companies/${companyId}/budgets` : '#',
      icon: PiggyBank,
      disabled: !companyId,
    },
    {
      name: 'Payroll',
      href: companyId ? `/companies/${companyId}/payroll` : '#',
      icon: Coins,
      disabled: !companyId,
    },
    {
      name: 'Client Companies',
      href: '/companies',
      icon: Building2,
      disabled: false,
    },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({
      name: 'Staff & Clients',
      href: '/users',
      icon: UserIcon,
      disabled: false,
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 transition-all duration-300 relative ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Toggle Button for Collapsed Mode (floating on the right border) */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute -right-3 top-5 w-6 h-6 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-750 shadow-md hover:scale-105 transition-all z-50 animate-fade-in"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <div className={`h-16 flex items-center border-b border-slate-800 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold text-base shadow-md shadow-emerald-500/10 shrink-0">
              AL
            </div>
            {!isCollapsed && (
              <span className="font-bold text-base bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent truncate animate-fade-in">
                AeroLedger AI
              </span>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors shrink-0"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Company Switcher */}
        <div className={`py-4 border-b border-slate-800 relative ${isCollapsed ? 'px-2 flex justify-center' : 'px-4'}`}>
          {isCollapsed ? (
            <button
              onClick={() => {
                setIsCollapsed(false);
                setSwitcherOpen(true);
              }}
              className="w-10 h-10 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-all shrink-0"
              title={activeCompany ? `Active Client: ${activeCompany.name} (Click to Switch)` : 'Select Client'}
            >
              <Building2 className="w-5 h-5" />
            </button>
          ) : (
            <>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 px-2">
                Active Client
              </label>
              {companies.length > 0 ? (
                <div>
                  <button
                    onClick={() => setSwitcherOpen(!switcherOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-left text-sm font-medium transition-all group"
                  >
                    <span className="truncate pr-2 text-slate-200 group-hover:text-white">
                      {activeCompany ? activeCompany.name : 'Select Client...'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </button>

                  {switcherOpen && (
                    <div className="absolute left-4 right-4 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-1.5 max-h-60 overflow-y-auto">
                      {companies.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            selectCompany(c.id);
                            setSwitcherOpen(false);
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-slate-800/80 transition-colors flex flex-col ${
                            activeCompany?.id === c.id ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'
                          }`}
                        >
                          <span className="font-medium truncate">{c.name}</span>
                          {c.taxId && <span className="text-[10px] text-slate-500 mt-0.5">Tax ID: {c.taxId}</span>}
                        </button>
                      ))}
                      {user.role !== 'CLIENT' && (
                        <div className="border-t border-slate-800/80 mt-1.5 pt-1.5 px-2">
                          <Link
                            href="/companies"
                            onClick={() => setSwitcherOpen(false)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-950/60 hover:bg-emerald-500 hover:text-slate-950 text-xs font-semibold border border-slate-800 hover:border-transparent text-emerald-400 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add New Client
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                user.role !== 'CLIENT' && (
                  <Link
                    href="/companies"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 text-xs font-semibold rounded-xl border border-emerald-500/20 hover:border-transparent transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Client
                  </Link>
                )
              )}
            </>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className={`flex-1 py-4 space-y-1.5 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/companies'
              ? pathname === '/companies'
              : pathname === item.href || (item.href !== '#' && pathname.startsWith(item.href));
            
            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className={`flex items-center text-slate-650 rounded-xl cursor-not-allowed opacity-40 ${
                    isCollapsed ? 'justify-center w-10 h-10 mx-auto' : 'gap-3 px-3 py-2.5 text-sm'
                  }`}
                  title="Please select an active client company first"
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center transition-all ${
                  isCollapsed 
                    ? 'justify-center w-10 h-10 mx-auto rounded-xl' 
                    : 'gap-3 px-3 py-2.5 text-sm font-medium rounded-xl'
                } ${
                  isActive
                    ? isCollapsed
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      : 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 pl-2.5'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className={`border-t border-slate-800 flex flex-col gap-2 ${isCollapsed ? 'p-2 py-4' : 'p-4'}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3.5">
              <button 
                onClick={() => openProfileModal()}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center text-slate-300 hover:text-white font-semibold border border-slate-700 hover:border-emerald-500/50 transition-all cursor-pointer"
                title={`Edit Profile: ${user.name || 'User'} (${user.firmName})`}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </button>
              <button
                onClick={() => logout()}
                className="w-10 h-10 flex items-center justify-center hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-colors border border-transparent hover:border-red-500/10"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-2 py-1.5">
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold border border-slate-700 shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user.name || 'User'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.firmName}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openProfileModal()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-colors border border-transparent"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => logout()}
                  className="w-10 h-10 flex items-center justify-center hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-colors border border-transparent hover:border-red-500/10"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold text-sm">
              AL
            </div>
            <span className="font-bold text-sm">AeroLedger</span>
          </div>

          <div className="flex items-center gap-2">
            {activeCompany && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 rounded-full border border-slate-700 max-w-[120px] truncate">
                {activeCompany.name}
              </span>
            )}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" 
              onClick={() => setSidebarOpen(false)}
            />

            <div className="relative w-64 max-w-xs bg-slate-900 border-r border-slate-800 flex flex-col h-full z-50">
              <div className="h-16 flex items-center px-6 border-b border-slate-800 justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold text-base">
                    AL
                  </div>
                  <span className="font-bold text-base">AeroLedger</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Company Switcher */}
              <div className="px-4 py-4 border-b border-slate-800">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 px-1">
                  Active Client
                </label>
                {companies.length > 0 ? (
                  <select
                    value={activeCompany?.id || ''}
                    onChange={(e) => {
                      selectCompany(e.target.value);
                      setSidebarOpen(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  user.role !== 'CLIENT' && (
                    <Link
                      href="/companies"
                      onClick={() => setSidebarOpen(false)}
                      className="w-full flex items-center justify-center gap-1 py-2 px-3 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-lg"
                    >
                      Add Client Company
                    </Link>
                  )
                )}
              </div>

              {/* Mobile Links */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href === '/companies'
                    ? pathname === '/companies'
                    : pathname === item.href || (item.href !== '#' && pathname.startsWith(item.href));

                  if (item.disabled) {
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 rounded-xl opacity-50"
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 pl-2.5'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Footer */}
              <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
                <div className="flex items-center gap-3 px-2 py-1.5">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-semibold">
                    {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate">{user.name || 'User'}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.firmName}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      openProfileModal();
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-all"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      logout();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 hover:bg-red-500 hover:text-slate-950 text-red-400 text-xs font-semibold rounded-lg transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>

      {/* Edit Profile Modal */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-emerald-400" />
                Edit Profile Settings
              </h2>
              <button 
                onClick={() => setProfileOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user?.role === 'ADMIN' && (
              <div className="flex border-b border-slate-800 pb-1 gap-4">
                <button
                  type="button"
                  onClick={() => setBillingTab('profile')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-all ${
                    billingTab === 'profile'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Profile Details
                </button>
                <button
                  type="button"
                  onClick={() => setBillingTab('billing')}
                  className={`pb-2 text-xs font-semibold border-b-2 transition-all ${
                    billingTab === 'billing'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Billing & Subscription
                </button>
              </div>
            )}

            {billingTab === 'profile' ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                {profileError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 text-xs flex items-center gap-2">
                    <Check className="w-4.5 h-4.5 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Your Full Name"
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
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="your.email@firm.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
                  />
                </div>

                {user?.role === 'ADMIN' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Accounting Firm Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileFirmName}
                      onChange={(e) => setProfileFirmName(e.target.value)}
                      placeholder="Accounting Firm Name"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-slate-200 outline-none placeholder-slate-650"
                  />
                </div>

                <div className="flex gap-3 justify-end border-t border-slate-800 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileUpdating}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:scale-100"
                  >
                    {profileUpdating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-t border-slate-950 rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {billingError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                    <span>{billingError}</span>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user?.subscriptionPlan === 'enterprise'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                        : user?.subscriptionPlan === 'pro'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {user?.subscriptionPlan || 'free'}
                    </span>
                  </div>
                  {user?.subscriptionPlan && user?.subscriptionPlan !== 'free' && user?.subscriptionExpiresAt && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Expires on:</span>
                      <span className="text-slate-350 font-medium">
                        {new Date(user.subscriptionExpiresAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Available Plans</h3>

                  {/* Pro Card */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex justify-between items-center gap-4 hover:border-emerald-500/30 transition-all">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200">Pro Plan</h4>
                      <p className="text-[10px] text-slate-500 max-w-[200px]">GHS payroll calculations, reports export, tax filings.</p>
                      <p className="text-xs font-bold text-emerald-400 mt-1">GH₵150 <span className="text-[10px] text-slate-500 font-normal">/ month</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpgrade('pro')}
                      disabled={billingLoading || user?.subscriptionPlan === 'pro'}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold disabled:opacity-40 disabled:hover:bg-emerald-500 transition-all shrink-0"
                    >
                      {user?.subscriptionPlan === 'pro' ? 'Current' : 'Upgrade'}
                    </button>
                  </div>

                  {/* Enterprise Card */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex justify-between items-center gap-4 hover:border-purple-500/30 transition-all">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200">Enterprise Plan</h4>
                      <p className="text-[10px] text-slate-500 max-w-[200px]">Unlimited client company logs and AI report summaries.</p>
                      <p className="text-xs font-bold text-purple-400 mt-1">GH₵390 <span className="text-[10px] text-slate-500 font-normal">/ month</span></p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpgrade('enterprise')}
                      disabled={billingLoading || user?.subscriptionPlan === 'enterprise'}
                      className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-bold disabled:opacity-40 disabled:hover:bg-purple-500 transition-all shrink-0"
                    >
                      {user?.subscriptionPlan === 'enterprise' ? 'Current' : 'Upgrade'}
                    </button>
                  </div>
                </div>

                {billingLoading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
                    <div className="w-4.5 h-4.5 border-t border-emerald-500 rounded-full animate-spin" />
                    <span>Connecting to Paystack...</span>
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-800 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setProfileOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold rounded-xl text-xs transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

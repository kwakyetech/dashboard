'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface Company {
  id: string;
  name: string;
  taxId: string | null;
  firmId: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface CompanyContextType {
  companies: Company[];
  activeCompany: Company | null;
  loading: boolean;
  error: string | null;
  selectCompany: (id: string) => void;
  fetchCompanies: () => Promise<void>;
  createCompany: (name: string, taxId?: string, currency?: string) => Promise<{ success: boolean; error?: string }>;
  deleteCompany: (id: string) => Promise<{ success: boolean; error?: string }>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'aeroledger_active_company_id';

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies);

        // Try to restore active company from local storage, or fall back to the first one
        const storedId = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedId) {
          const match = data.companies.find((c: Company) => c.id === storedId);
          if (match) {
            setActiveCompany(match);
            setLoading(false);
            return;
          }
        }

        if (data.companies.length > 0) {
          setActiveCompany(data.companies[0]);
          localStorage.setItem(LOCAL_STORAGE_KEY, data.companies[0].id);
        } else {
          setActiveCompany(null);
        }
      } else {
        setError('Failed to load companies');
      }
    } catch (err) {
      setError('An error occurred loading companies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompanies();
    } else {
      setCompanies([]);
      setActiveCompany(null);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [user]);

  const selectCompany = (id: string) => {
    const match = companies.find((c) => c.id === id) || null;
    setActiveCompany(match);
    if (match) {
      localStorage.setItem(LOCAL_STORAGE_KEY, match.id);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  const createCompany = async (name: string, taxId?: string, currency?: string) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, taxId, currency }),
      });

      const data = await res.json();
      if (res.ok) {
        setCompanies((prev) => {
          const next = [...prev, data.company].sort((a, b) => a.name.localeCompare(b.name));
          // If this is the only company, select it
          if (next.length === 1) {
            setActiveCompany(data.company);
            localStorage.setItem(LOCAL_STORAGE_KEY, data.company.id);
          }
          return next;
        });
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to create company' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        setCompanies((prev) => {
          const next = prev.filter((c) => c.id !== id);
          if (activeCompany?.id === id) {
            if (next.length > 0) {
              setActiveCompany(next[0]);
              localStorage.setItem(LOCAL_STORAGE_KEY, next[0].id);
            } else {
              setActiveCompany(null);
              localStorage.removeItem(LOCAL_STORAGE_KEY);
            }
          }
          return next;
        });
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to delete company' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompany,
        loading,
        error,
        selectCompany,
        fetchCompanies,
        createCompany,
        deleteCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}

import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, FileText, History, Sun, Moon, CheckCircle2, AlertTriangle, XCircle, Info, ChevronRight, Trash2, Search, Download, Trash, Save, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { rulesConfig, FieldConfig } from './config/rules';
import { validateField, checkRationale, ValidationResult } from './lib/validation';
import { cn } from './lib/utils';

// --- Types ---

type View = 'form' | 'audit' | 'dashboard';

interface Exception {
  active: boolean;
  rationale: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  formData: Record<string, any>;
  exceptions: Record<string, Exception>;
  exceptionCount: number;
  isFlagged: boolean;
}

interface AppState {
  formData: Record<string, any>;
  exceptions: Record<string, Exception>;
  auditLog: AuditEntry[];
  currentView: View;
  theme: 'light' | 'dark';
}

// --- Main Component ---

export default function App() {
  // State
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('admitguard_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        formData: parsed.formData || { scoreType: 'percentage', offerLetterSent: false },
        exceptions: parsed.exceptions || {},
        currentView: 'form',
      };
    }
    return {
      formData: { scoreType: 'percentage', offerLetterSent: false },
      exceptions: {},
      auditLog: [],
      currentView: 'form',
      theme: 'light',
    };
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, ValidationResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExceptionCount, setFilterExceptionCount] = useState<number | 'all'>('all');
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Toast Helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Draft Persistence
  useEffect(() => {
    const draft = localStorage.getItem('admitguard_draft');
    if (draft && Object.keys(state.formData).length <= 2) { // Only restore if current form is mostly empty
      const parsed = JSON.parse(draft);
      setState(prev => ({ ...prev, formData: { ...prev.formData, ...parsed.formData }, exceptions: { ...prev.exceptions, ...parsed.exceptions } }));
      showToast('Draft restored from previous session', 'info');
    }
  }, []);

  useEffect(() => {
    if (state.currentView === 'form') {
      localStorage.setItem('admitguard_draft', JSON.stringify({ formData: state.formData, exceptions: state.exceptions }));
    }
  }, [state.formData, state.exceptions, state.currentView]);

  // Persistence
  useEffect(() => {
    localStorage.setItem('admitguard_state', JSON.stringify(state));
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  // Real-time validation
  useEffect(() => {
    const errors: Record<string, ValidationResult> = {};
    rulesConfig.fields.forEach(field => {
      const result = validateField(field, state.formData[field.id], state.formData, state.auditLog);
      if (!result.valid) {
        errors[field.id] = result;
      }
    });
    setValidationErrors(errors);
  }, [state.formData, state.auditLog]);

  // Derived Values
  const activeExceptionsCount = Object.values(state.exceptions).filter(e => (e as Exception).active).length;
  const isFlagged = activeExceptionsCount > rulesConfig.systemRules.maxExceptions;
  
  const canSubmit = () => {
    // Check strict errors
    const hasStrictErrors = Object.entries(validationErrors).some(([id, res]) => {
      const field = rulesConfig.fields.find(f => f.id === id);
      if (!field) return false;
      
      const result = res as ValidationResult;
      
      // If it's a strict field and invalid, it's an error
      if (field.category === 'strict' && !result.valid) return true;
      
      // If it's a soft field, invalid, and exception is NOT active or rationale is invalid
      if (field.category === 'soft' && !result.valid) {
        const exc = state.exceptions[id];
        if (!exc?.active) return true;
        const ratRes = checkRationale(field, exc.rationale);
        if (!ratRes.valid) return true;
      }

      if (result.blockSubmission) return true;

      return false;
    });

    // Check required fields that are empty but not yet touched (initial state)
    const missingRequired = rulesConfig.fields.some(f => {
      const val = state.formData[f.id];
      const isRequired = f.validations.some(v => v.type === 'required');
      return isRequired && (val === undefined || val === null || val === '');
    });

    return !hasStrictErrors && !missingRequired;
  };

  const completionPercentage = Math.round(
    (rulesConfig.fields.filter(f => state.formData[f.id] !== undefined && state.formData[f.id] !== '').length / rulesConfig.fields.length) * 100
  );

  // Handlers
  const handleInputChange = (id: string, value: any) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, [id]: value }
    }));
  };

  const toggleException = (id: string) => {
    setState(prev => ({
      ...prev,
      exceptions: {
        ...prev.exceptions,
        [id]: {
          active: !prev.exceptions[id]?.active,
          rationale: prev.exceptions[id]?.rationale || ''
        }
      }
    }));
  };

  const handleRationaleChange = (id: string, rationale: string) => {
    setState(prev => ({
      ...prev,
      exceptions: {
        ...prev.exceptions,
        [id]: { ...prev.exceptions[id], rationale }
      }
    }));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      const newEntry: AuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        formData: { ...state.formData },
        exceptions: { ...state.exceptions },
        exceptionCount: activeExceptionsCount,
        isFlagged
      };

      setState(prev => ({
        ...prev,
        auditLog: [newEntry, ...prev.auditLog],
        formData: { scoreType: 'percentage', offerLetterSent: false },
        exceptions: {},
        currentView: 'audit'
      }));
      localStorage.removeItem('admitguard_draft');
      showToast('Enrollment submitted successfully!');
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }, 1000);
  };

  const deleteEntry = (id: string) => {
    setState(prev => ({
      ...prev,
      auditLog: prev.auditLog.filter(e => e.id !== id)
    }));
    showToast('Entry deleted', 'info');
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all audit logs? This cannot be undone.')) {
      setState(prev => ({ ...prev, auditLog: [] }));
      showToast('Audit log cleared', 'error');
    }
  };

  const exportToJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.auditLog, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "admitguard_audit_log.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- Render Helpers ---

  const renderField = (field: FieldConfig) => {
    const value = state.formData[field.id];
    const error = validationErrors[field.id];
    const exception = state.exceptions[field.id];
    const isRequired = field.validations.some(v => v.type === 'required');

    return (
      <div key={field.id} className="space-y-2 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800/50 shadow-sm transition-all hover:shadow-md">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            {field.label}
            {isRequired && <span className="text-rose-500">*</span>}
          </label>
          {field.category === 'soft' && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Soft Rule
            </span>
          )}
        </div>

        <div className="relative">
          {field.type === 'select' ? (
            <select
              value={value || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900 transition-all outline-none focus:ring-2",
                error && !exception?.active ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 dark:border-slate-700 focus:ring-blue-200"
              )}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : field.type === 'toggle' ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleInputChange(field.id, !value)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  value ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                )}
              >
                <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", value ? "translate-x-6" : "translate-x-1")} />
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">{value ? 'Yes' : 'No'}</span>
            </div>
          ) : field.id === 'scoreValue' ? (
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={value || ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900 transition-all outline-none focus:ring-2",
                  error && !exception?.active ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 dark:border-slate-700 focus:ring-blue-200"
                )}
              />
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => handleInputChange('scoreType', 'percentage')}
                  className={cn("px-3 text-xs font-bold transition-colors", state.formData.scoreType === 'percentage' ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}
                >%</button>
                <button
                  onClick={() => handleInputChange('scoreType', 'cgpa')}
                  className={cn("px-3 text-xs font-bold transition-colors", state.formData.scoreType === 'cgpa' ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}
                >CGPA</button>
              </div>
            </div>
          ) : (
            <input
              type={field.type}
              value={value || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              className={cn(
                "w-full px-4 py-2.5 rounded-lg border bg-slate-50 dark:bg-slate-900 transition-all outline-none focus:ring-2",
                error && !exception?.active ? "border-rose-300 focus:ring-rose-200" : "border-slate-200 dark:border-slate-700 focus:ring-blue-200"
              )}
            />
          )}
          
          {error && !exception?.active && (
            <div className="mt-2 flex items-start gap-2 text-xs font-medium text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-top-1">
              <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error.error}</span>
            </div>
          )}

          {error?.blockSubmission && (
             <div className="mt-2 p-2 rounded bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                Rejected candidates cannot be enrolled.
             </div>
          )}
        </div>

        {field.category === 'soft' && error && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                Rule Violation Detected
              </div>
              <button
                onClick={() => toggleException(field.id)}
                className={cn(
                  "text-xs font-bold px-3 py-1 rounded-full transition-all",
                  exception?.active 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" 
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                {exception?.active ? 'Exception Active' : 'Request Exception'}
              </button>
            </div>

            <AnimatePresence>
              {exception?.active && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Exception Rationale</label>
                  <textarea
                    value={exception.rationale}
                    onChange={(e) => handleRationaleChange(field.id, e.target.value)}
                    placeholder="Provide detailed justification (min 30 chars, include keywords like 'approved by', 'special case'...)"
                    className={cn(
                      "w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 outline-none focus:ring-2 transition-all min-h-[80px]",
                      checkRationale(field, exception.rationale).valid ? "border-slate-200 dark:border-slate-700 focus:ring-blue-200" : "border-amber-300 focus:ring-amber-200"
                    )}
                  />
                  <div className="flex justify-between items-center text-[10px]">
                    <span className={cn(exception.rationale.length >= (field.rationaleMinLength || 30) ? "text-emerald-600" : "text-slate-400")}>
                      {exception.rationale.length} / {field.rationaleMinLength || 30} characters
                    </span>
                    {!checkRationale(field, exception.rationale).valid && (
                      <span className="text-amber-600 font-bold italic">
                        {checkRationale(field, exception.rationale).error}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">AdmitGuard</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Compliance System</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setState(p => ({ ...p, currentView: 'form' }))}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all", state.currentView === 'form' ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
            >
              <FileText className="w-4 h-4" /> New Entry
            </button>
            <button
              onClick={() => setState(p => ({ ...p, currentView: 'audit' }))}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all", state.currentView === 'audit' ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
            >
              <History className="w-4 h-4" /> Audit Log
            </button>
            <button
              onClick={() => setState(p => ({ ...p, currentView: 'dashboard' }))}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all", state.currentView === 'dashboard' ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
          </nav>

          <button
            onClick={() => setState(p => ({ ...p, theme: p.theme === 'light' ? 'dark' : 'light' }))}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {state.theme === 'light' ? <Moon className="w-5 h-5 text-slate-600" /> : <Sun className="w-5 h-5 text-amber-400" />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {state.currentView === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Candidate Enrollment</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Enter candidate details for eligibility verification.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Completion</div>
                  <div className="w-48 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPercentage}%` }}
                      className="h-full bg-blue-600"
                    />
                  </div>
                  <span className="text-xs font-bold text-blue-600">{completionPercentage}% Complete</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {rulesConfig.fields.map(renderField)}
              </div>

              {/* Sticky Footer for Form */}
              <div className="sticky bottom-8 p-6 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Exceptions</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-2xl font-black", activeExceptionsCount > 0 ? "text-amber-600" : "text-emerald-600")}>
                        {activeExceptionsCount} / 4
                      </span>
                      {isFlagged && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] font-black uppercase">
                          <AlertTriangle className="w-3 h-3" /> Flagged
                        </div>
                      )}
                    </div>
                  </div>
                  {isFlagged && (
                    <p className="hidden lg:block text-xs text-rose-600 font-medium max-w-[200px]">
                      {rulesConfig.systemRules.flagMessage}
                    </p>
                  )}
                </div>

                <button
                  disabled={!canSubmit()}
                  onClick={() => setShowConfirmModal(true)}
                  className={cn(
                    "w-full md:w-auto px-10 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-xl",
                    canSubmit() 
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25 cursor-pointer" 
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                  )}
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Review & Submit <ChevronRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {state.currentView === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Review and manage all historical enrollment entries.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportToJSON} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    <Download className="w-4 h-4" /> Export JSON
                  </button>
                  <button onClick={clearAllData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
                    <Trash2 className="w-4 h-4" /> Clear Log
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                    />
                  </div>
                  <select
                    value={filterExceptionCount}
                    onChange={(e) => setFilterExceptionCount(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-200 text-sm"
                  >
                    <option value="all">All Entries</option>
                    <option value="0">Zero Exceptions</option>
                    <option value="1">1+ Exceptions</option>
                    <option value="3">Flagged (3+)</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Candidate</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Exceptions</th>
                        <th className="px-6 py-4">Flagged</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {state.auditLog
                        .filter(e => {
                          const matchesSearch = e.formData.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || e.formData.email?.toLowerCase().includes(searchQuery.toLowerCase());
                          const matchesFilter = filterExceptionCount === 'all' 
                            ? true 
                            : filterExceptionCount === 3 
                              ? e.exceptionCount >= 3 
                              : filterExceptionCount === 1 
                                ? e.exceptionCount >= 1 
                                : e.exceptionCount === 0;
                          return matchesSearch && matchesFilter;
                        })
                        .map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                            {new Date(entry.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-sm">{entry.formData.fullName}</div>
                            <div className="text-xs text-slate-500">{entry.formData.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                              entry.formData.interviewStatus === 'Cleared' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            )}>
                              {entry.formData.interviewStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold",
                              entry.exceptionCount === 0 ? "bg-emerald-100 text-emerald-700" : entry.exceptionCount <= 2 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                            )}>
                              {entry.exceptionCount}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {entry.isFlagged ? (
                              <div className="flex items-center gap-1 text-rose-600 font-bold text-xs">
                                <AlertTriangle className="w-3.5 h-3.5" /> Yes
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">No</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {state.auditLog.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-20 text-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                              <History className="w-12 h-12 opacity-20" />
                              <p className="font-medium">No audit logs found.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {state.currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold tracking-tight">System Dashboard</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time metrics and compliance overview.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Submissions', value: state.auditLog.length, icon: FileText, color: 'blue' },
                  { label: 'Exception Rate', value: `${state.auditLog.length ? Math.round((state.auditLog.filter(e => e.exceptionCount > 0).length / state.auditLog.length) * 100) : 0}%`, icon: AlertTriangle, color: 'amber' },
                  { label: 'Flagged Entries', value: state.auditLog.filter(e => e.isFlagged).length, icon: Shield, color: 'rose' },
                  { label: 'Avg. Exceptions', value: state.auditLog.length ? (state.auditLog.reduce((acc, e) => acc + e.exceptionCount, 0) / state.auditLog.length).toFixed(1) : '0.0', icon: Info, color: 'emerald' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className={cn("p-2.5 rounded-xl", 
                        stat.color === 'blue' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                        stat.color === 'amber' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                        stat.color === 'rose' ? "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" :
                        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      )}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="text-3xl font-black tracking-tight">{stat.value}</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" /> Exception Distribution
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: '0 Exc', count: state.auditLog.filter(e => e.exceptionCount === 0).length },
                        { name: '1 Exc', count: state.auditLog.filter(e => e.exceptionCount === 1).length },
                        { name: '2 Exc', count: state.auditLog.filter(e => e.exceptionCount === 2).length },
                        { name: '3+ Exc', count: state.auditLog.filter(e => e.exceptionCount >= 3).length },
                      ]}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" /> Qualification Mix
                  </h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={rulesConfig.fields.find(f => f.id === 'qualification')?.options?.map(opt => ({
                            name: opt,
                            value: state.auditLog.filter(e => e.formData.qualification === opt).length
                          })).filter(d => d.value > 0) || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" /> Recent Activity
                  </h3>
                  <div className="space-y-4">
                    {state.auditLog.slice(0, 5).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                            {entry.formData.fullName?.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold">{entry.formData.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-medium">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {entry.exceptionCount > 0 && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                              {entry.exceptionCount} Exc
                            </span>
                          )}
                          {entry.isFlagged && <AlertTriangle className="w-4 h-4 text-rose-500" />}
                        </div>
                      </div>
                    ))}
                    {state.auditLog.length === 0 && <p className="text-center py-10 text-slate-400 text-sm italic">No recent activity.</p>}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" /> System Status
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Rules Engine</span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" /> Operational
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Audit Persistence</span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" /> LocalStorage Connected
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Compliance Threshold</span>
                      <span className="text-xs font-bold text-blue-600">Max 2 Exceptions</span>
                    </div>
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed font-medium">
                          AdmitGuard is currently enforcing 11 strict and soft validation rules across the enrollment pipeline.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-2xl font-black tracking-tight">Review Submission</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Please verify all information before final enrollment.</p>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  {rulesConfig.fields.map(f => (
                    <div key={f.id} className="space-y-1">
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{f.label}</div>
                      <div className="text-sm font-bold">
                        {f.type === 'toggle' ? (state.formData[f.id] ? 'Yes' : 'No') : state.formData[f.id] || '—'}
                        {f.id === 'scoreValue' && ` (${state.formData.scoreType})`}
                      </div>
                    </div>
                  ))}
                </div>

                {activeExceptionsCount > 0 && (
                  <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-black uppercase text-amber-600 tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Active Exceptions ({activeExceptionsCount})
                    </h4>
                    {Object.entries(state.exceptions)
                      .filter(([_, e]) => (e as Exception).active)
                      .map(([id, e]) => {
                        const exc = e as Exception;
                        const field = rulesConfig.fields.find(f => f.id === id);
                        return (
                          <div key={id} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 space-y-2">
                            <div className="text-xs font-bold text-amber-700 dark:text-amber-400">{field?.label} Violation</div>
                            <p className="text-xs italic text-slate-600 dark:text-slate-400 leading-relaxed">"{exc.rationale}"</p>
                          </div>
                        );
                      })}
                  </div>
                )}

                {isFlagged && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-rose-700 dark:text-rose-400">Manager Review Required</div>
                      <p className="text-xs text-rose-600/80 mt-1 font-medium">{rulesConfig.systemRules.flagMessage}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row gap-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel & Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Confirm & Enroll <CheckCircle2 className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={cn(
                "px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 min-w-[240px]",
                toast.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/80 dark:border-emerald-800 dark:text-emerald-200" :
                toast.type === 'error' ? "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/80 dark:border-rose-800 dark:text-rose-200" :
                "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/80 dark:border-blue-800 dark:text-blue-200"
              )}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              <span className="text-sm font-bold">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

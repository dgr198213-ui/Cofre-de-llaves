import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff, 
  Download, 
  Upload, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Check, 
  FileText,
  Menu,
  X,
  Settings,
  Lock,
  Unlock,
  Fingerprint,
  Filter
} from 'lucide-react';
import { Credential, ViewState, ToastMessage } from './types';
import { parseCredentials } from './smartParser';
import { isBiometricSupported, registerBiometrics, authenticateWithBiometrics } from './biometricService';
import { Button, Input, Modal } from './UIComponents';
// --- Local Storage Helper ---
const STORAGE_KEY = 'credvault_data_v2';
const BIOMETRIC_PREF_KEY = 'credvault_biometrics_enabled';

const loadData = (): Credential[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const saveData = (data: Credential[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// --- Toast Component ---
const ToastContainer: React.FC<{ toasts: ToastMessage[] }> = ({ toasts }) => (
  <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
    {toasts.map((t) => (
      <div key={t.id} className="bg-slate-800 text-white border border-slate-700 shadow-xl px-4 py-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-right fade-in pointer-events-auto">
        {t.type === 'success' && <div className="bg-green-500/20 text-green-400 p-1 rounded-full"><Check className="w-4 h-4" /></div>}
        {t.type === 'error' && <div className="bg-red-500/20 text-red-400 p-1 rounded-full"><X className="w-4 h-4" /></div>}
        {t.type === 'info' && <div className="bg-blue-500/20 text-blue-400 p-1 rounded-full"><Sparkles className="w-4 h-4" /></div>}
        <span className="text-sm font-medium">{t.message}</span>
      </div>
    ))}
  </div>
);

export default function App() {
  // State
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [view, setView] = useState<ViewState>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppFilter, setSelectedAppFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'app'>('date');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // Security State
  const [isLocked, setIsLocked] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Forms
  const [newCred, setNewCred] = useState({ key: '', value: '', appName: '' });
  const [importText, setImportText] = useState('');
  const [isParserLoading, setIsParserLoading] = useState(false);
  const [parsePreview, setParsePreview] = useState<any[]>([]);
  
  // Mobile Nav
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initialize Data & Security
  useEffect(() => {
    const data = loadData();
    setCredentials(data);

    const checkSecurity = async () => {
      const supported = await isBiometricSupported();
      setBiometricsAvailable(supported);
      
      const isEnabled = localStorage.getItem(BIOMETRIC_PREF_KEY) === 'true';
      setBiometricsEnabled(isEnabled);
      
      if (isEnabled && supported) {
        setIsLocked(true);
      }
    };
    checkSecurity();
  }, []);

  // Save Data on Change
  useEffect(() => {
    if (credentials.length > 0) {
      saveData(credentials);
    }
  }, [credentials]);

  // Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // Biometric Actions
  const handleToggleBiometrics = async () => {
    if (!biometricsEnabled) {
      const result = await registerBiometrics();
      if (result.success) {
        setBiometricsEnabled(true);
        localStorage.setItem(BIOMETRIC_PREF_KEY, 'true');
        showToast("Biometric authentication enabled");
      } else {
        showToast(result.error || "Failed to verify biometrics", "error");
      }
    } else {
      if (confirm("Are you sure you want to disable biometric protection?")) {
        setBiometricsEnabled(false);
        localStorage.removeItem(BIOMETRIC_PREF_KEY);
        showToast("Biometric authentication disabled", "info");
      }
    }
  };

  const handleUnlock = async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      setIsLocked(false);
    } else {
      showToast("Authentication failed", "error");
    }
  };

  // Actions
  const handleAddCredential = () => {
    if (!newCred.key || !newCred.value || !newCred.appName) {
      showToast("Please fill all fields", "error");
      return;
    }
    const cred: Credential = {
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      key: newCred.key.trim(),
      value: newCred.value.trim(),
      appName: newCred.appName.trim(),
      createdAt: Date.now(),
    };
    setCredentials(prev => [cred, ...prev]);
    setNewCred({ key: '', value: '', appName: '' });
    setIsAddModalOpen(false);
    showToast("Credential added successfully");
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this credential?')) {
      setCredentials(prev => prev.filter(c => c.id !== id));
      showToast("Credential deleted");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  };

  // Smart Parser (local, sin AI externa)
  const handleSmartParse = async () => {
    if (!importText.trim()) {
      showToast("Please enter text to parse", "error");
      return;
    }
    
    setIsParserLoading(true);
    
    // Simular pequeño delay para UX (parsing es instantáneo)
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      const results = parseCredentials(importText, false);
      
      if (results.length === 0) {
        showToast("No credentials found in text", "error");
        setIsParserLoading(false);
        return;
      }
      
      setParsePreview(results);
      showToast(`Found ${results.length} credentials`, "info");
    } catch (error) {
      showToast("Failed to parse text", "error");
      console.error('Parse error:', error);
    } finally {
      setIsParserLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsePreview.length === 0) return;
    
    const newItems: Credential[] = parsePreview.map((r: any) => ({
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      key: r.key,
      value: r.value,
      appName: r.appName || 'General',
      createdAt: Date.now(),
    }));
    
    setCredentials(prev => [...newItems, ...prev]);
    setImportText('');
    setParsePreview([]);
    setIsImportModalOpen(false);
    showToast(`Imported ${newItems.length} credentials`);
  };

  // Export
  const handleExport = (format: 'env' | 'json', filterApp?: string) => {
    const toExport = filterApp 
      ? credentials.filter(c => c.appName === filterApp)
      : credentials;

    let content = '';
    let filename = '';

    if (format === 'env') {
      content = toExport.map(c => `${c.key}=${c.value}`).join('\n');
      filename = filterApp ? `${filterApp}.env` : 'credentials.env';
    } else {
      const obj = Object.fromEntries(toExport.map(c => [c.key, c.value]));
      content = JSON.stringify(obj, null, 2);
      filename = filterApp ? `${filterApp}.json` : 'credentials.json';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported as ${filename}`);
  };

  const handleCopyAll = () => {
    const envContent = credentials.map(c => `${c.key}=${c.value}`).join('\n');
    navigator.clipboard.writeText(envContent);
    showToast("All credentials copied to clipboard");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setImportText(text);
      showToast("File loaded, click Parse to extract", "info");
    };
    reader.readAsText(file);
  };

  // Stats
  const stats = useMemo(() => ({
    total: credentials.length,
    apps: new Set(credentials.map(c => c.appName)).size,
    latest: credentials.length > 0 ? Math.max(...credentials.map(c => c.createdAt)) : 0,
  }), [credentials]);

  // Filters & Sort
  const filteredCredentials = useMemo(() => {
    let filtered = credentials;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.key.toLowerCase().includes(query) ||
        c.value.toLowerCase().includes(query) ||
        c.appName.toLowerCase().includes(query)
      );
    }

    if (selectedAppFilter !== 'All') {
      filtered = filtered.filter(c => c.appName === selectedAppFilter);
    }

    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.key.localeCompare(b.key));
        break;
      case 'app':
        sorted.sort((a, b) => a.appName.localeCompare(b.appName));
        break;
      case 'date':
      default:
        sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sorted;
  }, [credentials, searchQuery, selectedAppFilter, sortBy]);

  const uniqueApps = useMemo(() => {
    const apps = Array.from(new Set(credentials.map(c => c.appName))).sort();
    return ['All', ...apps];
  }, [credentials]);

  // Locked Screen
  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="bg-blue-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Vault Locked</h1>
          <p className="text-slate-400 mb-8">Authenticate to access your credentials</p>
          <Button onClick={handleUnlock} className="w-full" icon={Fingerprint}>
            Unlock with Biometrics
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">CredVault Pro</h1>
                <p className="text-xs text-slate-500">Smart Credential Manager</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2">
              <Button
                variant={view === 'dashboard' ? 'primary' : 'ghost'}
                onClick={() => setView('dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant={view === 'settings' ? 'primary' : 'ghost'}
                onClick={() => setView('settings')}
                icon={Settings}
              >
                Settings
              </Button>
            </nav>

            {/* Mobile Menu */}
            <button 
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 flex flex-col gap-2 pb-2">
              <Button
                variant={view === 'dashboard' ? 'primary' : 'secondary'}
                onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }}
                className="w-full"
              >
                Dashboard
              </Button>
              <Button
                variant={view === 'settings' ? 'primary' : 'secondary'}
                onClick={() => { setView('settings'); setIsMobileMenuOpen(false); }}
                icon={Settings}
                className="w-full"
              >
                Settings
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'settings' ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">Settings</h2>
            
            {/* Biometrics */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Fingerprint className="w-5 h-5 text-blue-400" />
                    Biometric Protection
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {biometricsAvailable 
                      ? 'Use fingerprint or face recognition to lock your vault'
                      : 'Biometric authentication is not available on this device'
                    }
                  </p>
                </div>
                <button
                  onClick={handleToggleBiometrics}
                  disabled={!biometricsAvailable}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    biometricsEnabled ? 'bg-blue-600' : 'bg-slate-700'
                  } disabled:opacity-50`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    biometricsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-lg">Data Management</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Credentials</span>
                  <span className="font-mono font-bold">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Apps / Projects</span>
                  <span className="font-mono font-bold">{stats.apps}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Storage Used</span>
                  <span className="font-mono font-bold text-sm">
                    {(JSON.stringify(credentials).length / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-800">
                <Button 
                  variant="danger" 
                  className="w-full"
                  onClick={() => {
                    if (confirm('This will DELETE ALL credentials. Are you absolutely sure?')) {
                      setCredentials([]);
                      showToast("All data cleared", "info");
                    }
                  }}
                >
                  Clear All Data
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-300 font-medium">Total Secrets</p>
                    <p className="text-3xl font-bold mt-1">{stats.total}</p>
                  </div>
                  <FileText className="w-10 h-10 text-blue-400 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-300 font-medium">Applications</p>
                    <p className="text-3xl font-bold mt-1">{stats.apps}</p>
                  </div>
                  <Filter className="w-10 h-10 text-purple-400 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-green-900/20 border border-green-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-300 font-medium">Protected</p>
                    <p className="text-3xl font-bold mt-1">
                      {biometricsEnabled ? <Lock className="w-8 h-8" /> : <Unlock className="w-8 h-8" />}
                    </p>
                  </div>
                  <ShieldCheck className="w-10 h-10 text-green-400 opacity-50" />
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button onClick={() => setIsAddModalOpen(true)} icon={Plus} className="flex-1 sm:flex-none">
                Add Credential
              </Button>
              <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" icon={Sparkles} className="flex-1 sm:flex-none">
                Smart Import
              </Button>
              <Button onClick={() => setIsExportModalOpen(true)} variant="secondary" icon={Download} className="flex-1 sm:flex-none">
                Export
              </Button>
            </div>

            {/* Search & Filters */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search credentials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg pl-10 pr-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="name">Sort by Name</option>
                  <option value="app">Sort by App</option>
                </select>
              </div>

              {/* App Filters */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {uniqueApps.map(app => (
                  <button
                    key={app}
                    onClick={() => setSelectedAppFilter(app)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedAppFilter === app 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' 
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {app}
                  </button>
                ))}
              </div>

              {filteredCredentials.length > 0 && searchQuery && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Found {filteredCredentials.length} result{filteredCredentials.length !== 1 ? 's' : ''}
                  </span>
                  {filteredCredentials.length < credentials.length && (
                    <Button variant="ghost" onClick={() => setSearchQuery('')} className="text-xs">
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Credentials Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCredentials.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                  <div className="bg-slate-800 p-4 rounded-full mb-4">
                    <FileText className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-300">
                    {credentials.length === 0 ? 'No credentials yet' : 'No matches found'}
                  </h3>
                  <p className="text-slate-500 max-w-xs mt-2">
                    {credentials.length === 0 
                      ? 'Add your first credential or use Smart Import to scan a document'
                      : 'Try adjusting your search or filters'
                    }
                  </p>
                  {credentials.length === 0 && (
                    <Button variant="secondary" className="mt-6" onClick={() => setIsImportModalOpen(true)}>
                      Try Smart Import
                    </Button>
                  )}
                </div>
              ) : (
                filteredCredentials.map(cred => (
                  <CredentialCard 
                    key={cred.id} 
                    credential={cred} 
                    onDelete={handleDelete} 
                    onCopy={handleCopy} 
                  />
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Credential">
        <div className="space-y-4">
          <Input 
            label="App / Project Name" 
            placeholder="e.g. MySuperApp" 
            value={newCred.appName}
            onChange={(e) => setNewCred({ ...newCred, appName: e.target.value })}
          />
          <Input 
            label="Key Name" 
            placeholder="e.g. DATABASE_URL" 
            value={newCred.key}
            onChange={(e) => setNewCred({ ...newCred, key: e.target.value })}
          />
          <Input 
            label="Value" 
            placeholder="e.g. postgres://user:pass@localhost:5432/db" 
            value={newCred.value}
            onChange={(e) => setNewCred({ ...newCred, value: e.target.value })}
          />
          <div className="pt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCredential}>Save Credential</Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); setParsePreview([]); }} title="Smart Import">
        <div className="space-y-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 flex gap-3 items-start">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">Local Parser - No API Required</p>
              Supports .env, JSON, YAML, TOML, XML. Automatically detects format and extracts credentials.
            </div>
          </div>
          
          {parsePreview.length === 0 ? (
            <>
              <textarea
                className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-300 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder={`DB_HOST=127.0.0.1\nAPI_KEY=xyz123\n\nOr paste JSON, YAML, TOML...`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />

              <div className="flex justify-between items-center pt-2">
                <label className="text-sm text-slate-500 flex items-center gap-2 cursor-pointer hover:text-slate-300">
                  <input 
                    type="file" 
                    accept=".env,.txt,.json,.yaml,.yml,.toml,.xml"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-4 h-4" />
                  <span className="underline">Load from file</span>
                </label>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleSmartParse} isLoading={isParserLoading} disabled={!importText.trim()}>
                    {isParserLoading ? 'Parsing...' : 'Parse'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-sm text-green-200">
                Found {parsePreview.length} credentials. Review and confirm to import.
              </div>
              
              <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
                {parsePreview.map((item, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                    <div className="text-xs text-blue-400 font-semibold mb-1">{item.appName || 'General'}</div>
                    <div className="font-mono text-sm text-slate-300">{item.key}</div>
                    <div className="font-mono text-xs text-slate-500 truncate">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setParsePreview([])} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleConfirmImport} className="flex-1">
                  Import {parsePreview.length}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export Credentials">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => handleExport('env')} className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group">
              <div className="bg-slate-900 p-3 rounded-full group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-green-400" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-200">.ENV Format</h3>
                <p className="text-xs text-slate-500 mt-1">Standard key=value</p>
              </div>
            </button>

            <button onClick={() => handleExport('json')} className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group">
              <div className="bg-slate-900 p-3 rounded-full group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-slate-200">JSON Format</h3>
                <p className="text-xs text-slate-500 mt-1">Structured data</p>
              </div>
            </button>
          </div>
          
          <Button onClick={handleCopyAll} variant="secondary" className="w-full py-3" icon={Copy}>
            Copy All to Clipboard (.env)
          </Button>

          <div className="border-t border-slate-800 pt-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">Filter by App (Optional)</label>
            <select 
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-500"
              onChange={(e) => {
                if(e.target.value !== "") handleExport('env', e.target.value);
              }}
            >
              <option value="">Select app to quick export .env...</option>
              {uniqueApps.filter(a => a !== 'All').map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

// Credential Card Component
const CredentialCard: React.FC<{
  credential: Credential;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
}> = ({ credential, onDelete, onCopy }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 group hover:border-slate-700 transition-colors shadow-sm hover:shadow-md">
      <div className="flex justify-between items-start">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-0.5">{credential.appName}</span>
          <h3 className="text-slate-200 font-mono font-medium truncate" title={credential.key}>{credential.key}</h3>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
          <button onClick={() => onDelete(credential.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-slate-950 rounded-lg p-2.5 flex items-center gap-2 border border-slate-800 group-hover:border-slate-700 transition-colors">
        <div className="flex-1 font-mono text-sm text-slate-400 truncate">
          {isVisible ? credential.value : '•••••••••••••••••••••'}
        </div>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => setIsVisible(!isVisible)} 
            className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-md transition-colors"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => onCopy(credential.value)}
            className="p-1.5 text-slate-500 hover:text-green-400 hover:bg-slate-800 rounded-md transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  Filter, 
  Trash2, 
  Download, 
  Info,
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Database,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';
import { AuditLog } from '../types';
import { getAuditLogs, clearAuditLogs, addAuditLog } from '../utils/auditLogger';
import { formatDateTime } from '../utils/formatters';

interface AuditViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function AuditView({ adminSecret, addToast }: AuditViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Diagnostic overview metrics
  const [stats, setStats] = useState({
    totalOps: 0,
    successCount: 0,
    failedCount: 0,
    successRate: '100%'
  });

  const loadLogs = () => {
    // Standard fetch
    const trail = getAuditLogs();
    setLogs(trail);

    // Compute basic telemetry stats
    const total = trail.length;
    const successes = trail.filter(l => l.status === 'success').length;
    const failures = trail.filter(l => l.status === 'failed').length;
    const rate = total > 0 ? `${Math.round((successes / total) * 100)}%` : '105%';

    setStats({
      totalOps: total,
      successCount: successes,
      failedCount: failures,
      successRate: rate
    });
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Filter and search computation
  const filteredLogs = logs.filter(log => {
    // Category match
    if (selectedCategory !== 'all' && log.category !== selectedCategory) {
      return false;
    }
    // Status match
    if (selectedStatus !== 'all' && log.status !== selectedStatus) {
      return false;
    }
    // Search match
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchDetails = log.details.toLowerCase().includes(term);
      const matchAction = log.action.toLowerCase().includes(term);
      const matchCategory = log.category.toLowerCase().includes(term);
      const matchIp = log.ipAddress?.toLowerCase().includes(term) || false;
      return matchDetails || matchAction || matchCategory || matchIp;
    }
    return true;
  });

  // Sort application
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Paginated items
  const totalItems = sortedLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedStatus, sortOrder]);

  const handleClearLogs = () => {
    if (!confirm('🚨 CRITICAL ACTION!\nAre you sure you want to permanently delete all administrative audit logs? This is irreversible.')) {
      return;
    }
    if (!confirm('Are you absolutely positive? Cleared logs are permanently purged from your administration terminal.')) {
      return;
    }
    
    // Clear logs
    const previousCount = logs.length;
    clearAuditLogs();
    
    // Log the clear action into the new empty log trail
    addAuditLog('setting', 'clear_audit_trail', `Permanently purged ${previousCount} log trail records from control panel`, 'success');
    
    addToast('success', 'Database cleared! Audit trail action logged.');
    loadLogs();
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      addToast('warning', 'There are no audit logs available to export.');
      return;
    }

    try {
      // CSV format headers
      const headers = ['Log ID', 'Timestamp', 'Category', 'Action Command', 'Operation Details', 'Status Flags', 'Terminal IP'];
      const rows = logs.map(log => [
        log.id,
        log.timestamp,
        log.category.toUpperCase(),
        log.action,
        `"${log.details.replace(/"/g, '""')}"`,
        log.status.toUpperCase(),
        log.ipAddress || '---'
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `gigup_nigeria_admin_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('success', 'Audit log spreadsheet (.csv) exported successfully.');
    } catch (e) {
      addToast('error', 'CSV construction failure.');
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'order':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'withdrawal':
        return 'bg-amber-100 text-amber-850 border-amber-200';
      case 'plan':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'setting':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'gateway':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION TITLE & ACTION ROW */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-slate-700" />
            Admin Audit Trail
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Track changes made by administrators, including plan prices, configurations, manual ledger adjustments, and payout approvals.
          </p>
        </div>
        
        {/* COMPLIANCE COMPANION ACTIONS */}
        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-350 text-slate-800 font-semibold text-xs rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
          >
            <Download className="w-4 h-4 mr-2 text-slate-500" />
            Download Trail (.CSV)
          </button>
          
          <button
            onClick={handleClearLogs}
            className="inline-flex items-center justify-center px-4 py-2 bg-red-105 hover:bg-red-200 border border-red-200 text-red-700 font-semibold text-xs rounded-xl shadow-sm transition-all focus:outline-none cursor-pointer"
            title="Clear persistent local logs"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Purge Trail
          </button>
        </div>
      </div>

      {/* METRIC OVERVIEW CARDS / BENTO GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-text-muted font-semibold tracking-wider uppercase">Logged Events</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-900 font-sans">{stats.totalOps}</span>
            <span className="text-[10px] text-slate-400 font-medium font-mono">records</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-text-muted font-semibold tracking-wider uppercase flex items-center gap-1">
            Success Rate
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-emerald-650 font-sans">{stats.successRate}</span>
            <span className="text-[10px] text-emerald-400 font-medium font-mono">compliant</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-text-muted font-semibold tracking-wider uppercase">Successful Ops</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-slate-900 font-sans">{stats.successCount}</span>
            <span className="text-[10px] text-slate-400 font-medium font-mono">completed</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs text-text-muted font-semibold tracking-wider uppercase">Failed Commands</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-2xl font-bold font-sans ${stats.failedCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {stats.failedCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium font-mono">exceptions</span>
          </div>
        </div>
      </div>

      {/* FILTER SHELF */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* SEARCH BAR */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by action, details, admin IP, reference, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-primary-blue focus:bg-white rounded-xl text-sm placeholder-slate-400 font-medium transition-all outline-none"
            />
          </div>

          {/* FILTER CONTROLS */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider">Filters</span>
            </div>

            {/* CATEGORY DROPDOWN */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 outline-none cursor-pointer"
            >
              <option value="all">Categories: All</option>
              <option value="user">Category: Users</option>
              <option value="order">Category: Orders</option>
              <option value="withdrawal">Category: Withdrawals</option>
              <option value="plan">Category: Plans</option>
              <option value="setting">Category: Settings</option>
              <option value="gateway">Category: Gateway</option>
            </select>

            {/* STATUS DROPDOWN */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 outline-none cursor-pointer"
            >
              <option value="all">Statuses: All</option>
              <option value="success">Status: Success Only</option>
              <option value="failed">Status: Failed Only</option>
            </select>

            {/* SORT BUTTON */}
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors focus:outline-none cursor-pointer shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Sort: {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>
      </div>

      {/* AUDIT LISTINGS CARD */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {sortedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center space-y-4">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100">
              <History className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">No audit events matched</h3>
              <p className="text-sm text-text-muted mt-1 max-w-sm">
                Try loosening your category filter bounds, clearing your query term, or perform admin mutations to record events.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 tracking-wider">
                  <th className="px-6 py-4">Action Details / Reference</th>
                  <th className="px-6 py-4">Scope</th>
                  <th className="px-6 py-4">Execution Status</th>
                  <th className="px-6 py-4">Admin Client IP</th>
                  <th className="px-6 py-4 text-right">Logged Datetime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                <AnimatePresence mode="popLayout">
                  {paginatedLogs.map((log) => (
                    <motion.tr
                      key={log.id}
                      layoutId={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/40 divide-x divide-transparent hover:divide-slate-100 transition-colors"
                    >
                      {/* DETAILS & ACTION ID */}
                      <td className="px-6 py-4.5 max-w-md">
                        <div className="font-semibold text-slate-900 leading-snug">{log.details}</div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-450 font-mono">
                          <span className="font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase text-[10px] tracking-wide">
                            {log.action}
                          </span>
                          <span>ID: {log.id}</span>
                        </div>
                      </td>

                      {/* CATEGORY SCOPE */}
                      <td className="px-6 py-4.5 shrink-0 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border shrink-0 ${getCategoryTheme(log.category)}`}>
                          {log.categoryScope || log.category}
                        </span>
                      </td>

                      {/* STATUS FLAGS */}
                      <td className="px-6 py-4.5 shrink-0 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-1.5">
                          {log.status === 'success' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-emerald-700 font-semibold text-xs">Success</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4 text-rose-500" />
                              <span className="text-rose-700 font-semibold text-xs">Failed</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* INTENDED ADMIN IP */}
                      <td className="px-6 py-4.5 font-mono text-xs text-slate-550 whitespace-nowrap align-middle">
                        {log.ipAddress || '197.210.8.214'}
                      </td>

                      {/* TIMESTAMP */}
                      <td className="px-6 py-4.5 text-right font-semibold text-slate-700 whitespace-nowrap align-middle text-xs font-mono">
                        {formatDateTime(log.timestamp)}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION SECTION */}
        {sortedLogs.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
            <span className="text-xs font-medium text-slate-500 font-sans">
              Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-800">
                {Math.min(startIndex + itemsPerPage, totalItems)}
              </span>{' '}
              of <span className="font-semibold text-slate-800">{totalItems}</span> operational log entries
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-700 px-3 bg-white border border-slate-200 h-8 flex items-center justify-center rounded-lg min-w-8">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

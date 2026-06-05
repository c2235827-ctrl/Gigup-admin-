import { useState } from 'react';
import { motion } from 'motion/react';
import { Download, Eye, Copy, Check, FileSpreadsheet } from 'lucide-react';
import { exportUsersCsv, fetchExportUsers } from '../services/api';
import { formatNaira, formatDateOnly, getInitials } from '../utils/formatters';

interface ExportViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function ExportView({ adminSecret, addToast }: ExportViewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopyingCsv, setIsCopyingCsv] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewUsers, setPreviewUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    try {
      const blob = await exportUsersCsv(adminSecret);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gigup-users-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', '✅ CSV downloaded successfully!');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to download CSV. (Try opening the app in a new tab)');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCsvToClipboard = async () => {
    setIsCopyingCsv(true);
    try {
      const result = await fetchExportUsers(adminSecret);
      const usersList = result.users || [];
      if (usersList.length === 0) {
        throw new Error('No users registered to export yet.');
      }
      
      const header = ['Full Name', 'Phone', 'Wallet Balance (₦)', 'Welcome Bonus (₦)', 'Cashback Balance (₦)', 'Orders Count', 'Total Spent (₦)', 'Joined Date'];
      const rows = usersList.map((user: any) => [
        user.full_name,
        user.phone,
        user.wallet_balance || 0,
        user.bonus_balance || 0,
        user.cashback_balance || 0,
        user.successful_orders || 0,
        user.total_spent || 0,
        user.joined || user.created_at || ''
      ]);
      
      const csvContentString = [
        header.join(','),
        ...rows.map((row: any[]) => 
          row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      await navigator.clipboard.writeText(csvContentString);
      addToast('success', '📋 CSV copied to clipboard successfully! You can paste it directly into Excel or Google Sheets.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to copy CSV data');
    } finally {
      setIsCopyingCsv(false);
    }
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const result = await fetchExportUsers(adminSecret);
      setPreviewUsers(result.users || []);
      setTotalCount(result.total);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load user list');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    addToast('success', `Phone number ${phone} copied`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Export Users</h1>
        <p className="text-sm text-text-muted mt-1">
          Download your full user list for bulk SMS campaigns and personalized messaging.
        </p>
      </div>

      {/* ACTION BUTTONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleDownloadCsv}
          disabled={isDownloading}
          className="flex items-center justify-center gap-3 px-5 py-5 bg-primary-blue hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-primary-blue/20 transition-all cursor-pointer"
        >
          {isDownloading ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <Download className="w-5 h-5" />
          )}
          <div className="text-left">
            <div className="text-sm font-bold">{isDownloading ? 'Downloading...' : 'Download CSV File'}</div>
            <div className="text-[11px] font-normal opacity-80">(Requires active full tab)</div>
          </div>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleCopyCsvToClipboard}
          disabled={isCopyingCsv}
          className="flex items-center justify-center gap-3 px-5 py-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
        >
          {isCopyingCsv ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <Copy className="w-5 h-5" />
          )}
          <div className="text-left">
            <div className="text-sm font-bold">{isCopyingCsv ? 'Copying...' : 'Copy CSV to Clipboard'}</div>
            <div className="text-[11px] font-normal opacity-80">Quick fallback for iframe sandboxes</div>
          </div>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handlePreview}
          disabled={isPreviewLoading}
          className="flex items-center justify-center gap-3 px-5 py-5 bg-white hover:bg-slate-50 disabled:opacity-60 text-primary-dark font-bold rounded-xl border-2 border-primary-dark shadow-geometric transition-all cursor-pointer"
        >
          {isPreviewLoading ? (
            <svg className="animate-spin h-5 w-5 text-primary-dark" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <Eye className="w-5 h-5" />
          )}
          <div className="text-left">
            <div className="text-sm font-bold">{isPreviewLoading ? 'Loading...' : 'Preview User List'}</div>
            <div className="text-[11px] font-normal opacity-60 font-sans">View registry in place first</div>
          </div>
        </motion.button>
      </div>

      {/* GOOGLE SHEETS TIP */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800 mb-2">💡 How to import to Google Sheets</h4>
            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Click <strong>"Download CSV"</strong> above</li>
              <li>Open Google Sheets → <strong>File → Import → Upload</strong></li>
              <li>Select the downloaded CSV file</li>
              <li>Choose <strong>"Replace spreadsheet"</strong> and click Import</li>
              <li>Your user list with names and phone numbers is ready for bulk SMS!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* PREVIEW TABLE */}
      {previewUsers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden"
        >
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">
              {totalCount !== null && (
                <><strong className="text-primary-blue">{totalCount}</strong> users total</>
              )}
            </span>
            <span className="text-xs text-text-muted">Click any phone number to copy</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Full Name</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3 text-right">Wallet (₦)</th>
                  <th className="px-6 py-3 text-right">Welcome Bonus (₦)</th>
                  <th className="px-6 py-3 text-right">Cashback (₦)</th>
                  <th className="px-6 py-3 text-center">Orders</th>
                  <th className="px-6 py-3 text-right">Spent (₦)</th>
                  <th className="px-6 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F8] text-xs">
                {previewUsers.map((user, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 select-none">
                        {getInitials(user.full_name)}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">{user.full_name}</td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleCopyPhone(user.phone)}
                        className="flex items-center gap-1.5 font-mono text-slate-700 hover:text-primary-blue transition-colors cursor-pointer group"
                      >
                        <span>{user.phone}</span>
                        {copiedPhone === user.phone ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-success">
                      {formatNaira(user.wallet_balance || 0)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-amber-500">
                      {user.bonus_balance && user.bonus_balance > 0 ? (
                        formatNaira(user.bonus_balance)
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-amber-500">
                      {formatNaira(user.cashback_balance || 0)}
                    </td>
                    <td className="px-6 py-3 text-center font-mono text-emerald-600 font-bold">
                      {user.successful_orders ?? 0}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-slate-800">
                      {formatNaira(user.total_spent || 0)}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {formatDateOnly(user.joined || user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { ShieldAlert, ShieldX, Users, Plus, Trash2, RefreshCw } from 'lucide-react';
import { fetchBlacklist, fetchIpClusters, addToBlacklist, removeFromBlacklist } from '../services/api';
import { BlacklistedIp, IpCluster } from '../types';

interface IpSecurityViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function IpSecurityView({ adminSecret, addToast }: IpSecurityViewProps) {
  const [blacklist, setBlacklist] = useState<BlacklistedIp[]>([]);
  const [clusters, setClusters] = useState<IpCluster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('');

  const load = async () => {
    setIsLoading(true);
    try {
      const [bl, cl] = await Promise.all([
        fetchBlacklist(adminSecret),
        fetchIpClusters(adminSecret)
      ]);
      setBlacklist(bl);
      setClusters(cl);
    } catch (err) {
      addToast('error', 'Failed to load IP security data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleBlacklistCluster = async (ip: string) => {
    const reason = prompt(`Why are you blacklisting ${ip}? (e.g. "Confirmed multi-account fraud")`);
    if (reason === null) return; // cancelled
    const result = await addToBlacklist(adminSecret, ip, reason.trim() || undefined);
    if (result.success) {
      addToast('success', `${ip} blacklisted successfully`);
      load();
    } else {
      addToast('error', `Failed to blacklist ${ip}`);
    }
  };

  const handleManualAdd = async () => {
    if (!manualIp.trim()) {
      addToast('warning', 'Enter an IP address');
      return;
    }
    const result = await addToBlacklist(adminSecret, manualIp.trim(), manualReason.trim() || undefined);
    if (result.success) {
      addToast('success', 'IP blacklisted successfully');
      setManualIp('');
      setManualReason('');
      load();
    } else {
      addToast('error', 'Failed to blacklist IP');
    }
  };

  const handleRemove = async (ip: string) => {
    if (!confirm(`Remove ${ip} from the blacklist? They will be able to sign up again.`)) return;
    const result = await removeFromBlacklist(adminSecret, ip);
    if (result.success) {
      addToast('success', 'Removed from blacklist successfully');
      load();
    } else {
      addToast('error', 'Failed to remove from blacklist');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">IP Security</h1>
          <p className="text-xs text-slate-400 mt-1">Review suspicious signup patterns and manage blocked IPs</p>
        </div>
        <button 
          onClick={load} 
          disabled={isLoading}
          className="self-start sm:self-auto px-4 py-2.5 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-blue' : ''}`} /> 
          {isLoading ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {/* SUSPICIOUS CLUSTERS SECTION */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-geometric p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Suspicious IP Clusters</h3>
            <p className="text-xs text-slate-400">IP addresses associated with 3 or more user accounts</p>
          </div>
        </div>

        {clusters.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl">
            <p className="text-sm text-slate-400">No suspicious clusters detected — nothing to review right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map(cluster => (
              <div key={cluster.ip_address} className="border border-amber-100 bg-amber-50/50 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <code className="text-sm font-mono font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200">{cluster.ip_address}</code>
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                        {cluster.account_count} accounts
                      </span>
                    </div>
                    <button
                      onClick={() => handleBlacklistCluster(cluster.ip_address)}
                      className="px-3 py-1.5 bg-danger text-white hover:bg-danger/90 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors active:scale-[0.98]"
                    >
                      <ShieldX className="w-3.5 h-3.5" /> Blacklist IP
                    </button>
                  </div>
                  
                  <div className="border-t border-amber-100/60 pt-3 mt-3">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Accounts:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {cluster.accounts.map(acc => (
                        <div key={acc.id} className="text-xs bg-white/70 p-2 rounded border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div className="font-semibold text-slate-800">{acc.full_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {acc.phone} &middot; {new Date(acc.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MANUAL BLACKLIST ACTION */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-geometric p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary-blue/5 flex items-center justify-center text-primary-blue">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Manually Blacklist an IP</h3>
            <p className="text-xs text-slate-400">Proactively block a known abusive IP address from registering</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input 
            placeholder="IP Address (e.g. 192.168.1.1)" 
            value={manualIp} 
            onChange={e => setManualIp(e.target.value)} 
            className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-primary-blue" 
          />
          <input 
            placeholder="Reason for blocking (optional)" 
            value={manualReason} 
            onChange={e => setManualReason(e.target.value)} 
            className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-primary-blue" 
          />
          <button 
            onClick={handleManualAdd} 
            className="px-5 py-2.5 bg-primary-blue hover:bg-primary-blue/90 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Blacklist IP
          </button>
        </div>
      </div>

      {/* CURRENT BLACKLIST */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-geometric overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-danger">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Currently Blacklisted</h3>
              <p className="text-xs text-slate-400">Active blocks on registrations</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {blacklist.length} Total
          </span>
        </div>

        {blacklist.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-400">No IPs currently blacklisted</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {blacklist.map(entry => (
              <div key={entry.id} className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-mono font-bold text-slate-900 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">{entry.ip_address}</code>
                    <span className="text-[10px] text-slate-400">By {entry.blacklisted_by}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    <span className="font-semibold text-slate-700">Reason:</span> {entry.reason || 'No reason given'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Blocked on {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => handleRemove(entry.ip_address)} 
                  title="Remove from blacklist"
                  className="p-2 bg-slate-100 hover:bg-red-50 hover:text-danger text-slate-500 rounded-lg cursor-pointer transition-colors active:scale-[0.95]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { AuditLog } from '../types';

/**
 * Gets all administrative audit logs from localStorage.
 */
export function getAuditLogs(): AuditLog[] {
  try {
    const logsJson = localStorage.getItem('gigup_admin_audit_logs');
    if (!logsJson) return [];
    const parsed = JSON.parse(logsJson);
    if (!Array.isArray(parsed)) return [];
    // Sort descending by timestamp
    return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    console.error('Error reading audit logs', e);
    return [];
  }
}

/**
 * Adds an administrative log entry to the audit trail.
 */
export function addAuditLog(
  category: 'user' | 'order' | 'withdrawal' | 'plan' | 'setting' | 'gateway',
  action: string,
  details: string,
  status: 'success' | 'failed'
): void {
  try {
    const logs = getAuditLogs();
    const newLog: AuditLog = {
      id: `log_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      details,
      status,
      ipAddress: '197.210.8.214' // Mock regional admin IP
    };
    
    // Maintain a maximum of 500 logs to prevent localStorage size overflow 
    const updated = [newLog, ...logs].slice(0, 500);
    localStorage.setItem('gigup_admin_audit_logs', JSON.stringify(updated));
  } catch (e) {
    console.error('Error writing audit log', e);
  }
}

/**
 * Clears all administrative logs.
 */
export function clearAuditLogs(): void {
  try {
    localStorage.removeItem('gigup_admin_audit_logs');
  } catch (e) {
    console.error('Error clearing audit logs', e);
  }
}

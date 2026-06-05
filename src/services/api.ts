import { Stats, Order, User, Plan, AppSetting, DashboardData, Withdrawal, GatewayStatus, AnalyticsData, MarginsData } from '../types';

const BASE_URL = 'https://ndcztauwnkycknrbbmix.supabase.co/functions/v1';

export const SETTING_LABELS: Record<string, { label: string; desc: string }> = {
  cashback_rate: { label: 'Cashback Rate (%)', desc: 'Percentage cashback awarded to users on every data purchase' },
  min_topup: { label: 'Minimum Top-Up (₦)', desc: 'Minimum amount required to fund a wallet' },
  signup_bonus_mb: { label: 'Signup Bonus (MB)', desc: 'Free data in MB given to users on registration' },
  referral_bonus_mb: { label: 'Referral Bonus (MB)', desc: 'Bonus data in MB awarded to both referrer and referee' },
  min_cashback_withdrawal: { label: 'Min Cashback Withdrawal (₦)', desc: 'Minimum cashback balance required to request a bank withdrawal' }
};

function getHeaders(secret: string): Record<string, string> {
  return {
    'x-admin-secret': secret,
    'Content-Type': 'application/json'
  };
}

export async function checkSecret(secret: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/admin-stats`, {
    method: 'GET',
    headers: getHeaders(secret)
  });
  if (res.status === 200) return true;
  if (res.status === 401) return false;
  const text = await res.text();
  throw new Error(`Server error (${res.status}): ${text}`);
}

export async function fetchStats(secret: string): Promise<DashboardData> {
  const res = await fetch(`${BASE_URL}/admin-stats`, { headers: getHeaders(secret) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error(`Failed to load stats (${res.status})`);
  }
  return await res.json();
}

export async function fetchUsers(
  secret: string,
  page = 1,
  limit = 20,
  search = ''
): Promise<{ users: User[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  const res = await fetch(`${BASE_URL}/admin-get-users?${params}`, { headers: getHeaders(secret) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load users');
  }
  return await res.json();
}

export async function fetchOrders(
  secret: string,
  page = 1,
  limit = 20,
  status = 'all',
  network = 'all',
  search = '',
  amountZero = false
): Promise<{ orders: Order[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status && status !== 'all') params.set('status', status);
  if (network && network !== 'all') params.set('network', network);
  if (search) params.set('search', search);
  if (amountZero) params.set('amount_zero', 'true');
  const res = await fetch(`${BASE_URL}/admin-get-orders?${params}`, { headers: getHeaders(secret) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load orders');
  }
  return await res.json();
}

export async function fetchManageData(secret: string): Promise<{ plans: Plan[]; settings: AppSetting[] }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, { headers: getHeaders(secret) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load plans and settings');
  }
  const data = await res.json();
  const settings: AppSetting[] = (data.settings || []).map((s: any) => {
    const meta = SETTING_LABELS[s.key] || { label: s.key, desc: '' };
    return { key: s.key, value: String(s.value), label: meta.label, description: meta.desc };
  });
  return { plans: data.plans || [], settings };
}

export async function updatePlan(
  secret: string,
  id: string,
  price: number,
  active: boolean
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_plan', id, price, active })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to update plan');
  }
  return await res.json();
}

export async function addPlan(
  secret: string,
  plan: Omit<Plan, 'id' | 'active'>
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'add_plan', ...plan })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to add plan');
  }
  return await res.json();
}

export async function updateAppSetting(
  secret: string,
  key: string,
  value: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_setting', key, value })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to update setting');
  }
  return await res.json();
}

export async function requeryOrder(
  secret: string,
  smedataRef: string
): Promise<{ success: boolean; smedata_status: string; data?: any }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'requery_order', smedata_ref: smedataRef })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to requery order');
  }
  return await res.json();
}

export async function fetchWithdrawals(
  secret: string,
  status: 'pending' | 'paid' | 'rejected'
): Promise<{ success: boolean; withdrawals: Withdrawal[] }> {
  const res = await fetch(`${BASE_URL}/admin-manage?section=withdrawals&status=${status}`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load withdrawals');
  }
  return await res.json();
}

export async function processWithdrawal(
  secret: string,
  withdrawalId: string,
  status: 'paid' | 'rejected',
  adminNote?: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'process_withdrawal', withdrawal_id: withdrawalId, status, admin_note: adminNote })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to process withdrawal');
  }
  return await res.json();
}

export async function fetchGatewayStatus(secret: string): Promise<{ success: boolean; gateway: GatewayStatus }> {
  const res = await fetch(`${BASE_URL}/admin-manage?section=gateway`, { headers: getHeaders(secret) });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load gateway status');
  }
  return await res.json();
}

export async function updateGateway(
  secret: string,
  data: {
    flw_secret_key: string;
    flw_public_key: string;
    flw_mode: 'test' | 'live';
  }
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ action: 'update_gateway', ...data })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to update gateway settings');
  }
  return await res.json();
}

export async function resendSignupBonus(
  secret: string,
  userId: string
): Promise<{ success: boolean; message: string; status: string }> {
  const res = await fetch(`${BASE_URL}/admin-resend-bonus`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({ user_id: userId })
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to resend bonus');
  }
  return await res.json();
}

export async function manualWalletCredit(
  secret: string,
  userId: string,
  amount: number,
  reference: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({
      action: 'manual_credit',
      user_id: userId,
      amount,
      reference
    })
  });
  if (!res.ok) throw new Error('Failed to credit wallet');
  return await res.json();
}

export async function fetchPendingPayments(
  secret: string
): Promise<{ success: boolean; pending: any[] }> {
  const res = await fetch(`${BASE_URL}/admin-manage?section=pending_payments`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) throw new Error('Failed to load pending payments');
  return await res.json();
}

export async function fetchAnalytics(
  secret: string,
  range: number = 30
): Promise<AnalyticsData> {
  const res = await fetch(`${BASE_URL}/admin-analytics?range=${range}`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load analytics');
  }
  return await res.json();
}

export async function exportUsersCsv(secret: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/admin-export-users?format=csv`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to export users');
  }
  return await res.blob();
}

export async function fetchExportUsers(
  secret: string
): Promise<{ success: boolean; total: number; users: any[] }> {
  const res = await fetch(`${BASE_URL}/admin-export-users?format=json`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unauthorized');
    throw new Error('Failed to load export users');
  }
  return await res.json();
}

export async function fetchPlanMargins(secret: string): Promise<MarginsData> {
  const res = await fetch(`${BASE_URL}/admin-plan-margins`, {
    headers: getHeaders(secret)
  });
  if (!res.ok) throw new Error('Failed to load plan margins');
  return await res.json();
}



import { Stats, Order, User, Plan, AppSetting, DashboardData } from '../types';

const BASE_URL = 'https://ndcztauwnkycknrbbmix.supabase.co/functions/v1';

// Check if we are in mock mode (helpful if the actual API endpoint is down or rate-limited, or CORS blocked)
let isMockMode = false;

export function setMockMode(enabled: boolean) {
  isMockMode = enabled;
  localStorage.setItem('gigup_admin_mock_mode', enabled ? 'true' : 'false');
}

export function getMockMode(): boolean {
  return isMockMode || localStorage.getItem('gigup_admin_mock_mode') === 'true';
}

// Key-values for app settings mapping
export const SETTING_LABELS: Record<string, { label: string; desc: string }> = {
  cashback_rate: { label: 'Cashback Rate', desc: 'Percentage cashback awarded to users on every database purchase' },
  min_topup: { label: 'Minimum Top-Up', desc: 'Minimum amount required to fund a wallet' },
  signup_bonus_mb: { label: 'Signup Bonus (MB)', desc: 'Free data allocation in Megabytes given on registration' },
  referral_bonus_mb: { label: 'Referral Bonus (MB)', desc: 'Bonus data in Megabytes awarded to both referrer and referee' }
};

// --- INITIAL SEED DATA FOR MOCK FALLBACK ---

let mockStats: Stats = {
  total_users: 120,
  total_orders: 340,
  pending_orders: 2,
  total_revenue: 250000.00,
  total_cashback_given: 25000.00,
  net_revenue: 225000.00,
  orders_by_network: { MTN: 200, GLO: 80, AIRTEL: 60 }
};

let mockOrders: Order[] = [
  {
    id: 'ord-101',
    recipient_phone: '08162345678',
    network: 'MTN',
    plan_name: 'MTN 1GB (SME)',
    amount: 330.00,
    status: 'pending',
    cashback_amount: 33.00,
    smedata_ref: '670290',
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    users: { full_name: 'John Doe', phone: '08012345678' }
  },
  {
    id: 'ord-102',
    recipient_phone: '09055556666',
    network: 'GLO',
    plan_name: 'GLO 2.5GB',
    amount: 650.00,
    status: 'pending',
    cashback_amount: 65.00,
    smedata_ref: '670291',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 mins ago
    users: { full_name: 'Amina Bello', phone: '09055556666' }
  },
  {
    id: 'ord-103',
    recipient_phone: '08031122334',
    network: 'MTN',
    plan_name: 'MTN 4GB Monthly',
    amount: 1100.00,
    status: 'success',
    cashback_amount: 110.00,
    smedata_ref: '190442',
    created_at: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
    users: { full_name: 'Babajide Cole', phone: '08031122334' }
  },
  {
    id: 'ord-104',
    recipient_phone: '08022233344',
    network: 'AIRTEL',
    plan_name: 'Airtel 1.5GB',
    amount: 480.00,
    status: 'success',
    cashback_amount: 48.00,
    smedata_ref: '228394',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    users: { full_name: 'Emeka Okafor', phone: '08022233344' }
  },
  {
    id: 'ord-105',
    recipient_phone: '08160001112',
    network: 'MTN',
    plan_name: 'MTN 10GB Mega',
    amount: 2800.00,
    status: 'failed',
    cashback_amount: 0.00,
    smedata_ref: '304958',
    created_at: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    users: { full_name: 'John Doe', phone: '08012345678' }
  },
  {
    id: 'ord-106',
    recipient_phone: '08098765432',
    network: 'GLO',
    plan_name: 'GLO 1.35GB',
    amount: 450.00,
    status: 'success',
    cashback_amount: 45.00,
    smedata_ref: '485923',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    users: { full_name: 'Chioma Nwachukwu', phone: '08098765432' }
  },
  {
    id: 'ord-107',
    recipient_phone: '08112223334',
    network: 'AIRTEL',
    plan_name: 'Airtel 5GB',
    amount: 1350.00,
    status: 'success',
    cashback_amount: 135.00,
    smedata_ref: '502941',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    users: { full_name: 'Bisi Adebayo', phone: '08112223334' }
  },
  {
    id: 'ord-108',
    recipient_phone: '08034445556',
    network: 'MTN',
    plan_name: 'MTN 1GB (SME)',
    amount: 330.00,
    status: 'success',
    cashback_amount: 33.00,
    smedata_ref: '601928',
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    users: { full_name: 'Babajide Cole', phone: '08031122334' }
  },
  {
    id: 'ord-109',
    recipient_phone: '09055556666',
    network: 'GLO',
    plan_name: 'GLO 5.8GB',
    amount: 1350.00,
    status: 'success',
    cashback_amount: 135.00,
    smedata_ref: '702931',
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    users: { full_name: 'Amina Bello', phone: '09055556666' }
  },
  {
    id: 'ord-110',
    recipient_phone: '08022233344',
    network: 'AIRTEL',
    plan_name: 'Airtel 10GB',
    amount: 2500.00,
    status: 'success',
    cashback_amount: 250.00,
    smedata_ref: '938592',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    users: { full_name: 'Emeka Okafor', phone: '08022233344' }
  }
];

let mockUsers: User[] = [
  {
    id: 'usr-001',
    phone: '08012345678',
    full_name: 'John Doe',
    wallet_balance: 5000.00,
    referral_code: 'ABC123',
    signup_bonus_claimed: true,
    total_orders: 12,
    created_at: '2026-01-01T10:30:00Z'
  },
  {
    id: 'usr-002',
    phone: '09055556666',
    full_name: 'Amina Bello',
    wallet_balance: 12450.00,
    referral_code: 'AMINAB',
    signup_bonus_claimed: true,
    total_orders: 8,
    created_at: '2026-02-14T14:15:00Z'
  },
  {
    id: 'usr-003',
    phone: '08031122334',
    full_name: 'Babajide Cole',
    wallet_balance: 1500.00,
    referral_code: 'JIDEC',
    signup_bonus_claimed: true,
    total_orders: 45,
    created_at: '2026-03-02T08:00:00Z'
  },
  {
    id: 'usr-004',
    phone: '08022233344',
    full_name: 'Emeka Okafor',
    wallet_balance: 350.00,
    referral_code: 'OMEKA',
    signup_bonus_claimed: false,
    total_orders: 2,
    created_at: '2026-04-10T19:45:00Z'
  },
  {
    id: 'usr-005',
    phone: '08098765432',
    full_name: 'Chioma Nwachukwu',
    wallet_balance: 0.00,
    referral_code: 'CHIO99',
    signup_bonus_claimed: true,
    total_orders: 1,
    created_at: '2026-05-18T11:20:00Z'
  },
  {
    id: 'usr-006',
    phone: '08112223334',
    full_name: 'Bisi Adebayo',
    wallet_balance: 7500.00,
    referral_code: 'BISIA',
    signup_bonus_claimed: false,
    total_orders: 5,
    created_at: '2026-05-20T16:05:00Z'
  }
];

let mockPlans: Plan[] = [
  // MTN
  {
    id: 'p-mtn-1',
    network: 'MTN',
    plan_name: 'MTN 1GB (SME)',
    size_label: '1GB',
    price: 330,
    smedata_plan_id: '1gb',
    validity: '30 Days',
    active: true
  },
  {
    id: 'p-mtn-2',
    network: 'MTN',
    plan_name: 'MTN 2GB (SME)',
    size_label: '2GB',
    price: 640,
    smedata_plan_id: '2gb',
    validity: '30 Days',
    active: true
  },
  {
    id: 'p-mtn-3',
    network: 'MTN',
    plan_name: 'MTN 5GB (SME)',
    size_label: '5GB',
    price: 1550,
    smedata_plan_id: '5gb',
    validity: '30 Days',
    active: true
  },
  {
    id: 'p-mtn-4',
    network: 'MTN',
    plan_name: 'MTN 10GB (SME)',
    size_label: '10GB',
    price: 3100,
    smedata_plan_id: '10gb',
    validity: '30 Days',
    active: true
  },
  // GLO
  {
    id: 'p-glo-1',
    network: 'GLO',
    plan_name: 'GLO 1.35GB',
    size_label: '1.35GB',
    price: 450,
    smedata_plan_id: 'glo135',
    validity: '14 Days',
    active: true
  },
  {
    id: 'p-glo-2',
    network: 'GLO',
    plan_name: 'GLO 2.5GB',
    size_label: '2.5GB',
    price: 650,
    smedata_plan_id: 'glo25',
    validity: '30 Days',
    active: true
  },
  {
    id: 'p-glo-3',
    network: 'GLO',
    plan_name: 'GLO 5.8GB',
    size_label: '5.8GB',
    price: 1350,
    smedata_plan_id: 'glo58',
    validity: '30 Days',
    active: true
  },
  // AIRTEL
  {
    id: 'p-art-1',
    network: 'AIRTEL',
    plan_name: 'Airtel 1.5GB',
    size_label: '1.5GB',
    price: 480,
    smedata_plan_id: 'air15',
    validity: '30 Days',
    active: true
  },
  {
    id: 'p-art-2',
    network: 'AIRTEL',
    plan_name: 'Airtel 5GB',
    size_label: '5GB',
    price: 1350,
    smedata_plan_id: 'air5',
    validity: '30 Days',
    active: true
  },
  {
    id: 'p-art-3',
    network: 'AIRTEL',
    plan_name: 'Airtel 10GB',
    size_label: '10GB',
    price: 2500,
    smedata_plan_id: 'air10',
    validity: '30 Days',
    active: false
  }
];

let mockSettings: AppSetting[] = [
  { key: 'cashback_rate', value: '10', label: 'Cashback Rate', description: SETTING_LABELS.cashback_rate.desc },
  { key: 'min_topup', value: '2000', label: 'Minimum Top-Up', description: SETTING_LABELS.min_topup.desc },
  { key: 'signup_bonus_mb', value: '4096', label: 'Signup Bonus Size', description: SETTING_LABELS.signup_bonus_mb.desc },
  { key: 'referral_bonus_mb', value: '500', label: 'Referral Bonus Size', description: SETTING_LABELS.referral_bonus_mb.desc }
];

// Helper to get headers for API calls
function getHeaders(secret: string): Record<string, string> {
  return {
    'x-admin-secret': secret,
    'Content-Type': 'application/json'
  };
}

// Ensure mock compatibility with actual password
const ADMIN_PASSWORD_STANDARD = 'gigup-admin-2026';

// --- SERVICE IMPLEMENTATIONS ---

export async function checkSecret(secret: string): Promise<boolean> {
  if (getMockMode()) {
    // If the mock mode is loaded, we just compare the secret
    return secret === ADMIN_PASSWORD_STANDARD;
  }

  try {
    const res = await fetch(`${BASE_URL}/admin-stats`, {
      method: "GET",
      headers: getHeaders(secret)
    });

    if (res.status === 200) {
      return true;
    } else if (res.status === 401) {
      return false;
    } else {
      // In case of another error, if the secret is correct, let's offer mock fallback
      if (secret === ADMIN_PASSWORD_STANDARD) {
        console.warn('Real server returned status', res.status, '. Switching to mock fallback for safety.');
        setMockMode(true);
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('API Connection failed. Falling back to mock check for standard password.');
    // If connection gets CORS error or block, switch to mock fallback for valid password
    if (secret === ADMIN_PASSWORD_STANDARD) {
      setMockMode(true);
      return true;
    }
    return false;
  }
}

export async function fetchStats(secret: string): Promise<DashboardData> {
  if (getMockMode()) {
    // Return mock stats
    return {
      stats: mockStats,
      recent_orders: mockOrders.slice(0, 10),
      recent_users: mockUsers.slice(0, 5)
    };
  }

  const res = await fetch(`${BASE_URL}/admin-stats`, {
    headers: getHeaders(secret)
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error(`Failed to load admin stats: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    stats: data.stats || mockStats,
    recent_orders: data.recent_orders || mockOrders.slice(0, 10),
    recent_users: data.recent_users || mockUsers.slice(0, 5)
  };
}

export async function fetchUsers(
  secret: string,
  page: number = 1,
  limit: number = 20,
  search: string = ''
): Promise<{ users: User[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  if (getMockMode()) {
    // Filter users dynamically
    let filtered = [...mockUsers];
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        u =>
          u.full_name.toLowerCase().includes(query) ||
          u.phone.includes(query) ||
          (u.referral_code && u.referral_code.toLowerCase().includes(query))
      );
    }

    const total = filtered.length;
    const pages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

    return {
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  }

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (search) {
    queryParams.set('search', search);
  }

  const res = await fetch(`${BASE_URL}/admin-get-users?${queryParams.toString()}`, {
    headers: getHeaders(secret)
  });

  if (!res.ok) {
    throw new Error('Failed to load users');
  }

  return await res.json();
}

export async function fetchOrders(
  secret: string,
  page: number = 1,
  limit: number = 20,
  status: string = 'all',
  network: string = 'all',
  search: string = ''
): Promise<{ orders: Order[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
  if (getMockMode()) {
    let filtered = [...mockOrders];

    // Status filter
    if (status && status !== 'all') {
      filtered = filtered.filter(o => o.status === status);
    }

    // Network filter
    if (network && network !== 'all') {
      filtered = filtered.filter(o => o.network.toUpperCase() === network.toUpperCase());
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim();
      filtered = filtered.filter(
        o =>
          o.recipient_phone.includes(q) ||
          o.smedata_ref.includes(q) ||
          (o.users?.full_name && o.users.full_name.toLowerCase().includes(q.toLowerCase()))
      );
    }

    const total = filtered.length;
    const pages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedOrders = filtered.slice(startIndex, startIndex + limit);

    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  }

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (status && status !== 'all') queryParams.set('status', status);
  if (network && network !== 'all') queryParams.set('network', network);
  if (search) queryParams.set('search', search);

  const res = await fetch(`${BASE_URL}/admin-get-orders?${queryParams.toString()}`, {
    headers: getHeaders(secret)
  });

  if (!res.ok) {
    throw new Error('Failed to load orders');
  }

  return await res.json();
}

export async function fetchManageData(secret: string): Promise<{ plans: Plan[]; settings: AppSetting[] }> {
  if (getMockMode()) {
    return {
      plans: mockPlans,
      settings: mockSettings
    };
  }

  try {
    const res = await fetch(`${BASE_URL}/admin-manage`, {
      headers: getHeaders(secret)
    });

    if (!res.ok) {
      throw new Error('Failed to load manage data');
    }

    const data = await res.json();
    
    // Process settings to append labels/descriptions if not present
    let settingsList: AppSetting[] = [];
    if (data.settings && Array.isArray(data.settings)) {
      settingsList = data.settings.map((s: any) => {
        const metadata = SETTING_LABELS[s.key] || { label: s.key, desc: '' };
        return {
          key: s.key,
          value: String(s.value),
          label: metadata.label,
          description: metadata.desc
        };
      });
    } else {
      settingsList = mockSettings;
    }

    return {
      plans: data.plans || mockPlans,
      settings: settingsList
    };
  } catch (err) {
    console.error('Error fetching admin-manage:', err);
    // If fails, we can fall back to local mock lists
    return {
      plans: mockPlans,
      settings: mockSettings
    };
  }
}

export async function updatePlan(
  secret: string,
  id: string,
  price: number,
  active: boolean
): Promise<{ success: boolean; message: string }> {
  if (getMockMode()) {
    const planIndex = mockPlans.findIndex(p => p.id === id);
    if (planIndex !== -1) {
      mockPlans[planIndex] = {
        ...mockPlans[planIndex],
        price,
        active
      };
      return { success: true, message: 'Plan updated successfully (Mock)' };
    }
    return { success: false, message: 'Plan not found' };
  }

  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({
      action: 'update_plan',
      id,
      price,
      active
    })
  });

  if (!res.ok) {
    throw new Error('Failed to update plan');
  }

  return await res.json();
}

export async function addPlan(
  secret: string,
  plan: Omit<Plan, 'id' | 'active'>
): Promise<{ success: boolean; message: string }> {
  if (getMockMode()) {
    const newPlan: Plan = {
      ...plan,
      id: `p-${plan.network.toLowerCase()}-${Date.now()}`,
      active: true
    };
    mockPlans.unshift(newPlan);
    return { success: true, message: 'Plan added successfully (Mock)' };
  }

  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({
      action: 'add_plan',
      ...plan
    })
  });

  if (!res.ok) {
    throw new Error('Failed to add plan');
  }

  return await res.json();
}

export async function updateAppSetting(
  secret: string,
  key: string,
  value: string
): Promise<{ success: boolean; message: string }> {
  if (getMockMode()) {
    const settingIndex = mockSettings.findIndex(s => s.key === key);
    if (settingIndex !== -1) {
      mockSettings[settingIndex].value = value;
      
      // Update stats based on mock setting actions
      if (key === 'cashback_rate') {
        const numVal = parseInt(value, 10) || 10;
        mockStats.total_cashback_given = mockStats.total_revenue * (numVal / 100);
        mockStats.net_revenue = mockStats.total_revenue - mockStats.total_cashback_given;
      }

      return { success: true, message: 'Setting updated successfully (Mock)' };
    }
    return { success: false, message: 'Setting not found' };
  }

  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({
      action: 'update_setting',
      key,
      value
    })
  });

  if (!res.ok) {
    throw new Error('Failed to update setting');
  }

  return await res.json();
}

export async function requeryOrder(
  secret: string,
  smedataRef: string
): Promise<{ success: boolean; smedata_status: string; data?: any }> {
  if (getMockMode()) {
    // Look up the order in mock orders
    const orderIndex = mockOrders.findIndex(o => o.smedata_ref === smedataRef);
    if (orderIndex !== -1) {
      // Simulate randomly confirming as success or failed
      const existing = mockOrders[orderIndex];
      const isOk = Math.random() > 0.2; // 80% success
      const newStatus = isOk ? 'success' : 'failed';
      
      mockOrders[orderIndex] = {
        ...existing,
        status: newStatus
      };

      // Recalculate stats pending
      const pendingCount = mockOrders.filter(o => o.status === 'pending').length;
      mockStats.pending_orders = pendingCount;

      if (newStatus === 'failed') {
        // Refund mock revenue / cashbacks
        mockStats.total_revenue -= existing.amount;
        // Refunds don't get cashback
        mockStats.total_cashback_given -= existing.cashback_amount;
        mockStats.net_revenue = mockStats.total_revenue - mockStats.total_cashback_given;
      }

      return {
        success: true,
        smedata_status: newStatus,
        data: {
          reference: smedataRef,
          status: newStatus,
          message: isOk ? 'Transaction Delivered Successfully' : 'VTU Provider Rejected Request — Insufficient SME Balance'
        }
      };
    }
    return { success: false, smedata_status: 'failed' };
  }

  const res = await fetch(`${BASE_URL}/admin-manage`, {
    method: 'POST',
    headers: getHeaders(secret),
    body: JSON.stringify({
      action: 'requery_order',
      smedata_ref: smedataRef
    })
  });

  if (!res.ok) {
    throw new Error('Failed to query order');
  }

  return await res.json();
}

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('decostone_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const responseText = await res.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { message: responseText || `Server returned an invalid response (${res.status}).` };
  }

  if (!res.ok) {
    if (res.status === 401 && !endpoint.includes('/auth/login')) {
      localStorage.removeItem('decostone_token');
      localStorage.removeItem('decostone_user');
      window.location.href = '/';
    }
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getProfile: () => request('/auth/profile'),
  changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Godowns
  getGodowns: () => request('/godowns'),
  getGodown: (id) => request(`/godowns/${id}`),
  createGodown: (data) => request('/godowns', { method: 'POST', body: JSON.stringify(data) }),
  updateGodown: (id, data) => request(`/godowns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Materials
  getMaterials: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/materials?${query}`);
  },
  getMaterial: (id) => request(`/materials/${id}`),
  createMaterial: (data) => request('/materials', { method: 'POST', body: JSON.stringify(data) }),
  updateMaterial: (id, data) => request(`/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMaterial: (id) => request(`/materials/${id}`, { method: 'DELETE' }),

  // Stock Operations
  stockIn: (data) => request('/stock/in', { method: 'POST', body: JSON.stringify(data) }),
  stockOut: (data) => request('/stock/out', { method: 'POST', body: JSON.stringify(data) }),
  transfer: (data) => request('/stock/transfer', { method: 'POST', body: JSON.stringify(data) }),
  adjust: (data) => request('/stock/adjust', { method: 'POST', body: JSON.stringify(data) }),
  getTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stock/transactions?${query}`);
  },
  getTransfers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/stock/transfers?${query}`);
  },
  getAdjustments: () => request('/stock/adjustments'),
  getLowStock: () => request('/stock/low-stock'),

  // Reports & Analytics
  getDashboardSummary: () => request('/reports/dashboard-summary'),
  getGodownWiseReport: () => request('/reports/godown-wise'),
  getCategoryWiseReport: () => request('/reports/category-wise'),
  getMaterialMovementReport: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/reports/material-movement?${query}`);
  },
  getUserActivityReport: () => request('/reports/user-activity'),

  // Users (Admin)
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleUserStatus: (id) => request(`/users/${id}/toggle-status`, { method: 'PATCH' }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // System & Audit
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/system/logs?${query}`);
  },
  getSettings: () => request('/system/settings'),
  updateSettings: (settings) => request('/system/settings', { method: 'PUT', body: JSON.stringify({ settings }) })
};

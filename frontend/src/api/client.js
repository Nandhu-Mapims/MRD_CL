const API_BASE = '/api';

export const apiClient = {
  async request(path, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorData;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          errorData = await res.json();
        } catch (e) {
          errorData = { message: 'Request failed' };
        }
      } else {
        const text = await res.text();
        errorData = { message: text || 'Request failed' };
      }
      
      const error = new Error(errorData.message || 'Request failed');
      error.response = { data: errorData, status: res.status };
      throw error;
    }
    if (res.status === 204) return null;
    return res.json();
  },

  get(path) {
    return this.request(path, { method: 'GET' });
  },
  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) });
  },
  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) });
  },
  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },
};



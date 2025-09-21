import axios, { AxiosInstance } from 'axios';
import { User, Client, Behavior, LogEntry, Organization, FilterOptions, AuditLog } from '../types';

class ApiAdapter {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = import.meta.env.VITE_API_URL || 'http://localhost:3001') {
    this.api = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.api.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.token = null;
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  auth = {
    login: async (email: string, password: string) => {
      const { data } = await this.api.post('/auth/login', { email, password });
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);
      return data;
    },

    logout: async () => {
      await this.api.post('/auth/logout');
      this.token = null;
      localStorage.removeItem('auth_token');
    },

    getCurrentUser: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No auth token');
      this.token = token;
      const { data } = await this.api.get('/auth/me');
      return data;
    },

    refresh: async () => {
      const { data } = await this.api.post('/auth/refresh');
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);
      return data;
    }
  };

  clients = {
    list: async () => {
      const { data } = await this.api.get('/clients');
      return data;
    },

    get: async (id: string) => {
      const { data } = await this.api.get(`/clients/${id}`);
      return data;
    },

    create: async (client: Omit<Client, 'id'>) => {
      const { data } = await this.api.post('/clients', client);
      return data;
    },

    update: async (id: string, updates: Partial<Client>) => {
      const { data } = await this.api.put(`/clients/${id}`, updates);
      return data;
    },

    deactivate: async (id: string) => {
      const { data } = await this.api.patch(`/clients/${id}/deactivate`);
      return data.success;
    }
  };

  behaviors = {
    list: async () => {
      const { data } = await this.api.get('/behaviors');
      return data;
    },

    get: async (id: string) => {
      const { data } = await this.api.get(`/behaviors/${id}`);
      return data;
    },

    create: async (behavior: Omit<Behavior, 'id'>) => {
      const { data } = await this.api.post('/behaviors', behavior);
      return data;
    },

    update: async (id: string, updates: Partial<Behavior>) => {
      const { data } = await this.api.put(`/behaviors/${id}`, updates);
      return data;
    },

    delete: async (id: string) => {
      const { data } = await this.api.delete(`/behaviors/${id}`);
      return data.success;
    }
  };

  logs = {
    create: async (log: Omit<LogEntry, 'id' | 'org_id' | 'timestamp'>) => {
      const { data } = await this.api.post('/logs', log);
      return data;
    },

    list: async (filters?: FilterOptions) => {
      const params = new URLSearchParams();
      if (filters?.client_code) params.append('client_code', filters.client_code);
      if (filters?.behavior_id) params.append('behavior_id', filters.behavior_id);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);

      const { data } = await this.api.get(`/logs?${params.toString()}`);
      return data;
    },

    get: async (id: string) => {
      const { data } = await this.api.get(`/logs/${id}`);
      return data;
    },

    update: async (id: string, updates: Partial<LogEntry>) => {
      const { data } = await this.api.put(`/logs/${id}`, updates);
      return data;
    },

    delete: async (id: string) => {
      const { data } = await this.api.delete(`/logs/${id}`);
      return data.success;
    }
  };

  reports = {
    generate: async (filters?: FilterOptions) => {
      const params = new URLSearchParams();
      if (filters?.client_code) params.append('client_code', filters.client_code);
      if (filters?.behavior_id) params.append('behavior_id', filters.behavior_id);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);

      const { data } = await this.api.get(`/reports/summary?${params.toString()}`);
      return data;
    },

    export: async (format: 'csv' | 'pdf', filters?: FilterOptions) => {
      const params = new URLSearchParams();
      if (filters?.client_code) params.append('client_code', filters.client_code);
      if (filters?.behavior_id) params.append('behavior_id', filters.behavior_id);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      params.append('format', format);

      const { data } = await this.api.get(`/reports/export?${params.toString()}`, {
        responseType: 'blob'
      });
      return data;
    }
  };

  audit = {
    log: async (audit: Omit<AuditLog, 'id' | 'org_id' | 'timestamp'>) => {
      const { data } = await this.api.post('/audit', audit);
      return data;
    },

    list: async (filters?: { from?: string; to?: string; action?: string }) => {
      const params = new URLSearchParams();
      if (filters?.from) params.append('from', filters.from);
      if (filters?.to) params.append('to', filters.to);
      if (filters?.action) params.append('action', filters.action);

      const { data } = await this.api.get(`/audit?${params.toString()}`);
      return data;
    }
  };
}

export const apiAdapter = new ApiAdapter();
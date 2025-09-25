import { User, Client, Behavior, LogEntry, Organization, FilterOptions } from '../types';

const mockOrg: Organization = {
  id: 'org-1',
  name: 'Demo Agency'
};

const mockUser: User = {
  id: 'user-1',
  org_id: 'org-1',
  email: 'demo@example.com',
  display_name: 'Demo User',
  role: 'supervisor'
};

const mockClients: Client[] = [
  { id: 'c1', org_id: 'org-1', client_code: 'JD01', display_name: 'John D.', active: true },
  { id: 'c2', org_id: 'org-1', client_code: 'SM02', display_name: 'Sarah M.', active: true },
  { id: 'c3', org_id: 'org-1', client_code: 'RB03', display_name: 'Robert B.', active: true }
];

const mockBehaviors: Behavior[] = [
  { id: 'b1', org_id: 'org-1', name: 'Verbal Outburst', description: 'Yelling, screaming' },
  { id: 'b2', org_id: 'org-1', name: 'Physical Aggression', description: 'Hitting, pushing' },
  { id: 'b3', org_id: 'org-1', name: 'Self-Injury', description: 'Self-harm behaviors' },
  { id: 'b4', org_id: 'org-1', name: 'Property Destruction', description: 'Throwing, breaking items' },
  { id: 'b5', org_id: 'org-1', name: 'Non-Compliance', description: 'Refusing directions' }
];

const generateMockLogs = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = new Date();

  for (let days = 0; days < 30; days++) {
    const date = new Date(now);
    date.setDate(date.getDate() - days);

    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      const client = mockClients[Math.floor(Math.random() * mockClients.length)];
      const behavior = mockBehaviors[Math.floor(Math.random() * mockBehaviors.length)];

      logs.push({
        id: `log-${days}-${i}`,
        org_id: 'org-1',
        client_code: client.client_code,
        staff_id: mockUser.id,
        timestamp: date.toISOString(),
        behavior_id: behavior.id,
        intensity: (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
        duration_min: Math.floor(Math.random() * 30) + 1,
        antecedent: 'Transition to activity',
        behavior_observed: behavior.name,
        consequence: 'Redirection provided',
        notes: 'Client responded well to intervention',
        incident: Math.random() > 0.8
      });
    }
  }

  return logs;
};

let mockLogs = generateMockLogs();

export const mockAdapter = {
  auth: {
    login: async (email: string, password: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { user: mockUser, org: mockOrg, token: 'mock-token' };
    },
    logout: async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
    },
    getCurrentUser: async () => {
      return { user: mockUser, org: mockOrg, token: 'mock-token' };
    }
  },

  clients: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockClients;
    },
    get: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockClients.find(c => c.id === id);
    }
  },

  behaviors: {
    list: async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockBehaviors;
    },
    get: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockBehaviors.find(b => b.id === id);
    }
  },

  logs: {
    create: async (data: Omit<LogEntry, 'id' | 'org_id' | 'timestamp'>) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const newLog: LogEntry = {
        ...data,
        id: `log-${Date.now()}`,
        org_id: mockOrg.id,
        timestamp: new Date().toISOString()
      };
      mockLogs.unshift(newLog);
      return newLog;
    },

    list: async (filters?: FilterOptions) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      let filtered = [...mockLogs];

      if (filters?.client_code) {
        filtered = filtered.filter(l => l.client_code === filters.client_code);
      }
      if (filters?.behavior_id) {
        filtered = filtered.filter(l => l.behavior_id === filters.behavior_id);
      }
      if (filters?.date_from) {
        filtered = filtered.filter(l => l.timestamp >= filters.date_from!);
      }
      if (filters?.date_to) {
        filtered = filtered.filter(l => l.timestamp <= filters.date_to!);
      }
      if (filters?.incident !== undefined) {
        filtered = filtered.filter(l => l.incident === filters.incident);
      }
      if (filters?.min_intensity !== undefined) {
        filtered = filtered.filter(l => l.intensity >= filters.min_intensity!);
      }
      if (filters?.max_intensity !== undefined) {
        filtered = filtered.filter(l => l.intensity <= filters.max_intensity!);
      }

      return filtered;
    }
  },

  reports: {
    generate: async (filters?: FilterOptions) => {
      const logs = await mockAdapter.logs.list(filters);

      const behaviorCounts = logs.reduce((acc, log) => {
        acc[log.behavior_id] = (acc[log.behavior_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const dailyCounts = logs.reduce((acc, log) => {
        const date = log.timestamp.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        behaviorCounts,
        dailyCounts,
        totalIncidents: logs.filter(l => l.incident).length,
        averageIntensity: logs.reduce((sum, l) => sum + l.intensity, 0) / logs.length || 0
      };
    }
  }
};
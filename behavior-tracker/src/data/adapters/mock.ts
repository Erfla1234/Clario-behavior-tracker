import { User, Client, Behavior, LogEntry, Organization, FilterOptions, BehaviorGoal, GoalProgress, ShiftHandoff, ClientUpdate } from '../types';

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

// Mock Goals
const mockGoals: BehaviorGoal[] = [
  {
    id: 'goal-1',
    org_id: 'org-1',
    client_code: 'JD01',
    behavior_id: 'b2', // Physical Aggression
    goal_type: 'reduce',
    target_metric: 'frequency',
    current_value: 12, // per week
    target_value: 5, // per week
    target_date: '2024-12-31',
    created_by: 'user-1',
    created_at: '2024-10-01T00:00:00Z',
    status: 'active',
    notes: 'Reduce physical aggression incidents through consistent de-escalation techniques',
    interventions: ['Deep breathing exercises', 'Sensory breaks', 'Clear warnings']
  },
  {
    id: 'goal-2',
    org_id: 'org-1',
    client_code: 'SM02',
    behavior_id: 'b5', // Non-Compliance
    goal_type: 'reduce',
    target_metric: 'intensity',
    current_value: 4.2, // average intensity
    target_value: 2.5,
    target_date: '2024-11-30',
    created_by: 'user-1',
    created_at: '2024-09-15T00:00:00Z',
    status: 'active',
    notes: 'Lower intensity of non-compliance through positive reinforcement',
    interventions: ['Token economy', 'Choice boards', 'Preferred activities']
  },
  {
    id: 'goal-3',
    org_id: 'org-1',
    client_code: 'RB03',
    behavior_id: 'b3', // Self-Injury
    goal_type: 'reduce',
    target_metric: 'frequency',
    current_value: 8,
    target_value: 2,
    target_date: '2024-12-15',
    created_by: 'user-1',
    created_at: '2024-09-01T00:00:00Z',
    status: 'active',
    notes: 'Significant reduction in self-injury through alternative coping strategies',
    interventions: ['Fidget tools', 'Communication cards', 'Scheduled breaks']
  }
];

// Generate progress data for goals
const generateGoalProgress = (goal: BehaviorGoal): GoalProgress[] => {
  const progress: GoalProgress[] = [];
  const startDate = new Date(goal.created_at);
  const now = new Date();

  for (let d = startDate; d <= now; d.setDate(d.getDate() + 7)) {
    // Simulate gradual progress toward goal
    const weeksElapsed = Math.floor((d.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const progressRatio = weeksElapsed * 0.1; // 10% improvement per week
    const improvement = (goal.current_value - goal.target_value) * Math.min(progressRatio, 0.8);
    const currentValue = goal.current_value - improvement + (Math.random() - 0.5) * 2; // Add some variance

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (goal.goal_type === 'reduce' && currentValue < goal.current_value) trend = 'improving';
    if (goal.goal_type === 'increase' && currentValue > goal.current_value) trend = 'improving';

    progress.push({
      id: `progress-${goal.id}-${d.getTime()}`,
      goal_id: goal.id,
      date: d.toISOString().split('T')[0],
      value: Math.max(0, Math.round(currentValue * 10) / 10),
      trend,
      calculated_at: new Date().toISOString()
    });
  }

  return progress;
};

let mockProgress: GoalProgress[] = mockGoals.flatMap(generateGoalProgress);

// Mock Shift Handoffs
const mockHandoffs: ShiftHandoff[] = [
  {
    id: 'handoff-1',
    org_id: 'org-1',
    shift_date: new Date().toISOString().split('T')[0],
    shift_type: 'morning',
    created_by: 'user-1',
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
    staff_name: 'Sarah Johnson',
    staff_role: 'staff',
    summary: 'Morning shift went smoothly. JD01 had minor verbal outburst during breakfast, resolved with redirection.',
    client_updates: [
      {
        client_code: 'JD01',
        client_name: 'John D.',
        status: 'escalated',
        notes: 'Verbal outburst at 9:30 AM, seemed frustrated with morning routine. Used calming techniques successfully.',
        follow_up_required: true,
        priority: 'medium'
      },
      {
        client_code: 'SM02',
        client_name: 'Sarah M.',
        status: 'improved',
        notes: 'Great participation in morning activities. Completed all tasks independently.',
        follow_up_required: false,
        priority: 'low'
      }
    ],
    critical_alerts: ['JD01 medication change - monitor for side effects', 'Fire drill scheduled at 2 PM'],
    medications_given: ['JD01 - Morning meds at 8 AM', 'SM02 - Morning meds at 8:15 AM'],
    next_shift_tasks: ['Complete JD01 behavior plan review', 'Prepare materials for afternoon group activity'],
    general_notes: 'New staff member shadowing tomorrow morning. Please prepare orientation materials.',
    acknowledged_by: ['user-2'],
    acknowledged_at: [new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()]
  },
  {
    id: 'handoff-2',
    org_id: 'org-1',
    shift_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    shift_type: 'evening',
    created_by: 'user-2',
    created_at: new Date(Date.now() - 32 * 60 * 60 * 1000).toISOString(),
    staff_name: 'Mike Williams',
    staff_role: 'supervisor',
    summary: 'Evening shift - All clients settled well. RB03 required extra support during dinner.',
    client_updates: [
      {
        client_code: 'RB03',
        client_name: 'Robert B.',
        status: 'monitoring',
        notes: 'Difficulty during dinner, refused to eat initially. Eventually ate after 1:1 support.',
        follow_up_required: true,
        priority: 'high'
      }
    ],
    critical_alerts: ['RB03 showing signs of increased anxiety - monitor closely'],
    medications_given: ['All evening medications administered on schedule'],
    next_shift_tasks: ['Check on RB03 first thing', 'Complete incident report for dinner situation'],
    general_notes: undefined,
    acknowledged_by: [],
    acknowledged_at: []
  }
];

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
  },

  goals: {
    list: async (filters?: { client_code?: string; status?: string }) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      let filtered = [...mockGoals];

      if (filters?.client_code) {
        filtered = filtered.filter(g => g.client_code === filters.client_code);
      }
      if (filters?.status) {
        filtered = filtered.filter(g => g.status === filters.status);
      }

      return filtered;
    },

    get: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockGoals.find(g => g.id === id);
    },

    create: async (data: Omit<BehaviorGoal, 'id' | 'org_id' | 'created_at'>) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const newGoal: BehaviorGoal = {
        ...data,
        id: `goal-${Date.now()}`,
        org_id: mockOrg.id,
        created_at: new Date().toISOString()
      };
      mockGoals.push(newGoal);
      return newGoal;
    },

    update: async (id: string, data: Partial<BehaviorGoal>) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const goalIndex = mockGoals.findIndex(g => g.id === id);
      if (goalIndex === -1) throw new Error('Goal not found');

      mockGoals[goalIndex] = { ...mockGoals[goalIndex], ...data };
      return mockGoals[goalIndex];
    },

    getProgress: async (goalId: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockProgress.filter(p => p.goal_id === goalId).sort((a, b) => a.date.localeCompare(b.date));
    },

    calculateCurrentProgress: async (goalId: string) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const goal = mockGoals.find(g => g.id === goalId);
      if (!goal) return null;

      // Get recent logs for this client and behavior
      const recentLogs = mockLogs.filter(log =>
        log.client_code === goal.client_code &&
        log.behavior_id === goal.behavior_id &&
        new Date(log.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      );

      let currentValue = 0;
      switch (goal.target_metric) {
        case 'frequency':
          currentValue = recentLogs.length;
          break;
        case 'intensity':
          currentValue = recentLogs.reduce((sum, log) => sum + log.intensity, 0) / recentLogs.length || 0;
          break;
        case 'duration':
          currentValue = recentLogs.reduce((sum, log) => sum + (log.duration_min || 0), 0) / recentLogs.length || 0;
          break;
      }

      const progressPercent = goal.goal_type === 'reduce'
        ? Math.max(0, ((goal.current_value - currentValue) / (goal.current_value - goal.target_value)) * 100)
        : Math.max(0, ((currentValue - goal.current_value) / (goal.target_value - goal.current_value)) * 100);

      return {
        currentValue: Math.round(currentValue * 10) / 10,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
        isOnTrack: progressPercent >= 50,
        daysRemaining: Math.max(0, Math.ceil((new Date(goal.target_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      };
    }
  },

  handoffs: {
    list: async (filters?: { shift_date?: string; shift_type?: string }) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      let filtered = [...mockHandoffs];

      if (filters?.shift_date) {
        filtered = filtered.filter(h => h.shift_date === filters.shift_date);
      }
      if (filters?.shift_type) {
        filtered = filtered.filter(h => h.shift_type === filters.shift_type);
      }

      return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    get: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return mockHandoffs.find(h => h.id === id);
    },

    create: async (data: Omit<ShiftHandoff, 'id' | 'org_id' | 'created_at'>) => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const newHandoff: ShiftHandoff = {
        ...data,
        id: `handoff-${Date.now()}`,
        org_id: mockOrg.id,
        created_at: new Date().toISOString(),
        acknowledged_by: [],
        acknowledged_at: []
      };
      mockHandoffs.unshift(newHandoff);
      return newHandoff;
    },

    acknowledge: async (id: string, userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const handoff = mockHandoffs.find(h => h.id === id);
      if (!handoff) throw new Error('Handoff not found');

      if (!handoff.acknowledged_by?.includes(userId)) {
        handoff.acknowledged_by = [...(handoff.acknowledged_by || []), userId];
        handoff.acknowledged_at = [...(handoff.acknowledged_at || []), new Date().toISOString()];
      }
      return handoff;
    },

    getTodaysHandoffs: async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const today = new Date().toISOString().split('T')[0];
      return mockHandoffs.filter(h => h.shift_date === today);
    },

    getUnacknowledged: async (userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const recent = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24 hours
      return mockHandoffs.filter(h =>
        h.created_at >= recent &&
        h.created_by !== userId &&
        (!h.acknowledged_by || !h.acknowledged_by.includes(userId))
      );
    }
  }
};
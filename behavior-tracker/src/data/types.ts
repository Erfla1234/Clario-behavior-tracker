export interface Organization {
  id: string;
  name: string;
}

export interface User {
  id: string;
  org_id: string;
  email: string;
  display_name: string;
  role: 'staff' | 'supervisor';
}

export interface Client {
  id: string;
  org_id: string;
  client_code: string;
  display_name: string;
  active: boolean;
}

export interface Behavior {
  id: string;
  org_id: string;
  name: string;
  description?: string;
}

export interface LogEntry {
  id: string;
  org_id: string;
  client_code: string;
  staff_id: string;
  timestamp: string;
  behavior_id: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  duration_min?: number;
  antecedent?: string;
  behavior_observed?: string;
  consequence?: string;
  notes?: string;
  incident?: boolean;
}

export interface AuditLog {
  id: string;
  org_id: string;
  actor_id: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT';
  entity: string;
  entity_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AuthContext {
  user: User | null;
  org: Organization | null;
  token: string | null;
}

export interface FilterOptions {
  client_code?: string;
  behavior_id?: string;
  date_from?: string;
  date_to?: string;
  staff_id?: string;
  incident?: boolean;
  min_intensity?: number;
  max_intensity?: number;
}
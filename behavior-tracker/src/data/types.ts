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

export interface BehaviorGoal {
  id: string;
  org_id: string;
  client_code: string;
  behavior_id: string;
  goal_type: 'reduce' | 'increase' | 'maintain';
  target_metric: 'frequency' | 'intensity' | 'duration';
  current_value: number;
  target_value: number;
  target_date: string;
  created_by: string;
  created_at: string;
  status: 'active' | 'achieved' | 'paused' | 'discontinued';
  notes?: string;
  interventions?: string[];
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  date: string;
  value: number;
  trend: 'improving' | 'stable' | 'declining';
  notes?: string;
  calculated_at: string;
}

export interface ShiftHandoff {
  id: string;
  org_id: string;
  shift_date: string;
  shift_type: 'morning' | 'afternoon' | 'evening' | 'overnight';
  created_by: string;
  created_at: string;
  staff_name: string;
  staff_role: string;
  summary: string;
  client_updates: ClientUpdate[];
  critical_alerts: string[];
  medications_given: string[];
  next_shift_tasks: string[];
  general_notes?: string;
  acknowledged_by?: string[];
  acknowledged_at?: string[];
}

export interface ClientUpdate {
  client_code: string;
  client_name: string;
  status: 'stable' | 'escalated' | 'improved' | 'monitoring';
  notes: string;
  follow_up_required: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface IncidentReport {
  id: string;
  org_id: string;
  report_number: string;
  client_code: string;
  client_name: string;
  incident_date: string;
  incident_time: string;
  reporter_name: string;
  reporter_role: string;

  // Auto-filled from behavior logs
  related_log_ids: string[];
  behaviors_involved: string[];
  total_duration: number;
  max_intensity: number;

  // Incident details
  location: string;
  witnesses: string[];
  injuries: boolean;
  injury_details?: string;
  property_damage: boolean;
  property_damage_details?: string;

  // Narrative sections
  antecedent_description: string;
  behavior_description: string;
  consequence_description: string;

  // Interventions and outcomes
  interventions_used: string[];
  intervention_effectiveness: 'very_effective' | 'effective' | 'somewhat_effective' | 'not_effective';

  // Follow-up actions
  immediate_actions_taken: string[];
  follow_up_required: boolean;
  follow_up_actions: string[];

  // Notifications
  supervisor_notified: boolean;
  supervisor_notified_time?: string;
  family_notified: boolean;
  family_notified_time?: string;
  other_notifications: string[];

  // Administrative
  created_at: string;
  created_by: string;
  reviewed_by?: string;
  reviewed_at?: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved';
}
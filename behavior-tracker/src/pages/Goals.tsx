import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Nav } from '../components/Nav';
import { mockAdapter } from '../data/adapters/mock';
import { BehaviorGoal } from '../data/types';
import { useAuth } from '../app/providers/AppProvider';

export function Goals() {
  const { auth } = useAuth();
  const [selectedClientCode, setSelectedClientCode] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockAdapter.clients.list()
  });

  const { data: behaviors } = useQuery({
    queryKey: ['behaviors'],
    queryFn: () => mockAdapter.behaviors.list()
  });

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals', selectedClientCode],
    queryFn: () => mockAdapter.goals.list(
      selectedClientCode ? { client_code: selectedClientCode, status: 'active' } : { status: 'active' }
    )
  });

  const { data: selectedGoalProgress } = useQuery({
    queryKey: ['goal-progress', selectedGoalId],
    queryFn: () => selectedGoalId ? mockAdapter.goals.getProgress(selectedGoalId) : null,
    enabled: !!selectedGoalId
  });

  const { data: selectedGoalCurrentProgress } = useQuery({
    queryKey: ['goal-current-progress', selectedGoalId],
    queryFn: () => selectedGoalId ? mockAdapter.goals.calculateCurrentProgress(selectedGoalId) : null,
    enabled: !!selectedGoalId
  });

  const getGoalStatusBadge = (goal: BehaviorGoal) => {
    const daysUntilTarget = differenceInDays(new Date(goal.target_date), new Date());
    const isOverdue = daysUntilTarget < 0;
    const isUrgent = daysUntilTarget <= 7;

    let statusClass = 'goal-status-active';
    let statusText = 'Active';

    if (isOverdue) {
      statusClass = 'goal-status-overdue';
      statusText = 'Overdue';
    } else if (isUrgent) {
      statusClass = 'goal-status-urgent';
      statusText = 'Due Soon';
    }

    return <span className={`goal-status ${statusClass}`}>{statusText}</span>;
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 75) return '#22c55e'; // Green
    if (percent >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const formatGoalMetric = (goal: BehaviorGoal, value: number) => {
    switch (goal.target_metric) {
      case 'frequency':
        return `${value} times/week`;
      case 'intensity':
        return `${value.toFixed(1)} avg intensity`;
      case 'duration':
        return `${value.toFixed(1)} min avg`;
      default:
        return value.toString();
    }
  };

  const selectedGoal = goals?.find(g => g.id === selectedGoalId);

  if (!auth?.user || auth.user.role !== 'supervisor') {
    return (
      <div className="page-container">
        <Nav />
        <main className="page-content">
          <div className="access-denied">
            <div className="access-denied-content">
              <div className="access-denied-icon">🎯</div>
              <h2>Goal Management</h2>
              <p>Goal tracking is available to supervisors only.</p>
              <p>Contact your supervisor for goal updates and progress reports.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Nav />
      <main className="page-content">
        <div className="page-header">
          <h1>Goal Tracking</h1>
          <p>Monitor client behavior goals and progress</p>
        </div>

        {/* Filter Controls */}
        <div className="goals-filters">
          <div className="filter-group">
            <label>Client</label>
            <select
              value={selectedClientCode}
              onChange={(e) => {
                setSelectedClientCode(e.target.value);
                setSelectedGoalId(null);
              }}
            >
              <option value="">All Clients</option>
              {clients?.map(client => (
                <option key={client.id} value={client.client_code}>
                  {client.client_code} - {client.display_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Goals Grid */}
        {isLoading ? (
          <div className="loading">Loading goals...</div>
        ) : (
          <div className="goals-layout">
            <div className="goals-list">
              <div className="goals-list-header">
                <h3>Active Goals ({goals?.length || 0})</h3>
              </div>

              {goals?.length === 0 ? (
                <div className="no-goals">
                  <div className="no-goals-icon">🎯</div>
                  <p>No active goals found</p>
                  <small>Goals help track client progress toward specific behavior targets</small>
                </div>
              ) : (
                <div className="goals-cards">
                  {goals?.map(goal => {
                    const client = clients?.find(c => c.client_code === goal.client_code);
                    const behavior = behaviors?.find(b => b.id === goal.behavior_id);
                    const isSelected = selectedGoalId === goal.id;

                    return (
                      <div
                        key={goal.id}
                        className={`goal-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedGoalId(goal.id)}
                      >
                        <div className="goal-card-header">
                          <div className="goal-client">
                            <strong>{client?.display_name}</strong>
                            <span className="client-code">({goal.client_code})</span>
                          </div>
                          {getGoalStatusBadge(goal)}
                        </div>

                        <div className="goal-behavior">
                          <span className="goal-type-badge goal-type-{goal.goal_type}">
                            {goal.goal_type === 'reduce' ? '↓' : goal.goal_type === 'increase' ? '↑' : '→'} {goal.goal_type}
                          </span>
                          <span className="behavior-name">{behavior?.name}</span>
                        </div>

                        <div className="goal-target">
                          <div className="target-metric">
                            <span className="metric-label">{goal.target_metric}:</span>
                            <span className="current-value">{formatGoalMetric(goal, goal.current_value)}</span>
                            <span className="arrow">→</span>
                            <span className="target-value">{formatGoalMetric(goal, goal.target_value)}</span>
                          </div>
                        </div>

                        <div className="goal-timeline">
                          <span className="target-date">Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                          <span className="days-remaining">
                            {differenceInDays(new Date(goal.target_date), new Date())} days left
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Goal Details Panel */}
            {selectedGoal && (
              <div className="goal-details">
                <div className="goal-details-header">
                  <h3>Goal Progress</h3>
                  <button
                    className="close-details"
                    onClick={() => setSelectedGoalId(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="progress-overview">
                  <div className="progress-circle">
                    <div className="progress-value">
                      {selectedGoalCurrentProgress?.progressPercent.toFixed(0) || 0}%
                    </div>
                    <div className="progress-label">Complete</div>
                  </div>

                  <div className="progress-stats">
                    <div className="stat">
                      <label>Current</label>
                      <span className="stat-value">{formatGoalMetric(selectedGoal, selectedGoalCurrentProgress?.currentValue || 0)}</span>
                    </div>
                    <div className="stat">
                      <label>Target</label>
                      <span className="stat-value">{formatGoalMetric(selectedGoal, selectedGoal.target_value)}</span>
                    </div>
                    <div className="stat">
                      <label>Days Left</label>
                      <span className="stat-value">{selectedGoalCurrentProgress?.daysRemaining || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="progress-chart">
                  <h4>Progress Trend</h4>
                  {selectedGoalProgress && (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={selectedGoalProgress}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) => format(new Date(date), 'M/d')}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                          formatter={(value) => [formatGoalMetric(selectedGoal, value as number), 'Value']}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={getProgressColor(selectedGoalCurrentProgress?.progressPercent || 0)}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="goal-interventions">
                  <h4>Interventions</h4>
                  <div className="interventions-list">
                    {selectedGoal.interventions?.map((intervention, index) => (
                      <span key={index} className="intervention-tag">
                        {intervention}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedGoal.notes && (
                  <div className="goal-notes">
                    <h4>Notes</h4>
                    <p>{selectedGoal.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
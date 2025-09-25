import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { Nav } from '../components/Nav';
import { mockAdapter } from '../data/adapters/mock';
import { ShiftHandoff, ClientUpdate } from '../data/types';
import { useAuth } from '../app/providers/AppProvider';

export function ShiftHandoff() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [showNewHandoff, setShowNewHandoff] = useState(false);
  const [selectedHandoff, setSelectedHandoff] = useState<ShiftHandoff | null>(null);

  // Form state for new handoff
  const [formData, setFormData] = useState({
    shift_type: 'morning' as const,
    summary: '',
    critical_alerts: [''],
    medications_given: [''],
    next_shift_tasks: [''],
    general_notes: '',
    client_updates: [] as ClientUpdate[]
  });

  const [newClientUpdate, setNewClientUpdate] = useState<ClientUpdate>({
    client_code: '',
    client_name: '',
    status: 'stable' as const,
    notes: '',
    follow_up_required: false,
    priority: 'medium' as const
  });

  // Fetch data
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockAdapter.clients.list()
  });

  const { data: handoffs, isLoading } = useQuery({
    queryKey: ['handoffs'],
    queryFn: () => mockAdapter.handoffs.getTodaysHandoffs()
  });

  const { data: unacknowledged } = useQuery({
    queryKey: ['unacknowledged-handoffs', auth?.user?.id],
    queryFn: () => mockAdapter.handoffs.getUnacknowledged(auth?.user?.id || ''),
    enabled: !!auth?.user?.id
  });

  // Mutations
  const createHandoff = useMutation({
    mutationFn: (data: Omit<ShiftHandoff, 'id' | 'org_id' | 'created_at'>) =>
      mockAdapter.handoffs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      setShowNewHandoff(false);
      resetForm();
    }
  });

  const acknowledgeHandoff = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      mockAdapter.handoffs.acknowledge(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['unacknowledged-handoffs'] });
    }
  });

  const resetForm = () => {
    setFormData({
      shift_type: 'morning',
      summary: '',
      critical_alerts: [''],
      medications_given: [''],
      next_shift_tasks: [''],
      general_notes: '',
      client_updates: []
    });
  };

  const handleAddClientUpdate = () => {
    if (newClientUpdate.client_code && newClientUpdate.notes) {
      setFormData(prev => ({
        ...prev,
        client_updates: [...prev.client_updates, { ...newClientUpdate }]
      }));
      setNewClientUpdate({
        client_code: '',
        client_name: '',
        status: 'stable',
        notes: '',
        follow_up_required: false,
        priority: 'medium'
      });
    }
  };

  const handleArrayFieldChange = (field: 'critical_alerts' | 'medications_given' | 'next_shift_tasks', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const handleAddArrayField = (field: 'critical_alerts' | 'medications_given' | 'next_shift_tasks') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const handleRemoveArrayField = (field: 'critical_alerts' | 'medications_given' | 'next_shift_tasks', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const handoffData = {
      ...formData,
      shift_date: new Date().toISOString().split('T')[0],
      created_by: auth?.user?.id || '',
      staff_name: auth?.user?.display_name || '',
      staff_role: auth?.user?.role || 'staff',
      critical_alerts: formData.critical_alerts.filter(a => a.trim()),
      medications_given: formData.medications_given.filter(m => m.trim()),
      next_shift_tasks: formData.next_shift_tasks.filter(t => t.trim())
    };

    createHandoff.mutate(handoffData);
  };

  const getShiftIcon = (type: string) => {
    const icons = {
      morning: '🌅',
      afternoon: '☀️',
      evening: '🌆',
      overnight: '🌙'
    };
    return icons[type as keyof typeof icons] || '📋';
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      stable: 'status-stable',
      escalated: 'status-escalated',
      improved: 'status-improved',
      monitoring: 'status-monitoring'
    };
    return classes[status as keyof typeof classes] || 'status-stable';
  };

  const getPriorityBadge = (priority: string) => {
    const classes = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      urgent: 'priority-urgent'
    };
    return classes[priority as keyof typeof classes] || 'priority-medium';
  };

  return (
    <div className="page-container">
      <Nav />
      <main className="page-content">
        <div className="page-header">
          <h1>Shift Handoff</h1>
          <p>Communicate critical information between shifts</p>
        </div>

        {/* Unacknowledged Handoffs Alert */}
        {unacknowledged && unacknowledged.length > 0 && (
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <span>You have {unacknowledged.length} unacknowledged handoff{unacknowledged.length > 1 ? 's' : ''} to review</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="handoff-actions">
          <button
            className="btn-primary"
            onClick={() => setShowNewHandoff(true)}
          >
            <span>📝</span>
            Create Shift Handoff
          </button>
        </div>

        {/* New Handoff Form */}
        {showNewHandoff && (
          <div className="handoff-form-container">
            <div className="handoff-form">
              <div className="form-header">
                <h3>Create Shift Handoff</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowNewHandoff(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Shift Type</label>
                  <select
                    value={formData.shift_type}
                    onChange={(e) => setFormData({ ...formData, shift_type: e.target.value as any })}
                    required
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="overnight">Overnight</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Shift Summary</label>
                  <textarea
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Provide a brief overview of your shift..."
                    rows={3}
                    required
                  />
                </div>

                {/* Client Updates Section */}
                <div className="form-section">
                  <h4>Client Updates</h4>

                  {formData.client_updates.map((update, index) => (
                    <div key={index} className="client-update-card">
                      <div className="update-header">
                        <strong>{update.client_name} ({update.client_code})</strong>
                        <span className={`status-badge ${getStatusBadge(update.status)}`}>
                          {update.status}
                        </span>
                      </div>
                      <p>{update.notes}</p>
                      <div className="update-footer">
                        <span className={`priority-badge ${getPriorityBadge(update.priority)}`}>
                          {update.priority} priority
                        </span>
                        {update.follow_up_required && (
                          <span className="follow-up-badge">Follow-up Required</span>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="add-client-update">
                    <select
                      value={newClientUpdate.client_code}
                      onChange={(e) => {
                        const client = clients?.find(c => c.client_code === e.target.value);
                        setNewClientUpdate({
                          ...newClientUpdate,
                          client_code: e.target.value,
                          client_name: client?.display_name || ''
                        });
                      }}
                    >
                      <option value="">Select Client</option>
                      {clients?.map(client => (
                        <option key={client.id} value={client.client_code}>
                          {client.client_code} - {client.display_name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={newClientUpdate.status}
                      onChange={(e) => setNewClientUpdate({ ...newClientUpdate, status: e.target.value as any })}
                    >
                      <option value="stable">Stable</option>
                      <option value="improved">Improved</option>
                      <option value="escalated">Escalated</option>
                      <option value="monitoring">Monitoring</option>
                    </select>

                    <select
                      value={newClientUpdate.priority}
                      onChange={(e) => setNewClientUpdate({ ...newClientUpdate, priority: e.target.value as any })}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    <textarea
                      value={newClientUpdate.notes}
                      onChange={(e) => setNewClientUpdate({ ...newClientUpdate, notes: e.target.value })}
                      placeholder="Notes about this client..."
                      rows={2}
                    />

                    <label>
                      <input
                        type="checkbox"
                        checked={newClientUpdate.follow_up_required}
                        onChange={(e) => setNewClientUpdate({ ...newClientUpdate, follow_up_required: e.target.checked })}
                      />
                      Follow-up Required
                    </label>

                    <button
                      type="button"
                      onClick={handleAddClientUpdate}
                      className="btn-secondary"
                    >
                      Add Client Update
                    </button>
                  </div>
                </div>

                {/* Critical Alerts */}
                <div className="form-section">
                  <h4>Critical Alerts</h4>
                  {formData.critical_alerts.map((alert, index) => (
                    <div key={index} className="array-field">
                      <input
                        type="text"
                        value={alert}
                        onChange={(e) => handleArrayFieldChange('critical_alerts', index, e.target.value)}
                        placeholder="Enter critical alert..."
                      />
                      {formData.critical_alerts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveArrayField('critical_alerts', index)}
                          className="remove-btn"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddArrayField('critical_alerts')}
                    className="add-field-btn"
                  >
                    + Add Alert
                  </button>
                </div>

                {/* Medications Given */}
                <div className="form-section">
                  <h4>Medications Administered</h4>
                  {formData.medications_given.map((med, index) => (
                    <div key={index} className="array-field">
                      <input
                        type="text"
                        value={med}
                        onChange={(e) => handleArrayFieldChange('medications_given', index, e.target.value)}
                        placeholder="e.g., JD01 - Morning meds at 8:00 AM"
                      />
                      {formData.medications_given.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveArrayField('medications_given', index)}
                          className="remove-btn"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddArrayField('medications_given')}
                    className="add-field-btn"
                  >
                    + Add Medication
                  </button>
                </div>

                {/* Next Shift Tasks */}
                <div className="form-section">
                  <h4>Tasks for Next Shift</h4>
                  {formData.next_shift_tasks.map((task, index) => (
                    <div key={index} className="array-field">
                      <input
                        type="text"
                        value={task}
                        onChange={(e) => handleArrayFieldChange('next_shift_tasks', index, e.target.value)}
                        placeholder="Task for next shift..."
                      />
                      {formData.next_shift_tasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveArrayField('next_shift_tasks', index)}
                          className="remove-btn"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddArrayField('next_shift_tasks')}
                    className="add-field-btn"
                  >
                    + Add Task
                  </button>
                </div>

                {/* General Notes */}
                <div className="form-group">
                  <label>General Notes (Optional)</label>
                  <textarea
                    value={formData.general_notes}
                    onChange={(e) => setFormData({ ...formData, general_notes: e.target.value })}
                    placeholder="Any additional notes for the next shift..."
                    rows={3}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setShowNewHandoff(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={createHandoff.isPending}
                  >
                    {createHandoff.isPending ? 'Creating...' : 'Create Handoff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Handoffs List */}
        {isLoading ? (
          <div className="loading">Loading handoffs...</div>
        ) : (
          <div className="handoffs-grid">
            {handoffs?.length === 0 ? (
              <div className="no-handoffs">
                <div className="no-handoffs-icon">📋</div>
                <p>No handoffs for today yet</p>
                <small>Create the first handoff for today's shifts</small>
              </div>
            ) : (
              handoffs?.map(handoff => {
                const isAcknowledged = handoff.acknowledged_by?.includes(auth?.user?.id || '');
                const isAuthor = handoff.created_by === auth?.user?.id;

                return (
                  <div
                    key={handoff.id}
                    className={`handoff-card ${!isAcknowledged && !isAuthor ? 'unacknowledged' : ''}`}
                    onClick={() => setSelectedHandoff(handoff)}
                  >
                    <div className="handoff-header">
                      <div className="shift-info">
                        <span className="shift-icon">{getShiftIcon(handoff.shift_type)}</span>
                        <div>
                          <h3>{handoff.shift_type.charAt(0).toUpperCase() + handoff.shift_type.slice(1)} Shift</h3>
                          <span className="handoff-meta">
                            {handoff.staff_name} • {formatDistanceToNow(new Date(handoff.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      {!isAcknowledged && !isAuthor && (
                        <button
                          className="acknowledge-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeHandoff.mutate({ id: handoff.id, userId: auth?.user?.id || '' });
                          }}
                        >
                          ✓ Acknowledge
                        </button>
                      )}
                    </div>

                    <div className="handoff-summary">
                      {handoff.summary}
                    </div>

                    {handoff.critical_alerts.length > 0 && (
                      <div className="critical-alerts">
                        <strong>⚠️ Critical Alerts:</strong>
                        <ul>
                          {handoff.critical_alerts.slice(0, 2).map((alert, index) => (
                            <li key={index}>{alert}</li>
                          ))}
                          {handoff.critical_alerts.length > 2 && (
                            <li>+{handoff.critical_alerts.length - 2} more...</li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="handoff-stats">
                      <span className="stat">
                        <strong>{handoff.client_updates.length}</strong> client updates
                      </span>
                      <span className="stat">
                        <strong>{handoff.next_shift_tasks.length}</strong> tasks
                      </span>
                      {handoff.acknowledged_by && handoff.acknowledged_by.length > 0 && (
                        <span className="stat acknowledged">
                          ✓ {handoff.acknowledged_by.length} acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Detailed View Modal */}
        {selectedHandoff && (
          <div className="handoff-modal" onClick={() => setSelectedHandoff(null)}>
            <div className="handoff-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {getShiftIcon(selectedHandoff.shift_type)} {selectedHandoff.shift_type.charAt(0).toUpperCase() + selectedHandoff.shift_type.slice(1)} Shift Handoff
                </h2>
                <button
                  className="close-btn"
                  onClick={() => setSelectedHandoff(null)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <div className="handoff-details">
                  <div className="detail-row">
                    <strong>Staff:</strong> {selectedHandoff.staff_name} ({selectedHandoff.staff_role})
                  </div>
                  <div className="detail-row">
                    <strong>Date:</strong> {format(new Date(selectedHandoff.created_at), 'PPpp')}
                  </div>
                </div>

                <div className="section">
                  <h4>Shift Summary</h4>
                  <p>{selectedHandoff.summary}</p>
                </div>

                {selectedHandoff.client_updates.length > 0 && (
                  <div className="section">
                    <h4>Client Updates</h4>
                    {selectedHandoff.client_updates.map((update, index) => (
                      <div key={index} className="client-update-detail">
                        <div className="update-header">
                          <strong>{update.client_name} ({update.client_code})</strong>
                          <div className="badges">
                            <span className={`status-badge ${getStatusBadge(update.status)}`}>
                              {update.status}
                            </span>
                            <span className={`priority-badge ${getPriorityBadge(update.priority)}`}>
                              {update.priority}
                            </span>
                            {update.follow_up_required && (
                              <span className="follow-up-badge">Follow-up Required</span>
                            )}
                          </div>
                        </div>
                        <p>{update.notes}</p>
                      </div>
                    ))}
                  </div>
                )}

                {selectedHandoff.critical_alerts.length > 0 && (
                  <div className="section">
                    <h4>Critical Alerts</h4>
                    <ul className="alert-list">
                      {selectedHandoff.critical_alerts.map((alert, index) => (
                        <li key={index}>{alert}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedHandoff.medications_given.length > 0 && (
                  <div className="section">
                    <h4>Medications Administered</h4>
                    <ul>
                      {selectedHandoff.medications_given.map((med, index) => (
                        <li key={index}>{med}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedHandoff.next_shift_tasks.length > 0 && (
                  <div className="section">
                    <h4>Tasks for Next Shift</h4>
                    <ul className="task-list">
                      {selectedHandoff.next_shift_tasks.map((task, index) => (
                        <li key={index}>{task}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedHandoff.general_notes && (
                  <div className="section">
                    <h4>General Notes</h4>
                    <p>{selectedHandoff.general_notes}</p>
                  </div>
                )}

                {selectedHandoff.acknowledged_by && selectedHandoff.acknowledged_by.length > 0 && (
                  <div className="section">
                    <h4>Acknowledgements</h4>
                    <div className="acknowledgements">
                      {selectedHandoff.acknowledged_by.map((userId, index) => (
                        <div key={userId} className="acknowledgement">
                          ✓ User {userId} • {selectedHandoff.acknowledged_at && formatDistanceToNow(new Date(selectedHandoff.acknowledged_at[index]), { addSuffix: true })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockAdapter } from '../../data/adapters/mock';
import { LogEntry } from '../../data/types';
import { useAuth } from '../../app/providers/AppProvider';

export function LogForm() {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    client_code: '',
    behavior_id: '',
    intensity: 3 as 1 | 2 | 3 | 4 | 5,
    duration_min: '',
    antecedent: '',
    behavior_observed: '',
    consequence: '',
    notes: '',
    incident: false
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockAdapter.clients.list()
  });

  const { data: behaviors } = useQuery({
    queryKey: ['behaviors'],
    queryFn: () => mockAdapter.behaviors.list()
  });

  const createLog = useMutation({
    mutationFn: (data: Omit<LogEntry, 'id' | 'org_id' | 'timestamp'>) =>
      mockAdapter.logs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      setFormData({
        client_code: '',
        behavior_id: '',
        intensity: 3,
        duration_min: '',
        antecedent: '',
        behavior_observed: '',
        consequence: '',
        notes: '',
        incident: false
      });
      alert('Log entry saved successfully');
    }
  });

  useEffect(() => {
    const savedForm = localStorage.getItem('log_form_draft');
    if (savedForm) {
      setFormData(JSON.parse(savedForm));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('log_form_draft', JSON.stringify(formData));
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_code || !formData.behavior_id) {
      alert('Please select a client and behavior');
      return;
    }

    createLog.mutate({
      ...formData,
      staff_id: auth?.user?.id || '',
      duration_min: formData.duration_min ? parseInt(formData.duration_min) : undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="log-form">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="client">Client *</label>
          <select
            id="client"
            value={formData.client_code}
            onChange={(e) => setFormData({ ...formData, client_code: e.target.value })}
            required
          >
            <option value="">Select client</option>
            {clients?.map(client => (
              <option key={client.id} value={client.client_code}>
                {client.client_code} - {client.display_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="behavior">Behavior *</label>
          <select
            id="behavior"
            value={formData.behavior_id}
            onChange={(e) => setFormData({ ...formData, behavior_id: e.target.value })}
            required
          >
            <option value="">Select behavior</option>
            {behaviors?.map(behavior => (
              <option key={behavior.id} value={behavior.id}>
                {behavior.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="intensity">Intensity (1-5) *</label>
          <input
            type="range"
            id="intensity"
            min="1"
            max="5"
            value={formData.intensity}
            onChange={(e) => setFormData({ ...formData, intensity: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
          />
          <span className="intensity-value">{formData.intensity}</span>
        </div>

        <div className="form-group">
          <label htmlFor="duration">Duration (minutes)</label>
          <input
            type="number"
            id="duration"
            min="0"
            value={formData.duration_min}
            onChange={(e) => setFormData({ ...formData, duration_min: e.target.value })}
            placeholder="Optional"
          />
        </div>
      </div>

      <h3>ABC Data</h3>
      <div className="form-group">
        <label htmlFor="antecedent">Antecedent</label>
        <textarea
          id="antecedent"
          rows={2}
          value={formData.antecedent}
          onChange={(e) => setFormData({ ...formData, antecedent: e.target.value })}
          placeholder="What happened before the behavior?"
        />
      </div>

      <div className="form-group">
        <label htmlFor="behavior_observed">Behavior Observed</label>
        <textarea
          id="behavior_observed"
          rows={2}
          value={formData.behavior_observed}
          onChange={(e) => setFormData({ ...formData, behavior_observed: e.target.value })}
          placeholder="Describe the behavior in detail"
        />
      </div>

      <div className="form-group">
        <label htmlFor="consequence">Consequence</label>
        <textarea
          id="consequence"
          rows={2}
          value={formData.consequence}
          onChange={(e) => setFormData({ ...formData, consequence: e.target.value })}
          placeholder="What happened after the behavior?"
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Additional Notes</label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any other relevant information"
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={formData.incident}
            onChange={(e) => setFormData({ ...formData, incident: e.target.checked })}
          />
          Mark as incident
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary" disabled={createLog.isPending}>
          {createLog.isPending ? 'Saving...' : 'Save Log Entry'}
        </button>
      </div>
    </form>
  );
}
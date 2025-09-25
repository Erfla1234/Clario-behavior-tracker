import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mockAdapter } from '../../data/adapters/mock';
import { apiAdapter } from '../../data/adapters/api';
import { LogEntry } from '../../data/types';
import { useAuth } from '../../app/providers/AppProvider';

interface QuickLogProps {
  onSwitchToFull?: () => void;
}

export function QuickLogForm({ onSwitchToFull }: QuickLogProps) {
  const { auth } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    client_code: '',
    behavior_id: '',
    intensity: 3 as 1 | 2 | 3 | 4 | 5,
    duration_min: '5',
    notes: '',
    incident: false
  });

  const [lastUsed, setLastUsed] = useState({
    client_code: '',
    behavior_id: ''
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockAdapter.clients.list()
  });

  const { data: behaviors } = useQuery({
    queryKey: ['behaviors'],
    queryFn: () => mockAdapter.behaviors.list()
  });

  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => apiAdapter.templates.list(),
    enabled: !!auth?.user
  });

  const createLog = useMutation({
    mutationFn: (data: Omit<LogEntry, 'id' | 'org_id' | 'timestamp'>) =>
      mockAdapter.logs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });

      // Save as last used for next time
      const newLastUsed = {
        client_code: formData.client_code,
        behavior_id: formData.behavior_id
      };
      setLastUsed(newLastUsed);
      localStorage.setItem('quick_log_last_used', JSON.stringify(newLastUsed));

      // Clear form but keep client/behavior for next log
      setFormData({
        client_code: formData.client_code,
        behavior_id: formData.behavior_id,
        intensity: 3,
        duration_min: '5',
        notes: '',
        incident: false
      });

      // Clear draft
      localStorage.removeItem('quick_log_draft');

      // Show success message
      const toast = document.createElement('div');
      toast.className = 'toast toast-success';
      toast.textContent = '✓ Logged successfully';
      toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #22c55e;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  });

  // Load last used and draft on mount
  useEffect(() => {
    const savedLastUsed = localStorage.getItem('quick_log_last_used');
    if (savedLastUsed) {
      const parsed = JSON.parse(savedLastUsed);
      setLastUsed(parsed);
      setFormData(prev => ({
        ...prev,
        client_code: parsed.client_code,
        behavior_id: parsed.behavior_id
      }));
    }

    const savedDraft = localStorage.getItem('quick_log_draft');
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft));
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.client_code || formData.notes) {
        localStorage.setItem('quick_log_draft', JSON.stringify(formData));
      }
    }, 2000);
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
      duration_min: formData.duration_min ? parseInt(formData.duration_min) : undefined,
      antecedent: '',
      behavior_observed: '',
      consequence: ''
    });
  };

  const clearDraft = () => {
    localStorage.removeItem('quick_log_draft');
    setFormData({
      client_code: lastUsed.client_code,
      behavior_id: lastUsed.behavior_id,
      intensity: 3,
      duration_min: '5',
      notes: '',
      incident: false
    });
  };

  const applyTemplate = (templateId: string) => {
    const template = templates?.find((t: any) => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        behavior_id: template.behavior_id,
        intensity: template.default_intensity,
        duration_min: template.default_duration_min?.toString() || '5',
        notes: template.notes_template || ''
      }));
    }
  };

  return (
    <div className="quick-log-form">
      <div className="quick-log-header">
        <h2>Quick Log</h2>
        <div className="quick-log-actions">
          <button type="button" onClick={clearDraft} className="btn-link">
            Clear Draft
          </button>
          {onSwitchToFull && (
            <button type="button" onClick={onSwitchToFull} className="btn-link">
              Full Form
            </button>
          )}
        </div>
      </div>

      {/* Template Selector */}
      {templates && templates.length > 0 && (
        <div className="template-selector">
          <label>Quick Templates</label>
          <div className="template-buttons">
            {templates.map((template: any) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.id)}
                className="template-btn"
                title={template.notes_template || ''}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="quick-log-form-content">
        {/* Client Selection - Large Touch Target */}
        <div className="form-group quick-select">
          <label htmlFor="quick-client">Client *</label>
          <select
            id="quick-client"
            value={formData.client_code}
            onChange={(e) => setFormData({ ...formData, client_code: e.target.value })}
            required
            className="quick-select-input"
          >
            <option value="">Choose client...</option>
            {clients?.map(client => (
              <option key={client.id} value={client.client_code}>
                {client.client_code} - {client.display_name}
              </option>
            ))}
          </select>
        </div>

        {/* Behavior Selection - Large Touch Target */}
        <div className="form-group quick-select">
          <label htmlFor="quick-behavior">Behavior *</label>
          <select
            id="quick-behavior"
            value={formData.behavior_id}
            onChange={(e) => setFormData({ ...formData, behavior_id: e.target.value })}
            required
            className="quick-select-input"
          >
            <option value="">Choose behavior...</option>
            {behaviors?.map(behavior => (
              <option key={behavior.id} value={behavior.id}>
                {behavior.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Controls Row */}
        <div className="quick-controls">
          <div className="intensity-quick">
            <label>Intensity</label>
            <div className="intensity-slider-quick">
              <input
                type="range"
                min="1"
                max="5"
                value={formData.intensity}
                onChange={(e) => setFormData({ ...formData, intensity: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
                className="intensity-range"
              />
              <div className="intensity-display">{formData.intensity}</div>
            </div>
          </div>

          <div className="duration-quick">
            <label htmlFor="quick-duration">Minutes</label>
            <input
              type="number"
              id="quick-duration"
              min="1"
              max="240"
              value={formData.duration_min}
              onChange={(e) => setFormData({ ...formData, duration_min: e.target.value })}
              className="duration-input"
            />
          </div>

          <div className="incident-quick">
            <label className="incident-toggle">
              <input
                type="checkbox"
                checked={formData.incident}
                onChange={(e) => setFormData({ ...formData, incident: e.target.checked })}
              />
              <span className="incident-label">Incident?</span>
            </label>
          </div>
        </div>

        {/* Notes - Optional */}
        <div className="form-group">
          <label htmlFor="quick-notes">Notes (Optional)</label>
          <textarea
            id="quick-notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Quick notes about the incident..."
            className="quick-notes-input"
          />
        </div>

        {/* Submit Button - Large and Prominent */}
        <div className="quick-submit">
          <button
            type="submit"
            className="btn-primary quick-submit-btn"
            disabled={createLog.isPending}
          >
            {createLog.isPending ? '⏳ Saving...' : '✓ Log Behavior'}
          </button>
        </div>
      </form>
    </div>
  );
}
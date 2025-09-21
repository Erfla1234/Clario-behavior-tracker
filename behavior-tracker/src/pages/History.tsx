import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Nav } from '../components/Nav';
import { mockAdapter } from '../data/adapters/mock';
import { FilterOptions } from '../data/types';

export function History() {
  const [filters, setFilters] = useState<FilterOptions>({});

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockAdapter.clients.list()
  });

  const { data: behaviors } = useQuery({
    queryKey: ['behaviors'],
    queryFn: () => mockAdapter.behaviors.list()
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => mockAdapter.logs.list(filters)
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  return (
    <div className="page-container">
      <Nav />
      <main className="page-content">
        <div className="page-header">
          <h1>History</h1>
          <p>View and filter behavior log entries</p>
        </div>

        <div className="filters-panel">
          <div className="filter-group">
            <label>Client</label>
            <select
              value={filters.client_code || ''}
              onChange={(e) => handleFilterChange('client_code', e.target.value)}
            >
              <option value="">All Clients</option>
              {clients?.map(client => (
                <option key={client.id} value={client.client_code}>
                  {client.client_code} - {client.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Behavior</label>
            <select
              value={filters.behavior_id || ''}
              onChange={(e) => handleFilterChange('behavior_id', e.target.value)}
            >
              <option value="">All Behaviors</option>
              {behaviors?.map(behavior => (
                <option key={behavior.id} value={behavior.id}>
                  {behavior.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.date_from?.split('T')[0] || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value ? e.target.value + 'T00:00:00Z' : '')}
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.date_to?.split('T')[0] || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value ? e.target.value + 'T23:59:59Z' : '')}
            />
          </div>

          <button
            className="btn-secondary"
            onClick={() => setFilters({})}
          >
            Clear Filters
          </button>
        </div>

        {isLoading ? (
          <div className="loading">Loading logs...</div>
        ) : (
          <div className="logs-table">
            <table>
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Client</th>
                  <th>Behavior</th>
                  <th>Intensity</th>
                  <th>Duration</th>
                  <th>Incident</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">No logs found</td>
                  </tr>
                ) : (
                  logs?.map(log => {
                    const client = clients?.find(c => c.client_code === log.client_code);
                    const behavior = behaviors?.find(b => b.id === log.behavior_id);
                    return (
                      <tr key={log.id}>
                        <td>{format(new Date(log.timestamp), 'MM/dd/yyyy HH:mm')}</td>
                        <td>{client?.display_name} ({log.client_code})</td>
                        <td>{behavior?.name}</td>
                        <td>
                          <span className={`intensity intensity-${log.intensity}`}>
                            {log.intensity}
                          </span>
                        </td>
                        <td>{log.duration_min ? `${log.duration_min} min` : '-'}</td>
                        <td>{log.incident ? '⚠️ Yes' : 'No'}</td>
                        <td className="notes-cell">{log.notes || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
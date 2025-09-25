import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Nav } from '../components/Nav';
import { mockAdapter } from '../data/adapters/mock';
import { FilterOptions } from '../data/types';

interface QuickFilter {
  id: string;
  label: string;
  icon?: string;
  filter: Partial<FilterOptions>;
}

export function History() {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Quick filter presets
  const quickFilters: QuickFilter[] = useMemo(() => [
    {
      id: 'today',
      label: 'Today',
      icon: '📅',
      filter: {
        date_from: format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        date_to: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss'Z'")
      }
    },
    {
      id: '7days',
      label: '7 Days',
      icon: '📊',
      filter: {
        date_from: format(startOfDay(subDays(new Date(), 7)), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        date_to: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss'Z'")
      }
    },
    {
      id: '30days',
      label: '30 Days',
      icon: '📈',
      filter: {
        date_from: format(startOfDay(subDays(new Date(), 30)), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
        date_to: format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss'Z'")
      }
    },
    {
      id: 'incidents',
      label: 'Incidents Only',
      icon: '⚠️',
      filter: { incident: true }
    },
    {
      id: 'high-intensity',
      label: 'High Intensity (4-5)',
      icon: '🔥',
      filter: { min_intensity: 4 }
    }
  ], []);

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!logs || !searchQuery.trim()) return logs;

    const query = searchQuery.toLowerCase();
    return logs.filter(log => {
      const client = clients?.find(c => c.client_code === log.client_code);
      const behavior = behaviors?.find(b => b.id === log.behavior_id);

      return (
        client?.display_name.toLowerCase().includes(query) ||
        client?.client_code.toLowerCase().includes(query) ||
        behavior?.name.toLowerCase().includes(query) ||
        log.notes?.toLowerCase().includes(query) ||
        log.antecedent?.toLowerCase().includes(query) ||
        log.consequence?.toLowerCase().includes(query)
      );
    });
  }, [logs, searchQuery, clients, behaviors]);

  const handleQuickFilter = (quickFilter: QuickFilter) => {
    setFilters(prev => ({
      ...prev,
      ...quickFilter.filter
    }));
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string | boolean | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const getActiveFiltersCount = () => {
    const activeKeys = Object.keys(filters).filter(key => filters[key as keyof FilterOptions] !== undefined);
    return activeKeys.length + (searchQuery.trim() ? 1 : 0);
  };

  return (
    <div className="page-container">
      <Nav />
      <main className="page-content">
        <div className="page-header">
          <h1>History</h1>
          <p>View and filter behavior log entries</p>
        </div>

        {/* Quick Filter Pills */}
        <div className="quick-filters">
          <div className="quick-filters-header">
            <h3>Quick Filters</h3>
            <div className="filter-count">
              {getActiveFiltersCount() > 0 && (
                <span className="active-count">{getActiveFiltersCount()} active</span>
              )}
            </div>
          </div>
          <div className="filter-pills">
            {quickFilters.map(quickFilter => (
              <button
                key={quickFilter.id}
                className="filter-pill"
                onClick={() => handleQuickFilter(quickFilter)}
                title={`Apply ${quickFilter.label} filter`}
              >
                <span className="pill-icon">{quickFilter.icon}</span>
                <span className="pill-label">{quickFilter.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search by client, behavior, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="search-clear"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="filters-panel">
          <div className="filters-header">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="toggle-advanced"
            >
              <span>Advanced Filters</span>
              <span className="toggle-icon">{showAdvanced ? '▼' : '▶'}</span>
            </button>
            {getActiveFiltersCount() > 0 && (
              <button onClick={clearFilters} className="btn-clear">
                Clear All ({getActiveFiltersCount()})
              </button>
            )}
          </div>

          {showAdvanced && (
            <div className="filters-grid">
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

              <div className="filter-group">
                <label>Min Intensity</label>
                <select
                  value={filters.min_intensity || ''}
                  onChange={(e) => handleFilterChange('min_intensity', e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Any</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Incidents Only</label>
                <input
                  type="checkbox"
                  checked={filters.incident || false}
                  onChange={(e) => handleFilterChange('incident', e.target.checked)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {!isLoading && filteredLogs && (
          <div className="results-summary">
            <span className="results-count">
              {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} found
            </span>
            {getActiveFiltersCount() > 0 && (
              <span className="filter-summary">
                • {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
        )}

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
                {filteredLogs?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      {searchQuery || getActiveFiltersCount() > 0
                        ? 'No logs match your current filters'
                        : 'No logs found'}
                    </td>
                  </tr>
                ) : (
                  filteredLogs?.map(log => {
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
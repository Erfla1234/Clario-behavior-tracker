import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Nav } from '../components/Nav';
import { mockAdapter } from '../data/adapters/mock';
import { FilterOptions } from '../data/types';
import { csvUtils } from '../lib/csv';
import { pdfUtils } from '../lib/pdf';
import { useAuth } from '../app/providers/AppProvider';

export function Reports() {
  const { auth } = useAuth();
  const [filters, setFilters] = useState<FilterOptions>({});

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => mockAdapter.clients.list()
  });

  const { data: behaviors } = useQuery({
    queryKey: ['behaviors'],
    queryFn: () => mockAdapter.behaviors.list()
  });

  const { data: logs } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => mockAdapter.logs.list(filters)
  });

  const { data: reportData } = useQuery({
    queryKey: ['reports', filters],
    queryFn: () => mockAdapter.reports.generate(filters),
    enabled: !!logs
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const exportCSV = () => {
    if (!logs || !auth) return;

    const metadata = {
      org_name: auth.org?.name,
      date_from: filters.date_from,
      date_to: filters.date_to,
      user_name: auth.user?.display_name,
      user_role: auth.user?.role
    };

    const csv = csvUtils.exportLogs(logs, clients || [], behaviors || [], metadata);
    csvUtils.downloadCSV(csv, `behavior-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportPDF = () => {
    if (!logs || !reportData || !auth) return;

    const metadata = {
      org_name: auth.org?.name,
      date_from: filters.date_from,
      date_to: filters.date_to,
      user_name: auth.user?.display_name,
      user_role: auth.user?.role
    };

    const pdf = pdfUtils.generateReport(
      logs,
      clients || [],
      behaviors || [],
      reportData,
      metadata
    );
    pdfUtils.downloadPDF(pdf, `behavior-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const prepareChartData = () => {
    if (!reportData) return [];

    return Object.entries(reportData.dailyCounts).map(([date, count]) => ({
      date: format(new Date(date), 'MM/dd'),
      count
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const prepareBehaviorData = () => {
    if (!reportData || !behaviors) return [];

    return Object.entries(reportData.behaviorCounts).map(([behaviorId, count]) => {
      const behavior = behaviors.find(b => b.id === behaviorId);
      return {
        name: behavior?.name || 'Unknown',
        count
      };
    });
  };

  const canExport = auth?.user?.role === 'supervisor';

  return (
    <div className="page-container">
      <Nav />
      <main className="page-content">
        <div className="page-header">
          <h1>Reports</h1>
          <p>View analytics and export data</p>
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
            <label>Date Range</label>
            <div className="date-range">
              <input
                type="date"
                value={filters.date_from?.split('T')[0] || ''}
                onChange={(e) => handleFilterChange('date_from', e.target.value ? e.target.value + 'T00:00:00Z' : '')}
              />
              <span>to</span>
              <input
                type="date"
                value={filters.date_to?.split('T')[0] || ''}
                onChange={(e) => handleFilterChange('date_to', e.target.value ? e.target.value + 'T23:59:59Z' : '')}
              />
            </div>
          </div>

          {canExport && (
            <div className="export-buttons">
              <button className="btn-secondary" onClick={exportCSV}>
                Export CSV
              </button>
              <button className="btn-secondary" onClick={exportPDF}>
                Export PDF
              </button>
            </div>
          )}
        </div>

        {reportData && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Entries</h3>
                <div className="stat-value">{logs?.length || 0}</div>
              </div>
              <div className="stat-card">
                <h3>Incidents</h3>
                <div className="stat-value">{reportData.totalIncidents}</div>
              </div>
              <div className="stat-card">
                <h3>Avg Intensity</h3>
                <div className="stat-value">{reportData.averageIntensity.toFixed(1)}</div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-container">
                <h3>Daily Trends</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={prepareChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" name="Behaviors" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3>Behavior Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareBehaviorData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {!canExport && (
          <div className="permission-notice">
            Note: Only supervisors can export data
          </div>
        )}
      </main>
    </div>
  );
}
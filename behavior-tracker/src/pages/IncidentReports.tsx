import { useState, useEffect } from 'react';
import { useAuth } from '../app/providers/AppProvider';
import { Nav } from '../components/Nav';
import { mockAdapter } from '../data/adapters/mock';
import { IncidentReport, LogEntry } from '../data/types';
import { format, subDays } from 'date-fns';
import { jsPDF } from 'jspdf';

interface LogEntryWithNames extends LogEntry {
  client_name: string;
  behavior_name: string;
}

export function IncidentReports() {
  const { auth } = useAuth();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewReportForm, setShowNewReportForm] = useState(false);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const [availableLogs, setAvailableLogs] = useState<LogEntryWithNames[]>([]);

  const [newReport, setNewReport] = useState<Partial<IncidentReport>>({
    client_code: '',
    client_name: '',
    incident_date: format(new Date(), 'yyyy-MM-dd'),
    incident_time: format(new Date(), 'HH:mm'),
    location: '',
    witnesses: [],
    injuries: false,
    injury_details: '',
    property_damage: false,
    property_damage_details: '',
    antecedent_description: '',
    behavior_description: '',
    consequence_description: '',
    interventions_used: [],
    intervention_effectiveness: 'effective',
    immediate_actions_taken: [],
    follow_up_required: false,
    follow_up_actions: [],
    supervisor_notified: false,
    family_notified: false,
    other_notifications: []
  });

  useEffect(() => {
    fetchReports();
    fetchRecentLogs();
  }, []);

  const fetchReports = async () => {
    try {
      // Mock incident reports data
      const mockReports: IncidentReport[] = [
        {
          id: 'INC001',
          org_id: auth?.org?.id || 'org1',
          report_number: 'INC-2024-001',
          client_code: 'CLI001',
          client_name: 'John Doe',
          incident_date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
          incident_time: '14:30',
          reporter_name: auth?.user?.display_name || 'Staff Member',
          reporter_role: auth?.user?.role || 'staff',
          related_log_ids: ['log1', 'log2'],
          behaviors_involved: ['Aggression', 'Self-injury'],
          total_duration: 25,
          max_intensity: 4,
          location: 'Day Room',
          witnesses: ['Jane Smith', 'Mike Johnson'],
          injuries: true,
          injury_details: 'Minor scratch on arm from self-injury',
          property_damage: false,
          antecedent_description: 'Client became upset when told they could not have additional snack time.',
          behavior_description: 'Client began hitting themselves and throwing chairs. Behavior escalated over 25 minutes with brief de-escalation periods.',
          consequence_description: 'Staff provided calm reassurance and space. Client was able to regulate after intervention.',
          interventions_used: ['Verbal de-escalation', 'Space provision', 'Comfort items'],
          intervention_effectiveness: 'effective',
          immediate_actions_taken: ['First aid for scratch', 'Incident documentation', 'Supervisor notification'],
          follow_up_required: true,
          follow_up_actions: ['Behavior plan review', 'Team meeting'],
          supervisor_notified: true,
          supervisor_notified_time: '14:45',
          family_notified: true,
          family_notified_time: '16:00',
          other_notifications: ['Case manager'],
          created_at: subDays(new Date(), 2).toISOString(),
          created_by: auth?.user?.id || 'user1',
          status: 'submitted'
        }
      ];
      setReports(mockReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      // Fetch logs from the last 7 days for auto-fill suggestions
      const logs = await mockAdapter.logs.list({
        date_from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        date_to: format(new Date(), 'yyyy-MM-dd')
      });

      // Add display names to logs for easier UI rendering
      const logsWithNames = logs.map(log => ({
        ...log,
        client_name: log.client_code, // Use client_code as name for display
        behavior_name: log.behavior_observed || 'Unknown Behavior'
      }));

      setAvailableLogs(logsWithNames);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleLogSelection = (logIds: string[]) => {
    setSelectedLogIds(logIds);

    // Auto-fill report data based on selected logs
    if (logIds.length > 0) {
      const selectedLogs = availableLogs.filter(log => logIds.includes(log.id));
      const behaviors = [...new Set(selectedLogs.map(log => log.behavior_name))];
      const totalDuration = selectedLogs.reduce((sum, log) => sum + (log.duration_min || 0), 0);
      const maxIntensity = Math.max(...selectedLogs.map(log => log.intensity));

      // Auto-fill from the first log
      const primaryLog = selectedLogs[0];

      setNewReport(prev => ({
        ...prev,
        client_code: primaryLog.client_code,
        client_name: primaryLog.client_name,
        incident_date: format(new Date(primaryLog.timestamp), 'yyyy-MM-dd'),
        incident_time: format(new Date(primaryLog.timestamp), 'HH:mm'),
        related_log_ids: logIds,
        behaviors_involved: behaviors,
        total_duration: totalDuration,
        max_intensity: maxIntensity,
        antecedent_description: primaryLog.antecedent || '',
        behavior_description: primaryLog.behavior_observed || '',
        consequence_description: primaryLog.consequence || ''
      }));
    }
  };

  const generateReportNumber = () => {
    const year = new Date().getFullYear();
    const nextNumber = reports.length + 1;
    return `INC-${year}-${String(nextNumber).padStart(3, '0')}`;
  };

  const handleSubmitReport = async (status: 'draft' | 'submitted') => {
    try {
      const reportData: IncidentReport = {
        ...newReport as IncidentReport,
        id: `inc_${Date.now()}`,
        org_id: auth?.org?.id || 'org1',
        report_number: generateReportNumber(),
        reporter_name: auth?.user?.display_name || 'Current User',
        reporter_role: auth?.user?.role || 'staff',
        created_at: new Date().toISOString(),
        created_by: auth?.user?.id || 'user1',
        status
      };

      // Mock API call - in production would call real API
      setReports(prev => [reportData, ...prev]);
      setShowNewReportForm(false);

      // Reset form
      setNewReport({
        client_code: '',
        client_name: '',
        incident_date: format(new Date(), 'yyyy-MM-dd'),
        incident_time: format(new Date(), 'HH:mm'),
        location: '',
        witnesses: [],
        injuries: false,
        property_damage: false,
        antecedent_description: '',
        behavior_description: '',
        consequence_description: '',
        interventions_used: [],
        intervention_effectiveness: 'effective',
        immediate_actions_taken: [],
        follow_up_required: false,
        follow_up_actions: [],
        supervisor_notified: false,
        family_notified: false,
        other_notifications: []
      });
      setSelectedLogIds([]);
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: '#64748b', bg: '#f1f5f9', label: 'Draft' },
      submitted: { color: '#059669', bg: '#d1fae5', label: 'Submitted' },
      reviewed: { color: '#dc2626', bg: '#fee2e2', label: 'Under Review' },
      approved: { color: '#16a34a', bg: '#dcfce7', label: 'Approved' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span
        style={{ color: config.color, backgroundColor: config.bg }}
        className="status-badge"
      >
        {config.label}
      </span>
    );
  };

  const exportToPDF = (report: IncidentReport) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INCIDENT REPORT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Organization header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${auth?.org?.name || 'Organization Name'}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    doc.text(`Report Number: ${report.report_number}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Basic Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BASIC INFORMATION', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const basicInfo = [
      `Client: ${report.client_name} (${report.client_code})`,
      `Date: ${format(new Date(report.incident_date), 'MMMM d, yyyy')}`,
      `Time: ${report.incident_time}`,
      `Location: ${report.location}`,
      `Reported by: ${report.reporter_name} (${report.reporter_role})`,
      `Status: ${report.status.toUpperCase()}`
    ];

    basicInfo.forEach(line => {
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // Behaviors Involved
    if (report.behaviors_involved && report.behaviors_involved.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('BEHAVIORS INVOLVED', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`• ${report.behaviors_involved.join(', ')}`, margin, yPosition);
      yPosition += 6;
      doc.text(`• Total Duration: ${report.total_duration} minutes`, margin, yPosition);
      yPosition += 6;
      doc.text(`• Maximum Intensity: ${report.max_intensity}/5`, margin, yPosition);
      yPosition += 15;
    }

    // Incident Description
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INCIDENT DESCRIPTION', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Antecedent (What happened before):', margin, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    const antecedentLines = doc.splitTextToSize(report.antecedent_description || 'N/A', contentWidth);
    doc.text(antecedentLines, margin, yPosition);
    yPosition += (antecedentLines.length * 5) + 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Behavior Description:', margin, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    const behaviorLines = doc.splitTextToSize(report.behavior_description || 'N/A', contentWidth);
    doc.text(behaviorLines, margin, yPosition);
    yPosition += (behaviorLines.length * 5) + 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Consequence (What happened after):', margin, yPosition);
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    const consequenceLines = doc.splitTextToSize(report.consequence_description || 'N/A', contentWidth);
    doc.text(consequenceLines, margin, yPosition);
    yPosition += (consequenceLines.length * 5) + 15;

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = margin;
    }

    // Injuries and Property Damage
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INJURIES AND PROPERTY DAMAGE', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Injuries occurred: ${report.injuries ? 'YES' : 'NO'}`, margin, yPosition);
    yPosition += 6;
    if (report.injuries && report.injury_details) {
      doc.text(`Injury details: ${report.injury_details}`, margin, yPosition);
      yPosition += 6;
    }
    doc.text(`Property damage: ${report.property_damage ? 'YES' : 'NO'}`, margin, yPosition);
    yPosition += 6;
    if (report.property_damage && report.property_damage_details) {
      doc.text(`Property damage details: ${report.property_damage_details}`, margin, yPosition);
      yPosition += 6;
    }
    yPosition += 10;

    // Interventions
    if (report.interventions_used && report.interventions_used.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('INTERVENTIONS USED', margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      report.interventions_used.forEach(intervention => {
        doc.text(`• ${intervention}`, margin, yPosition);
        yPosition += 6;
      });
      doc.text(`Effectiveness: ${report.intervention_effectiveness?.replace('_', ' ').toUpperCase()}`, margin, yPosition);
      yPosition += 15;
    }

    // Notifications
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTIFICATIONS', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Supervisor notified: ${report.supervisor_notified ? 'YES' : 'NO'}`, margin, yPosition);
    if (report.supervisor_notified && report.supervisor_notified_time) {
      doc.text(` at ${report.supervisor_notified_time}`, 80, yPosition);
    }
    yPosition += 6;

    doc.text(`Family/Guardian notified: ${report.family_notified ? 'YES' : 'NO'}`, margin, yPosition);
    if (report.family_notified && report.family_notified_time) {
      doc.text(` at ${report.family_notified_time}`, 90, yPosition);
    }
    yPosition += 6;

    if (report.other_notifications && report.other_notifications.length > 0) {
      doc.text(`Other notifications: ${report.other_notifications.join(', ')}`, margin, yPosition);
      yPosition += 6;
    }
    yPosition += 15;

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}`, margin, yPosition);
    doc.text(`Created by: ${report.reporter_name}`, margin, yPosition + 6);

    // Signature lines
    yPosition += 25;
    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPosition, margin + 60, yPosition);
    doc.text('Staff Signature', margin, yPosition + 8);
    doc.text('Date: ___________', margin + 70, yPosition + 8);

    yPosition += 20;
    doc.line(margin, yPosition, margin + 60, yPosition);
    doc.text('Supervisor Signature', margin, yPosition + 8);
    doc.text('Date: ___________', margin + 70, yPosition + 8);

    // Save the PDF
    const filename = `incident-report-${report.report_number}.pdf`;
    doc.save(filename);
  };

  const exportToCSV = (reports: IncidentReport[]) => {
    const headers = [
      'Report Number',
      'Client Code',
      'Client Name',
      'Incident Date',
      'Incident Time',
      'Location',
      'Reporter',
      'Behaviors',
      'Duration (min)',
      'Max Intensity',
      'Injuries',
      'Property Damage',
      'Interventions',
      'Effectiveness',
      'Supervisor Notified',
      'Family Notified',
      'Status',
      'Created Date'
    ];

    const csvData = reports.map(report => [
      report.report_number,
      report.client_code,
      report.client_name,
      report.incident_date,
      report.incident_time,
      report.location,
      report.reporter_name,
      report.behaviors_involved?.join('; ') || '',
      report.total_duration || '',
      report.max_intensity || '',
      report.injuries ? 'Yes' : 'No',
      report.property_damage ? 'Yes' : 'No',
      report.interventions_used?.join('; ') || '',
      report.intervention_effectiveness || '',
      report.supervisor_notified ? 'Yes' : 'No',
      report.family_notified ? 'Yes' : 'No',
      report.status,
      format(new Date(report.created_at), 'yyyy-MM-dd HH:mm')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `incident-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="loading">Loading incident reports...</div>;
  }

  return (
    <div className="page-container">
      <Nav />

      <div className="page-content">
        <div className="page-header">
          <h1>📋 Incident Reports</h1>
          <p>Create comprehensive incident reports with intelligent auto-fill from behavior logs</p>
        </div>

        <div className="reports-actions">
          <button
            onClick={() => setShowNewReportForm(true)}
            className="btn-primary"
          >
            + Create New Incident Report
          </button>

          {reports.length > 0 && (
            <div className="export-actions">
              <button
                onClick={() => exportToCSV(reports)}
                className="btn-secondary"
                title="Export all reports to CSV for Excel/Google Sheets"
              >
                📊 Export to CSV
              </button>
            </div>
          )}
        </div>

        {/* New Report Form */}
        {showNewReportForm && (
          <div className="incident-report-form">
            <div className="form-header">
              <h2>New Incident Report</h2>
              <button
                onClick={() => setShowNewReportForm(false)}
                className="close-form"
              >
                ✕
              </button>
            </div>

            {/* Log Selection for Auto-fill */}
            <div className="auto-fill-section">
              <h3>🤖 Smart Auto-fill from Behavior Logs</h3>
              <p>Select related behavior logs to automatically populate report details:</p>

              <div className="log-selection">
                {availableLogs
                  .filter(log => log.incident || log.intensity >= 3) // Show incident logs or high intensity
                  .map(log => (
                  <div key={log.id} className="log-option">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedLogIds.includes(log.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleLogSelection([...selectedLogIds, log.id]);
                          } else {
                            handleLogSelection(selectedLogIds.filter(id => id !== log.id));
                          }
                        }}
                      />
                      <div className="log-details">
                        <strong>{log.client_name}</strong> - {log.behavior_name}
                        <div className="log-meta">
                          {format(new Date(log.timestamp), 'MMM d, h:mm a')} |
                          Intensity {log.intensity} |
                          {log.duration_min}min
                        </div>
                        {log.notes && <div className="log-preview">{log.notes.substring(0, 100)}...</div>}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
              {/* Basic Information */}
              <div className="form-section">
                <h4>Basic Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Client</label>
                    <input
                      type="text"
                      value={newReport.client_name || ''}
                      onChange={(e) => setNewReport(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Client name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Incident Date</label>
                    <input
                      type="date"
                      value={newReport.incident_date || ''}
                      onChange={(e) => setNewReport(prev => ({ ...prev, incident_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Incident Time</label>
                    <input
                      type="time"
                      value={newReport.incident_time || ''}
                      onChange={(e) => setNewReport(prev => ({ ...prev, incident_time: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={newReport.location || ''}
                      onChange={(e) => setNewReport(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Where did the incident occur?"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Incident Details */}
              <div className="form-section">
                <h4>Incident Details</h4>

                {selectedLogIds.length > 0 && (
                  <div className="auto-fill-summary">
                    <strong>Auto-filled from logs:</strong>
                    <ul>
                      <li>Behaviors: {newReport.behaviors_involved?.join(', ')}</li>
                      <li>Duration: {newReport.total_duration} minutes</li>
                      <li>Max Intensity: {newReport.max_intensity}/5</li>
                    </ul>
                  </div>
                )}

                <div className="form-group">
                  <label>Antecedent (What happened before?)</label>
                  <textarea
                    value={newReport.antecedent_description || ''}
                    onChange={(e) => setNewReport(prev => ({ ...prev, antecedent_description: e.target.value }))}
                    rows={3}
                    placeholder="Describe what led to the incident..."
                  />
                </div>

                <div className="form-group">
                  <label>Behavior Description</label>
                  <textarea
                    value={newReport.behavior_description || ''}
                    onChange={(e) => setNewReport(prev => ({ ...prev, behavior_description: e.target.value }))}
                    rows={4}
                    placeholder="Detailed description of the behavior/incident..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Consequence (What happened after?)</label>
                  <textarea
                    value={newReport.consequence_description || ''}
                    onChange={(e) => setNewReport(prev => ({ ...prev, consequence_description: e.target.value }))}
                    rows={3}
                    placeholder="Describe the outcome and resolution..."
                  />
                </div>
              </div>

              {/* Injuries and Damage */}
              <div className="form-section">
                <h4>Injuries and Property Damage</h4>
                <div className="form-grid">
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={newReport.injuries || false}
                        onChange={(e) => setNewReport(prev => ({ ...prev, injuries: e.target.checked }))}
                      />
                      Injuries occurred
                    </label>
                  </div>

                  {newReport.injuries && (
                    <div className="form-group">
                      <label>Injury Details</label>
                      <textarea
                        value={newReport.injury_details || ''}
                        onChange={(e) => setNewReport(prev => ({ ...prev, injury_details: e.target.value }))}
                        rows={2}
                        placeholder="Describe injuries and first aid provided..."
                      />
                    </div>
                  )}

                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={newReport.property_damage || false}
                        onChange={(e) => setNewReport(prev => ({ ...prev, property_damage: e.target.checked }))}
                      />
                      Property damage occurred
                    </label>
                  </div>

                  {newReport.property_damage && (
                    <div className="form-group">
                      <label>Property Damage Details</label>
                      <textarea
                        value={newReport.property_damage_details || ''}
                        onChange={(e) => setNewReport(prev => ({ ...prev, property_damage_details: e.target.value }))}
                        rows={2}
                        placeholder="Describe property damage..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Interventions */}
              <div className="form-section">
                <h4>Interventions Used</h4>
                <div className="intervention-checkboxes">
                  {['Verbal de-escalation', 'Physical space', 'Comfort items', 'Redirect activity', 'Environmental change', 'Peer support', 'Crisis intervention', 'Other'].map(intervention => (
                    <label key={intervention} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={newReport.interventions_used?.includes(intervention) || false}
                        onChange={(e) => {
                          const current = newReport.interventions_used || [];
                          if (e.target.checked) {
                            setNewReport(prev => ({ ...prev, interventions_used: [...current, intervention] }));
                          } else {
                            setNewReport(prev => ({ ...prev, interventions_used: current.filter(i => i !== intervention) }));
                          }
                        }}
                      />
                      {intervention}
                    </label>
                  ))}
                </div>

                <div className="form-group">
                  <label>Intervention Effectiveness</label>
                  <select
                    value={newReport.intervention_effectiveness || 'effective'}
                    onChange={(e) => setNewReport(prev => ({ ...prev, intervention_effectiveness: e.target.value as any }))}
                  >
                    <option value="very_effective">Very Effective</option>
                    <option value="effective">Effective</option>
                    <option value="somewhat_effective">Somewhat Effective</option>
                    <option value="not_effective">Not Effective</option>
                  </select>
                </div>
              </div>

              {/* Notifications */}
              <div className="form-section">
                <h4>Notifications</h4>
                <div className="form-grid">
                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={newReport.supervisor_notified || false}
                        onChange={(e) => setNewReport(prev => ({ ...prev, supervisor_notified: e.target.checked }))}
                      />
                      Supervisor notified
                    </label>
                  </div>

                  <div className="checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={newReport.family_notified || false}
                        onChange={(e) => setNewReport(prev => ({ ...prev, family_notified: e.target.checked }))}
                      />
                      Family/Guardian notified
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => handleSubmitReport('draft')}
                  className="btn-secondary"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmitReport('submitted')}
                  className="btn-primary"
                >
                  Submit Report
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewReportForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reports List */}
        <div className="reports-list">
          <h2>Recent Incident Reports</h2>

          {reports.length === 0 ? (
            <div className="no-data">
              <p>No incident reports created yet.</p>
            </div>
          ) : (
            <div className="reports-table">
              <div className="table-header">
                <div>Report #</div>
                <div>Client</div>
                <div>Date</div>
                <div>Status</div>
                <div>Behaviors</div>
                <div>Actions</div>
              </div>

              {reports.map(report => (
                <div key={report.id} className="table-row">
                  <div className="report-number">{report.report_number}</div>
                  <div className="client-info">
                    <strong>{report.client_name}</strong>
                    <div className="client-code">{report.client_code}</div>
                  </div>
                  <div className="incident-date">
                    {format(new Date(report.incident_date), 'MMM d, yyyy')}
                    <div className="incident-time">{report.incident_time}</div>
                  </div>
                  <div>{getStatusBadge(report.status)}</div>
                  <div className="behaviors-list">
                    {report.behaviors_involved.slice(0, 2).map(behavior => (
                      <span key={behavior} className="behavior-tag">{behavior}</span>
                    ))}
                    {report.behaviors_involved.length > 2 && (
                      <span className="more-behaviors">+{report.behaviors_involved.length - 2} more</span>
                    )}
                  </div>
                  <div className="report-actions">
                    <button className="btn-link">View</button>
                    <button className="btn-link">Edit</button>
                    <button
                      onClick={() => exportToPDF(report)}
                      className="btn-link"
                      title="Export this report to PDF for printing or state submission"
                    >
                      📄 Export PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
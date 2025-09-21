import { stringify } from 'csv-stringify/sync';
import { LogEntry } from '../data/types';

export const csvUtils = {
  exportLogs: (logs: LogEntry[], clients: any[], behaviors: any[], metadata: any) => {
    const data = logs.map(log => {
      const client = clients.find((c: any) => c.client_code === log.client_code);
      const behavior = behaviors.find((b: any) => b.id === log.behavior_id);

      return {
        'Date/Time': new Date(log.timestamp).toLocaleString(),
        'Client Code': log.client_code,
        'Client Name': client?.display_name || '',
        'Behavior': behavior?.name || '',
        'Intensity': log.intensity,
        'Duration (min)': log.duration_min || '',
        'Antecedent': log.antecedent || '',
        'Behavior Observed': log.behavior_observed || '',
        'Consequence': log.consequence || '',
        'Notes': log.notes || '',
        'Incident': log.incident ? 'Yes' : 'No'
      };
    });

    const csv = stringify(data, {
      header: true,
      quoted: true
    });

    const header = `# Behavior Tracking Report
# Organization: ${metadata.org_name}
# Generated: ${new Date().toLocaleString()}
# Date Range: ${metadata.date_from || 'All'} to ${metadata.date_to || 'All'}
# Exported By: ${metadata.user_name} (${metadata.user_role})
# Total Records: ${logs.length}

`;

    return header + csv;
  },

  downloadCSV: (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
};
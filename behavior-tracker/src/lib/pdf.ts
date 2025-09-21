import jsPDF from 'jspdf';
import { LogEntry } from '../data/types';

export const pdfUtils = {
  generateReport: (
    logs: LogEntry[],
    clients: any[],
    behaviors: any[],
    chartData: any,
    metadata: any
  ) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFontSize(20);
    pdf.text('Behavior Tracking Report', pageWidth / 2, 20, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text(`Organization: ${metadata.org_name}`, 20, 35);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 40);
    pdf.text(`Date Range: ${metadata.date_from || 'All'} to ${metadata.date_to || 'All'}`, 20, 45);
    pdf.text(`Exported By: ${metadata.user_name} (${metadata.user_role})`, 20, 50);

    pdf.setTextColor(0);
    pdf.setFontSize(14);
    pdf.text('Summary Statistics', 20, 65);

    pdf.setFontSize(10);
    pdf.text(`Total Entries: ${logs.length}`, 20, 75);
    pdf.text(`Total Incidents: ${chartData.totalIncidents}`, 20, 80);
    pdf.text(`Average Intensity: ${chartData.averageIntensity.toFixed(2)}`, 20, 85);

    pdf.setFontSize(14);
    pdf.text('Behavior Frequency', 20, 100);

    let yPos = 110;
    pdf.setFontSize(10);
    Object.entries(chartData.behaviorCounts).forEach(([behaviorId, count]) => {
      const behavior = behaviors.find((b: any) => b.id === behaviorId);
      if (behavior && yPos < pageHeight - 30) {
        pdf.text(`${behavior.name}: ${count} occurrences`, 20, yPos);
        yPos += 5;
      }
    });

    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text('This report contains de-identified data only', pageWidth / 2, pageHeight - 10, { align: 'center' });

    return pdf;
  },

  downloadPDF: (pdf: jsPDF, filename: string) => {
    pdf.save(filename);
  }
};
import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';
import { auditService } from '../services/audit';

interface ReportFilters {
  client_code?: string;
  behavior_id?: string;
  date_from?: string;
  date_to?: string;
  format?: 'json' | 'csv' | 'pdf';
}

export default async function reportRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.authenticate);

  server.get<{ Querystring: ReportFilters }>('/summary', async (request, reply) => {
    const user = request.user as any;
    const { client_code, behavior_id, date_from, date_to } = request.query;

    let whereClause = 'WHERE l.org_id = $1';
    const params: any[] = [user.org_id];
    let paramCount = 1;

    if (client_code) {
      whereClause += ` AND l.client_code = $${++paramCount}`;
      params.push(client_code);
    }

    if (behavior_id) {
      whereClause += ` AND l.behavior_id = $${++paramCount}`;
      params.push(behavior_id);
    }

    if (date_from) {
      whereClause += ` AND l.timestamp >= $${++paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ` AND l.timestamp <= $${++paramCount}`;
      params.push(date_to);
    }

    const [behaviorCounts, dailyCounts, summary] = await Promise.all([
      pool.query(
        `SELECT b.id, b.name, COUNT(l.id) as count
         FROM behaviors b
         LEFT JOIN logs l ON b.id = l.behavior_id AND l.org_id = b.org_id
         ${whereClause.replace('l.org_id = $1', 'b.org_id = $1')}
         GROUP BY b.id, b.name
         ORDER BY count DESC`,
        params
      ),

      pool.query(
        `SELECT DATE(l.timestamp) as date, COUNT(l.id) as count
         FROM logs l
         ${whereClause}
         GROUP BY DATE(l.timestamp)
         ORDER BY date DESC`,
        params
      ),

      pool.query(
        `SELECT
           COUNT(l.id) as total_entries,
           COUNT(CASE WHEN l.incident = true THEN 1 END) as total_incidents,
           AVG(l.intensity) as average_intensity,
           AVG(l.duration_min) as average_duration
         FROM logs l
         ${whereClause}`,
        params
      )
    ]);

    const behaviorCountsData = behaviorCounts.rows.reduce((acc, row) => {
      acc[row.id] = parseInt(row.count);
      return acc;
    }, {});

    const dailyCountsData = dailyCounts.rows.reduce((acc, row) => {
      acc[row.date] = parseInt(row.count);
      return acc;
    }, {});

    const summaryData = summary.rows[0];

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'READ',
      entity: 'reports',
      metadata: { type: 'summary', filters: { client_code, behavior_id, date_from, date_to } }
    });

    return {
      behaviorCounts: behaviorCountsData,
      dailyCounts: dailyCountsData,
      totalIncidents: parseInt(summaryData.total_incidents) || 0,
      averageIntensity: parseFloat(summaryData.average_intensity) || 0,
      averageDuration: parseFloat(summaryData.average_duration) || 0
    };
  });

  server.get<{ Querystring: ReportFilters }>('/export', async (request, reply) => {
    const user = request.user as any;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can export data' });
    }

    const { client_code, behavior_id, date_from, date_to, format = 'csv' } = request.query;

    let query = `
      SELECT l.*, c.display_name as client_name, b.name as behavior_name,
             u.display_name as staff_name
      FROM logs l
      JOIN clients c ON l.client_code = c.client_code AND l.org_id = c.org_id
      JOIN behaviors b ON l.behavior_id = b.id
      JOIN users u ON l.staff_id = u.id
      WHERE l.org_id = $1
    `;

    const params: any[] = [user.org_id];
    let paramCount = 1;

    if (client_code) {
      query += ` AND l.client_code = $${++paramCount}`;
      params.push(client_code);
    }

    if (behavior_id) {
      query += ` AND l.behavior_id = $${++paramCount}`;
      params.push(behavior_id);
    }

    if (date_from) {
      query += ` AND l.timestamp >= $${++paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND l.timestamp <= $${++paramCount}`;
      params.push(date_to);
    }

    query += ` ORDER BY l.timestamp DESC`;

    const result = await pool.query(query, params);

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'EXPORT',
      entity: 'logs',
      metadata: {
        format,
        record_count: result.rows.length,
        filters: { client_code, behavior_id, date_from, date_to }
      }
    });

    if (format === 'csv') {
      const csv = generateCSV(result.rows);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="behavior-report-${new Date().toISOString().split('T')[0]}.csv"`);
      return csv;
    }

    return result.rows;
  });
}

function generateCSV(data: any[]): string {
  if (!data.length) return '';

  const headers = [
    'timestamp',
    'client_code',
    'client_name',
    'behavior_name',
    'intensity',
    'duration_min',
    'antecedent',
    'behavior_observed',
    'consequence',
    'notes',
    'incident',
    'staff_name'
  ];

  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}
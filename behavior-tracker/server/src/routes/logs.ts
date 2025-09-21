import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';
import { auditService } from '../services/audit';

interface LogEntry {
  client_code: string;
  behavior_id: string;
  intensity: number;
  duration_min?: number;
  antecedent?: string;
  behavior_observed?: string;
  consequence?: string;
  notes?: string;
  incident?: boolean;
}

interface LogFilters {
  client_code?: string;
  behavior_id?: string;
  date_from?: string;
  date_to?: string;
}

export default async function logRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.authenticate);

  server.get<{ Querystring: LogFilters }>('/', async (request) => {
    const user = request.user as any;
    const { client_code, behavior_id, date_from, date_to } = request.query;

    let query = `
      SELECT l.*, c.display_name as client_name, b.name as behavior_name,
             u.display_name as staff_name, c.client_code
      FROM behavior_logs l
      JOIN clients c ON l.client_id = c.id
      JOIN behaviors b ON l.behavior_id = b.id
      JOIN users u ON l.staff_id = u.id
      WHERE l.org_id = $1
    `;

    const params: any[] = [user.org_id];
    let paramCount = 1;

    if (client_code) {
      query += ` AND c.client_code = $${++paramCount}`;
      params.push(client_code);
    }

    if (behavior_id) {
      query += ` AND l.behavior_id = $${++paramCount}`;
      params.push(behavior_id);
    }

    if (date_from) {
      query += ` AND l.logged_at >= $${++paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND l.logged_at <= $${++paramCount}`;
      params.push(date_to);
    }

    query += ` ORDER BY l.logged_at DESC`;

    const result = await pool.query(query, params);

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'READ',
      entity: 'logs',
      metadata: { filters: { client_code, behavior_id, date_from, date_to } }
    });

    return result.rows;
  });

  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    const result = await pool.query(
      `SELECT l.*, c.display_name as client_name, b.name as behavior_name,
              u.display_name as staff_name, c.client_code
       FROM behavior_logs l
       JOIN clients c ON l.client_id = c.id
       JOIN behaviors b ON l.behavior_id = b.id
       JOIN users u ON l.staff_id = u.id
       WHERE l.id = $1 AND l.org_id = $2`,
      [id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Log entry not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'READ',
      entity: 'logs',
      entity_id: id
    });

    return result.rows[0];
  });

  server.post<{ Body: LogEntry }>('/', async (request, reply) => {
    const user = request.user as any;
    const {
      client_code,
      behavior_id,
      intensity,
      duration_min,
      antecedent,
      behavior_observed,
      consequence,
      notes,
      incident
    } = request.body;

    try {
      // First get client ID from client code
      const clientResult = await pool.query(
        `SELECT id FROM clients WHERE client_code = $1 AND org_id = $2`,
        [client_code, user.org_id]
      );

      if (!clientResult.rows[0]) {
        return reply.code(400).send({ error: 'Invalid client_code' });
      }

      const result = await pool.query(
        `INSERT INTO behavior_logs (
          org_id, client_id, staff_id, behavior_id, intensity,
          duration_min, antecedent, behavior_observed, consequence,
          notes, incident, logged_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        RETURNING *`,
        [
          user.org_id,
          clientResult.rows[0].id,
          user.sub,
          behavior_id,
          intensity,
          duration_min,
          antecedent,
          behavior_observed,
          consequence,
          notes,
          incident || false
        ]
      );

      await auditService.log(pool, {
        org_id: user.org_id,
        actor_id: user.sub,
        action: 'CREATE',
        entity: 'logs',
        entity_id: result.rows[0].id,
        metadata: {
          client_code,
          behavior_id,
          intensity,
          incident: incident || false
        }
      });

      return result.rows[0];
    } catch (error: any) {
      if (error.code === '23503') {
        return reply.code(400).send({
          error: 'Invalid client_code or behavior_id'
        });
      }
      throw error;
    }
  });

  server.put<{ Params: { id: string }, Body: Partial<LogEntry> }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can edit logs' });
    }

    const {
      client_code,
      behavior_id,
      intensity,
      duration_min,
      antecedent,
      behavior_observed,
      consequence,
      notes,
      incident
    } = request.body;

    const result = await pool.query(
      `UPDATE logs
       SET client_code = COALESCE($1, client_code),
           behavior_id = COALESCE($2, behavior_id),
           intensity = COALESCE($3, intensity),
           duration_min = COALESCE($4, duration_min),
           antecedent = COALESCE($5, antecedent),
           behavior_observed = COALESCE($6, behavior_observed),
           consequence = COALESCE($7, consequence),
           notes = COALESCE($8, notes),
           incident = COALESCE($9, incident),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 AND org_id = $11
       RETURNING *`,
      [
        client_code,
        behavior_id,
        intensity,
        duration_min,
        antecedent,
        behavior_observed,
        consequence,
        notes,
        incident,
        id,
        user.org_id
      ]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Log entry not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'UPDATE',
      entity: 'logs',
      entity_id: id,
      metadata: { client_code, behavior_id, intensity }
    });

    return result.rows[0];
  });

  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can delete logs' });
    }

    const result = await pool.query(
      `DELETE FROM logs
       WHERE id = $1 AND org_id = $2
       RETURNING id`,
      [id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Log entry not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'DELETE',
      entity: 'logs',
      entity_id: id
    });

    return { success: true };
  });
}
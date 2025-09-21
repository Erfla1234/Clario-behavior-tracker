import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';

interface AuditFilters {
  from?: string;
  to?: string;
  action?: string;
  entity?: string;
  limit?: number;
}

export default async function auditRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.authenticate);

  server.get<{ Querystring: AuditFilters }>('/', async (request, reply) => {
    const user = request.user as any;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can view audit logs' });
    }

    const { from, to, action, entity, limit = 100 } = request.query;

    let query = `
      SELECT a.*, u.display_name as actor_name
      FROM audit a
      LEFT JOIN users u ON a.actor_id = u.id
      WHERE a.org_id = $1
    `;

    const params: any[] = [user.org_id];
    let paramCount = 1;

    if (from) {
      query += ` AND a.timestamp >= $${++paramCount}`;
      params.push(from);
    }

    if (to) {
      query += ` AND a.timestamp <= $${++paramCount}`;
      params.push(to);
    }

    if (action) {
      query += ` AND a.action = $${++paramCount}`;
      params.push(action.toUpperCase());
    }

    if (entity) {
      query += ` AND a.entity = $${++paramCount}`;
      params.push(entity);
    }

    query += ` ORDER BY a.timestamp DESC LIMIT $${++paramCount}`;
    params.push(Math.min(parseInt(String(limit)), 1000));

    const result = await pool.query(query, params);

    return result.rows;
  });

  server.post<{ Body: any }>('/', async (request, reply) => {
    const user = request.user as any;
    const { action, entity, entity_id, metadata } = request.body;

    const result = await pool.query(
      `INSERT INTO audit (org_id, actor_id, action, entity, entity_id, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [user.org_id, user.sub, action.toUpperCase(), entity, entity_id, metadata]
    );

    return result.rows[0];
  });

  server.get('/actions', async (request, reply) => {
    const user = request.user as any;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can view audit data' });
    }

    const result = await pool.query(
      `SELECT DISTINCT action FROM audit WHERE org_id = $1 ORDER BY action`,
      [user.org_id]
    );

    return result.rows.map(row => row.action);
  });

  server.get('/entities', async (request, reply) => {
    const user = request.user as any;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can view audit data' });
    }

    const result = await pool.query(
      `SELECT DISTINCT entity FROM audit WHERE org_id = $1 ORDER BY entity`,
      [user.org_id]
    );

    return result.rows.map(row => row.entity);
  });
}
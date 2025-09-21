import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';
import { auditService } from '../services/audit';

interface Client {
  id?: string;
  client_code: string;
  display_name: string;
  active?: boolean;
}

export default async function clientRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.authenticate);

  server.get('/', async (request) => {
    const user = request.user as any;

    const result = await pool.query(
      `SELECT * FROM clients
       WHERE org_id = $1 AND active = true
       ORDER BY client_code`,
      [user.org_id]
    );

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'READ',
      entity: 'clients'
    });

    return result.rows;
  });

  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    const result = await pool.query(
      `SELECT * FROM clients
       WHERE id = $1 AND org_id = $2`,
      [id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Client not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'READ',
      entity: 'clients',
      entity_id: id
    });

    return result.rows[0];
  });

  server.post<{ Body: Client }>('/', async (request, reply) => {
    const user = request.user as any;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const { client_code, display_name } = request.body;

    const result = await pool.query(
      `INSERT INTO clients (org_id, client_code, display_name, active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [user.org_id, client_code, display_name]
    );

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'CREATE',
      entity: 'clients',
      entity_id: result.rows[0].id,
      metadata: { client_code, display_name }
    });

    return result.rows[0];
  });

  server.put<{ Params: { id: string }, Body: Partial<Client> }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const { client_code, display_name } = request.body;

    const result = await pool.query(
      `UPDATE clients
       SET client_code = COALESCE($1, client_code),
           display_name = COALESCE($2, display_name),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND org_id = $4
       RETURNING *`,
      [client_code, display_name, id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Client not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'UPDATE',
      entity: 'clients',
      entity_id: id,
      metadata: { client_code, display_name }
    });

    return result.rows[0];
  });

  server.patch<{ Params: { id: string } }>('/:id/deactivate', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const result = await pool.query(
      `UPDATE clients
       SET active = false, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND org_id = $2
       RETURNING id`,
      [id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Client not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'UPDATE',
      entity: 'clients',
      entity_id: id,
      metadata: { action: 'deactivated' }
    });

    return { success: true };
  });
}
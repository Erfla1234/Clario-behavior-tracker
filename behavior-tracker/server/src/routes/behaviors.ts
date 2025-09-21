import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';
import { auditService } from '../services/audit';

interface Behavior {
  id?: string;
  name: string;
  description?: string;
}

export default async function behaviorRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.authenticate);

  server.get('/', async (request) => {
    const user = request.user as any;

    const result = await pool.query(
      `SELECT * FROM behaviors
       WHERE org_id = $1
       ORDER BY name`,
      [user.org_id]
    );

    return result.rows;
  });

  server.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    const result = await pool.query(
      `SELECT * FROM behaviors
       WHERE id = $1 AND org_id = $2`,
      [id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Behavior not found' });
    }

    return result.rows[0];
  });

  server.post<{ Body: Behavior }>('/', async (request, reply) => {
    const user = request.user as any;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const { name, description } = request.body;

    const result = await pool.query(
      `INSERT INTO behaviors (org_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user.org_id, name, description]
    );

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'CREATE',
      entity: 'behaviors',
      entity_id: result.rows[0].id,
      metadata: { name, description }
    });

    return result.rows[0];
  });

  server.put<{ Params: { id: string }, Body: Partial<Behavior> }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const { name, description } = request.body;

    const result = await pool.query(
      `UPDATE behaviors
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND org_id = $4
       RETURNING *`,
      [name, description, id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Behavior not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'UPDATE',
      entity: 'behaviors',
      entity_id: id,
      metadata: { name, description }
    });

    return result.rows[0];
  });

  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const result = await pool.query(
      `DELETE FROM behaviors
       WHERE id = $1 AND org_id = $2
       RETURNING id`,
      [id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Behavior not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'DELETE',
      entity: 'behaviors',
      entity_id: id
    });

    return { success: true };
  });
}
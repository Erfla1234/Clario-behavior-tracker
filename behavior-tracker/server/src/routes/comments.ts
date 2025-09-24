import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';
import { auditService } from '../services/audit';

interface Comment {
  id?: string;
  log_id: string;
  content: string;
}

export default async function commentRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.authenticate);

  // Get comments for a log
  server.get<{ Params: { logId: string } }>('/log/:logId', async (request) => {
    const user = request.user as any;
    const { logId } = request.params;

    const result = await pool.query(
      `SELECT c.*, u.display_name as author_name, u.role as author_role
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.log_id = $1 AND c.org_id = $2
       ORDER BY c.created_at DESC`,
      [logId, user.org_id]
    );

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'READ',
      entity: 'comments',
      entity_id: logId
    });

    return result.rows;
  });

  // Add comment to a log (supervisors only)
  server.post<{ Params: { logId: string }, Body: { content: string } }>(
    '/log/:logId',
    async (request, reply) => {
      const user = request.user as any;
      const { logId } = request.params;
      const { content } = request.body;

      // Only supervisors can comment
      if (user.role !== 'supervisor') {
        return reply.code(403).send({ error: 'Only supervisors can add comments' });
      }

      const result = await pool.query(
        `INSERT INTO comments (org_id, log_id, user_id, content)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user.org_id, logId, user.sub, content]
      );

      await auditService.log(pool, {
        org_id: user.org_id,
        actor_id: user.sub,
        action: 'CREATE',
        entity: 'comments',
        entity_id: result.rows[0].id,
        metadata: { log_id: logId, content }
      });

      return result.rows[0];
    }
  );

  // Update comment
  server.put<{ Params: { id: string }, Body: { content: string } }>(
    '/:id',
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params;
      const { content } = request.body;

      // Check if user owns the comment or is supervisor
      const ownership = await pool.query(
        'SELECT user_id FROM comments WHERE id = $1 AND org_id = $2',
        [id, user.org_id]
      );

      if (!ownership.rows[0]) {
        return reply.code(404).send({ error: 'Comment not found' });
      }

      if (ownership.rows[0].user_id !== user.sub && user.role !== 'supervisor') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const result = await pool.query(
        `UPDATE comments
         SET content = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND org_id = $3
         RETURNING *`,
        [content, id, user.org_id]
      );

      await auditService.log(pool, {
        org_id: user.org_id,
        actor_id: user.sub,
        action: 'UPDATE',
        entity: 'comments',
        entity_id: id
      });

      return result.rows[0];
    }
  );

  // Delete comment
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can delete comments' });
    }

    const result = await pool.query(
      'DELETE FROM comments WHERE id = $1 AND org_id = $2 RETURNING id',
      [id, user.org_id]
    );

    if (!result.rows[0]) {
      return reply.code(404).send({ error: 'Comment not found' });
    }

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'DELETE',
      entity: 'comments',
      entity_id: id
    });

    return { success: true };
  });
}
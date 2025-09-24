import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';
import { auditService } from '../services/audit';

interface Announcement {
  id?: string;
  title: string;
  content: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  expires_at?: string;
}

export default async function announcementRoutes(server: FastifyInstance) {
  server.addHook('preHandler', server.authenticate);

  // Get all active announcements
  server.get('/', async (request) => {
    const user = request.user as any;

    const result = await pool.query(
      `SELECT a.*, u.display_name as author_name, u.role as author_role
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       WHERE a.org_id = $1
         AND a.active = true
         AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)
       ORDER BY
         CASE a.priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'normal' THEN 3
           WHEN 'low' THEN 4
         END,
         a.created_at DESC`,
      [user.org_id]
    );

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'READ',
      entity: 'announcements'
    });

    return result.rows;
  });

  // Create announcement (supervisors and staff can post)
  server.post<{ Body: Announcement }>('/', async (request, reply) => {
    const user = request.user as any;
    const { title, content, priority = 'normal', expires_at } = request.body;

    const result = await pool.query(
      `INSERT INTO announcements (org_id, author_id, title, content, priority, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.org_id, user.sub, title, content, priority, expires_at]
    );

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'CREATE',
      entity: 'announcements',
      entity_id: result.rows[0].id,
      metadata: { title, priority }
    });

    // Notify all staff (in production, this would trigger push notifications)
    await pool.query(
      `INSERT INTO audit_logs (org_id, actor_id, action, entity, metadata)
       SELECT $1, $2, 'NOTIFICATION', 'announcement_created',
              jsonb_build_object('announcement_id', $3, 'title', $4)
       FROM users
       WHERE org_id = $1 AND notify_announcements = true`,
      [user.org_id, user.sub, result.rows[0].id, title]
    );

    return result.rows[0];
  });

  // Update announcement
  server.put<{ Params: { id: string }, Body: Partial<Announcement> }>(
    '/:id',
    async (request, reply) => {
      const user = request.user as any;
      const { id } = request.params;
      const { title, content, priority, expires_at } = request.body;

      // Check ownership
      const ownership = await pool.query(
        'SELECT author_id FROM announcements WHERE id = $1 AND org_id = $2',
        [id, user.org_id]
      );

      if (!ownership.rows[0]) {
        return reply.code(404).send({ error: 'Announcement not found' });
      }

      // Only author or supervisor can edit
      if (ownership.rows[0].author_id !== user.sub && user.role !== 'supervisor') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const result = await pool.query(
        `UPDATE announcements
         SET title = COALESCE($1, title),
             content = COALESCE($2, content),
             priority = COALESCE($3, priority),
             expires_at = COALESCE($4, expires_at),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND org_id = $6
         RETURNING *`,
        [title, content, priority, expires_at, id, user.org_id]
      );

      await auditService.log(pool, {
        org_id: user.org_id,
        actor_id: user.sub,
        action: 'UPDATE',
        entity: 'announcements',
        entity_id: id
      });

      return result.rows[0];
    }
  );

  // Deactivate announcement
  server.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    // Check ownership
    const ownership = await pool.query(
      'SELECT author_id FROM announcements WHERE id = $1 AND org_id = $2',
      [id, user.org_id]
    );

    if (!ownership.rows[0]) {
      return reply.code(404).send({ error: 'Announcement not found' });
    }

    // Only author or supervisor can deactivate
    if (ownership.rows[0].author_id !== user.sub && user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    await pool.query(
      'UPDATE announcements SET active = false WHERE id = $1 AND org_id = $2',
      [id, user.org_id]
    );

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'DELETE',
      entity: 'announcements',
      entity_id: id
    });

    return { success: true };
  });
}
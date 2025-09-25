import { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';

interface BehaviorTemplate {
  id?: string;
  org_id: string;
  name: string;
  behavior_id: string;
  default_intensity: number;
  default_duration_min?: number;
  antecedent_template?: string;
  behavior_template?: string;
  consequence_template?: string;
  notes_template?: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export default async function templateRoutes(server: FastifyInstance) {
  // Get all templates for an organization
  server.get('/templates', {
    preHandler: server.authenticate
  }, async (request, reply) => {
    const user = request.user as any;

    try {
      const result = await pool.query(
        `SELECT t.*, b.name as behavior_name, u.display_name as created_by_name
         FROM behavior_templates t
         JOIN behaviors b ON t.behavior_id = b.id
         JOIN users u ON t.created_by = u.id
         WHERE t.org_id = $1
         ORDER BY t.name ASC`,
        [user.org_id]
      );

      return result.rows;
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create a new template (supervisor only)
  server.post<{ Body: BehaviorTemplate }>('/templates', {
    preHandler: server.authenticate
  }, async (request, reply) => {
    const user = request.user as any;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can create templates' });
    }

    const {
      name,
      behavior_id,
      default_intensity,
      default_duration_min,
      antecedent_template,
      behavior_template,
      consequence_template,
      notes_template
    } = request.body;

    try {
      const result = await pool.query(
        `INSERT INTO behavior_templates (
          org_id, name, behavior_id, default_intensity, default_duration_min,
          antecedent_template, behavior_template, consequence_template, notes_template,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          user.org_id,
          name,
          behavior_id,
          default_intensity,
          default_duration_min || null,
          antecedent_template || null,
          behavior_template || null,
          consequence_template || null,
          notes_template || null,
          user.sub
        ]
      );

      return result.rows[0];
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update a template (supervisor only)
  server.put<{ Params: { id: string }, Body: BehaviorTemplate }>('/templates/:id', {
    preHandler: server.authenticate
  }, async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can update templates' });
    }

    const {
      name,
      behavior_id,
      default_intensity,
      default_duration_min,
      antecedent_template,
      behavior_template,
      consequence_template,
      notes_template
    } = request.body;

    try {
      // Check if template exists and belongs to user's org
      const existingTemplate = await pool.query(
        'SELECT * FROM behavior_templates WHERE id = $1 AND org_id = $2',
        [id, user.org_id]
      );

      if (!existingTemplate.rows[0]) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      const result = await pool.query(
        `UPDATE behavior_templates SET
          name = $1,
          behavior_id = $2,
          default_intensity = $3,
          default_duration_min = $4,
          antecedent_template = $5,
          behavior_template = $6,
          consequence_template = $7,
          notes_template = $8,
          updated_at = NOW()
         WHERE id = $9 AND org_id = $10
         RETURNING *`,
        [
          name,
          behavior_id,
          default_intensity,
          default_duration_min || null,
          antecedent_template || null,
          behavior_template || null,
          consequence_template || null,
          notes_template || null,
          id,
          user.org_id
        ]
      );

      return result.rows[0];
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete a template (supervisor only)
  server.delete<{ Params: { id: string } }>('/templates/:id', {
    preHandler: server.authenticate
  }, async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    if (user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Only supervisors can delete templates' });
    }

    try {
      // Check if template exists and belongs to user's org
      const result = await pool.query(
        'DELETE FROM behavior_templates WHERE id = $1 AND org_id = $2 RETURNING *',
        [id, user.org_id]
      );

      if (!result.rows[0]) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      return { success: true };
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get a specific template
  server.get<{ Params: { id: string } }>('/templates/:id', {
    preHandler: server.authenticate
  }, async (request, reply) => {
    const user = request.user as any;
    const { id } = request.params;

    try {
      const result = await pool.query(
        `SELECT t.*, b.name as behavior_name, u.display_name as created_by_name
         FROM behavior_templates t
         JOIN behaviors b ON t.behavior_id = b.id
         JOIN users u ON t.created_by = u.id
         WHERE t.id = $1 AND t.org_id = $2`,
        [id, user.org_id]
      );

      if (!result.rows[0]) {
        return reply.code(404).send({ error: 'Template not found' });
      }

      return result.rows[0];
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
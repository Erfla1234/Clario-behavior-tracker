import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool';
import { auditService } from '../services/audit';

interface LoginBody {
  email: string;
  password: string;
}

export default async function authRoutes(server: FastifyInstance) {
  server.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password } = request.body;

    try {
      const result = await pool.query(
        `SELECT u.*, o.name as org_name
         FROM users u
         JOIN organizations o ON u.org_id = o.id
         WHERE u.email = $1 AND u.active = true`,
        [email]
      );

      if (!result.rows[0]) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const token = server.jwt.sign({
        sub: user.id,
        org_id: user.org_id,
        role: user.role,
        email: user.email
      });

      await auditService.log(pool, {
        org_id: user.org_id,
        actor_id: user.id,
        action: 'LOGIN',
        entity: 'auth',
        metadata: { email }
      });

      reply.setCookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 86400 * 7
      });

      return {
        user: {
          id: user.id,
          org_id: user.org_id,
          email: user.email,
          display_name: user.display_name,
          role: user.role
        },
        org: {
          id: user.org_id,
          name: user.org_name
        },
        token
      };
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  server.post('/logout', {
    preHandler: server.authenticate
  }, async (request, reply) => {
    const user = request.user as any;

    await auditService.log(pool, {
      org_id: user.org_id,
      actor_id: user.sub,
      action: 'LOGOUT',
      entity: 'auth'
    });

    reply.clearCookie('token');
    return { success: true };
  });

  server.get('/me', {
    preHandler: server.authenticate
  }, async (request, reply) => {
    const user = request.user as any;

    try {
      const result = await pool.query(
        `SELECT u.*, o.name as org_name
         FROM users u
         JOIN organizations o ON u.org_id = o.id
         WHERE u.id = $1`,
        [user.sub]
      );

      if (!result.rows[0]) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const userData = result.rows[0];

      return {
        user: {
          id: userData.id,
          org_id: userData.org_id,
          email: userData.email,
          display_name: userData.display_name,
          role: userData.role
        },
        org: {
          id: userData.org_id,
          name: userData.org_name
        },
        token: request.headers.authorization?.replace('Bearer ', '')
      };
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  server.post('/refresh', {
    preHandler: server.authenticate
  }, async (request, reply) => {
    const user = request.user as any;

    const token = server.jwt.sign({
      sub: user.sub,
      org_id: user.org_id,
      role: user.role,
      email: user.email
    });

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7
    });

    return { token };
  });
}
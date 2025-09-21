import { FastifyRequest, FastifyReply } from 'fastify';
import { pool, setRLSContext } from '../db/pool';

export interface AuthUser {
  id: string;
  org_id: string;
  role: 'staff' | 'supervisor';
  email: string;
  display_name: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.code(401).send({ error: 'Missing authorization token' });
    }

    const decoded = await (request.server as any).jwt.verify(token);
    request.user = decoded as AuthUser;

    const client = await pool.connect();
    try {
      await setRLSContext(client, request.user.org_id, request.user.id, request.user.role);
    } finally {
      client.release();
    }
  } catch (error) {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}

export function requireRole(role: 'staff' | 'supervisor') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    if (role === 'supervisor' && request.user.role !== 'supervisor') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
  };
}
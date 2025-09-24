import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { authenticate } from './middleware/auth';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import behaviorRoutes from './routes/behaviors';
import logRoutes from './routes/logs';
import reportRoutes from './routes/reports';
import auditRoutes from './routes/audit';
import commentRoutes from './routes/comments';
import announcementRoutes from './routes/announcements';

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

async function start() {
  try {
    await server.register(cors, {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
      credentials: true
    });

    await server.register(cookie);

    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
      cookie: {
        cookieName: 'token',
        signed: false
      }
    });

    server.decorate('authenticate', authenticate);

    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(clientRoutes, { prefix: '/clients' });
    await server.register(behaviorRoutes, { prefix: '/behaviors' });
    await server.register(logRoutes, { prefix: '/logs' });
    await server.register(reportRoutes, { prefix: '/reports' });
    await server.register(auditRoutes, { prefix: '/audit' });
    await server.register(commentRoutes, { prefix: '/comments' });
    await server.register(announcementRoutes, { prefix: '/announcements' });

    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    console.log(`
      🚀 Server ready at http://${host}:${port}
      ⚡ Environment: ${process.env.NODE_ENV || 'development'}
      🔒 HIPAA Notice: This system handles PHI. Ensure proper BAA coverage.
    `);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import { env } from './config/env';
import { registerTrackingWebSockets } from './websocket/tracking';
import { registerRideRoutes } from './routes/rides';
import { registerDriverRoutes } from './routes/driver';
import { registerAdminRoutes } from './routes/admin';

async function bootstrap() {
  const fastify = Fastify({
    logger: env.NODE_ENV === 'development' ? {
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
      }
    } : true,
    trustProxy: true,
  });

  // Security & Cross-Origin
  await fastify.register(helmet, { contentSecurityPolicy: false });
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Register WebSocket plugin
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB max
    }
  });

  // Health check endpoint (for OCI Load Balancer / Uptime Kuma)
  fastify.get('/health', async () => {
    return {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      region: 'Karur, Tamil Nadu (OCI ARM64)',
    };
  });

  // Register WebSockets and Routes
  registerTrackingWebSockets(fastify);
  await registerRideRoutes(fastify);
  await registerDriverRoutes(fastify);
  await registerAdminRoutes(fastify);

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      fastify.log.info(`Received ${signal}, closing server gracefully...`);
      await fastify.close();
      process.exit(0);
    });
  }

  const port = parseInt(env.PORT, 10);
  await fastify.listen({ port, host: env.HOST });
  console.log(`🚀 Karur Taxi (கரூர் டாக்ஸி) Engine listening on http://${env.HOST}:${port}`);
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

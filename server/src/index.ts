import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { loadEnv } from './env.js';
import { linksRoutes } from './routes/links.js';

loadEnv();

const fastify = Fastify({
  logger: true,
});

fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    const firstValidationError = error.validation[0];
    const field = 'instancePath' in firstValidationError
      ? String(firstValidationError.instancePath).replace('/', '')
      : '';
    const message = firstValidationError.message ?? '';

    if (field === 'code' || message.includes('code')) {
      return reply.status(400).send({ error: 'Link encurtado inválido' });
    }

    if (field === 'originalUrl' || message.includes('originalUrl')) {
      return reply.status(400).send({ error: 'URL original inválida' });
    }

    if (field === 'cursor' || message.includes('cursor')) {
      return reply.status(400).send({ error: 'Cursor inválido' });
    }

    return reply.status(400).send({ error: 'Dados inválidos' });
  }

  return reply.send(error);
});

await fastify.register(cors, {
  origin: true,
});

await fastify.register(swagger, {
  openapi: {
    info: {
      title: 'Encurtador API',
      description: 'API para criação, gestão e exportação de links encurtados.',
      version: '1.0.0',
    },
    tags: [
      { name: 'Links', description: 'Operações para links encurtados' },
    ],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

await fastify.register(linksRoutes);

const port = Number(process.env.PORT) || 3333;
const host = '0.0.0.0';

try {
  await fastify.listen({ port, host });
  console.log(`Server listening on http://localhost:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}

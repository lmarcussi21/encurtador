import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { links } from '../db/schema.js';
import { randomUUID, randomBytes } from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const CODE_REGEX = /^[a-zA-Z0-9-_]+$/;
const CODE_MIN_LENGTH = 1;
const CODE_MAX_LENGTH = 32;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const CSV_DELIMITERS = {
  comma: ',',
  semicolon: ';',
} as const;

const linkSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    originalUrl: { type: 'string', format: 'uri' },
    code: { type: 'string' },
    clicks: { type: 'integer', minimum: 0 },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

function generateRandomCode(length = 6): string {
  return randomBytes(length).toString('hex').slice(0, length);
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isValidCode(code: string): boolean {
  return (
    code.length >= CODE_MIN_LENGTH &&
    code.length <= CODE_MAX_LENGTH &&
    CODE_REGEX.test(code)
  );
}

function toPositiveInteger(value: string | number | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : fallback;
}

function encodeCursor(link: { createdAt: Date; id: string }): string {
  const cursor = JSON.stringify({
    createdAt: link.createdAt.toISOString(),
    id: link.id,
  });

  return Buffer.from(cursor, 'utf-8').toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as {
      createdAt?: string;
      id?: string;
    };

    if (!parsed.createdAt || !parsed.id) {
      return null;
    }

    const createdAt = new Date(parsed.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function csvEscape(value: string | number): string {
  const stringValue = String(value);

  return `"${stringValue.replace(/"/g, '""')}"`;
}

function getCsvDelimiterFromLocale(acceptLanguage?: string): {
  delimiter: keyof typeof CSV_DELIMITERS;
  separator: string;
} {
  const locale = acceptLanguage?.toLowerCase() ?? '';
  const delimiter = locale.includes('pt-br') || locale.startsWith('pt')
    ? 'semicolon'
    : 'comma';

  return {
    delimiter,
    separator: CSV_DELIMITERS[delimiter],
  };
}

export const linksRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/links', {
    schema: {
      tags: ['Links'],
      summary: 'Cria um link encurtado',
      body: {
        type: 'object',
        required: ['originalUrl'],
        properties: {
          originalUrl: { type: 'string', format: 'uri' },
          code: {
            type: 'string',
            description: 'Apelido do link encurtado. Não deve ser informado como URL completa.',
          },
        },
      },
      response: {
        201: linkSchema,
        400: errorSchema,
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const { originalUrl, code } = request.body as { originalUrl: string; code?: string };

    if (!originalUrl) {
      return reply.status(400).send({ error: 'URL original é obrigatória' });
    }

    if (!isValidUrl(originalUrl)) {
      return reply.status(400).send({ error: 'URL original inválida' });
    }

    let finalCode = code?.trim();

    if (finalCode) {
      if (!isValidCode(finalCode)) {
        return reply.status(400).send({ error: 'Link encurtado inválido' });
      }

      const existing = await db
        .select()
        .from(links)
        .where(eq(links.code, finalCode))
        .limit(1);

      if (existing.length > 0) {
        return reply.status(400).send({ error: 'Link encurtado já existente' });
      }
    } else {
      let attempts = 0;
      finalCode = undefined;

      while (attempts < 5) {
        const candidate = generateRandomCode();
        const existing = await db
          .select()
          .from(links)
          .where(eq(links.code, candidate))
          .limit(1);

        if (existing.length === 0) {
          finalCode = candidate;
          break;
        }

        attempts++;
      }

      if (!finalCode) {
        return reply.status(500).send({ error: 'Erro ao gerar código único' });
      }
    }

    const [newLink] = await db
      .insert(links)
      .values({
        originalUrl,
        code: finalCode,
      })
      .returning();

    return reply.status(201).send(newLink);
  });

  fastify.get('/links', {
    schema: {
      tags: ['Links'],
      summary: 'Lista links de forma paginada',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: DEFAULT_PAGE },
          limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT },
          cursor: {
            type: 'string',
            description: 'Cursor retornado em meta.nextCursor para buscar a próxima página sem OFFSET.',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            items: { type: 'array', items: linkSchema },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                nextCursor: { type: 'string', nullable: true },
                hasMore: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { page, limit, cursor } = request.query as {
      page?: string;
      limit?: string;
      cursor?: string;
    };
    const limitNum = Math.min(toPositiveInteger(limit, DEFAULT_LIMIT), MAX_LIMIT);

    if (cursor) {
      const decodedCursor = decodeCursor(cursor);

      if (!decodedCursor) {
        return reply.status(400).send({ error: 'Cursor inválido' });
      }

      const itemsPlusOne = await db
        .select()
        .from(links)
        .where(
          sql`(${links.createdAt}, ${links.id}) < (${decodedCursor.createdAt.toISOString()}::timestamp, ${decodedCursor.id}::uuid)`,
        )
        .orderBy(desc(links.createdAt), desc(links.id))
        .limit(limitNum + 1);

      const hasMore = itemsPlusOne.length > limitNum;
      const items = itemsPlusOne.slice(0, limitNum);
      const lastItem = items[items.length - 1];

      return {
        items,
        meta: {
          limit: limitNum,
          nextCursor: hasMore && lastItem ? encodeCursor(lastItem) : null,
          hasMore,
        },
      };
    }

    const pageNum = toPositiveInteger(page, DEFAULT_PAGE);
    const offsetNum = (pageNum - 1) * limitNum;

    const items = await db
      .select()
      .from(links)
      .orderBy(desc(links.createdAt), desc(links.id))
      .limit(limitNum)
      .offset(offsetNum);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(links);

    const total = countResult?.count ?? 0;

    return {
      items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: pageNum * limitNum < total,
        nextCursor: pageNum * limitNum < total && items.length > 0
          ? encodeCursor(items[items.length - 1])
          : null,
      },
    };
  });

  fastify.get('/links/:code', {
    schema: {
      tags: ['Links'],
      summary: 'Obtém a URL original por meio da URL encurtada',
      params: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string' },
        },
      },
      response: {
        200: linkSchema,
        404: errorSchema,
      },
    },
  }, async (request, reply) => {
    const { code } = request.params as { code: string };

    const result = await db
      .select()
      .from(links)
      .where(eq(links.code, code))
      .limit(1);

    if (result.length === 0) {
      return reply.status(404).send({ error: 'Link encurtado não encontrado' });
    }

    const link = result[0];
    const clicks = link.clicks + 1;

    await db
      .update(links)
      .set({ clicks })
      .where(eq(links.id, link.id));

    return {
      id: link.id,
      originalUrl: link.originalUrl,
      code: link.code,
      clicks,
      createdAt: link.createdAt,
    };
  });

  fastify.delete('/links/:id', {
    schema: {
      tags: ['Links'],
      summary: 'Deleta um link',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        204: { type: 'null' },
        404: errorSchema,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await db
      .delete(links)
      .where(eq(links.id, id))
      .returning();

    if (result.length === 0) {
      return reply.status(404).send({ error: 'Link não encontrado' });
    }

    return reply.status(204).send();
  });

  fastify.post('/links/:id/clicks', {
    schema: {
      tags: ['Links'],
      summary: 'Incrementa a quantidade de acessos de um link',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: linkSchema,
        404: errorSchema,
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await db
      .select()
      .from(links)
      .where(eq(links.id, id))
      .limit(1);

    if (result.length === 0) {
      return reply.status(404).send({ error: 'Link não encontrado' });
    }

    const link = result[0];

    const [updated] = await db
      .update(links)
      .set({ clicks: link.clicks + 1 })
      .where(eq(links.id, id))
      .returning();

    return updated;
  });

  fastify.post('/links/export', {
    schema: {
      tags: ['Links'],
      summary: 'Exporta os links cadastrados em CSV para uma CDN compatível com S3',
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            fileName: { type: 'string' },
            delimiter: { type: 'string', enum: ['semicolon', 'comma'] },
            locale: { type: 'string' },
          },
        },
        500: errorSchema,
      },
    },
  }, async (request, reply) => {
    const acceptLanguage = request.headers['accept-language'];
    const locale = Array.isArray(acceptLanguage) ? acceptLanguage.join(',') : acceptLanguage;
    const { delimiter, separator } = getCsvDelimiterFromLocale(locale);

    const allLinks = await db
      .select()
      .from(links)
      .orderBy(desc(links.createdAt));

    const headers = ['URL original', 'URL encurtada', 'Contagem de acessos', 'Data de criação'];
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';

    const csvRows = allLinks.map((link) => {
      const shortenedUrl = `${frontendUrl.replace(/\/$/, '')}/${link.code}`;

      return [
        csvEscape(link.originalUrl),
        csvEscape(shortenedUrl),
        link.clicks,
        link.createdAt.toISOString(),
      ].join(separator);
    });

    const csvContent = `\uFEFF${[headers.join(separator), ...csvRows].join('\n')}`;

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
    const bucket = process.env.CLOUDFLARE_BUCKET;
    const publicUrl = process.env.CLOUDFLARE_PUBLIC_URL;
    const fileName = `${randomUUID()}.csv`;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      return reply.status(500).send({
        error: 'Configuração da CDN do Cloudflare R2 está incompleta no arquivo .env',
      });
    }

    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    const s3 = new S3Client({
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: 'auto',
    });

    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: csvBuffer,
        ContentType: 'text/csv; charset=utf-8',
      }));

      const url = `${publicUrl.replace(/\/$/, '')}/${fileName}`;

      return { url, fileName, delimiter, locale: locale ?? 'en-US' };
    } catch (err: unknown) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao fazer upload do relatório para o CDN' });
    }
  });
};

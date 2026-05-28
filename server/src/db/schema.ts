import { pgTable, text, integer, timestamp, uuid, index } from 'drizzle-orm/pg-core';

export const links = pgTable(
  'links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    originalUrl: text('original_url').notNull(),
    code: text('code').notNull().unique(),
    clicks: integer('clicks').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdIndex: index('links_created_at_id_index').on(table.createdAt, table.id),
  }),
);

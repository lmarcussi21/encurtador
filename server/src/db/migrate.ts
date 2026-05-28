import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, client } from './index.js';
import { loadEnv } from '../env.js';

loadEnv();

console.log('Executando migrações no banco de dados...');

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrações aplicadas com sucesso!');
} catch (err) {
  console.error('Erro ao executar as migrações:', err);
  process.exit(1);
} finally {
  await client.end();
}

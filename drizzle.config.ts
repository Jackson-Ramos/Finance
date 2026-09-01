import type { Config } from 'drizzle-kit';

/**
 * O drizzle-kit aqui é ferramenta de INSPEÇÃO (studio, check), não gerador de
 * migrations: as migrations são escritas à mão em `src/db/migrations/` porque
 * o gerador não produz `down` e a Fase 1 exige reversibilidade.
 */
export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;

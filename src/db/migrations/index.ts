import { migration0001 } from './0001_esquema_inicial';
import type { Migration } from './tipos';

export type { Migration } from './tipos';

/**
 * Todas as migrations, em ordem de aplicação.
 * Migration nova entra SEMPRE no fim, com `id` = último + 1. Nunca edite uma
 * migration já publicada — o banco de quem já instalou não vai rodá-la de novo.
 */
export const MIGRATIONS: readonly Migration[] = [migration0001];

/** Maior `id` conhecido; 0 quando não há nenhuma. */
export const VERSAO_ALVO: number = MIGRATIONS.reduce((max, m) => Math.max(max, m.id), 0);

/**
 * Falha cedo (na importação do módulo, via migrator) se a lista estiver
 * malformada: ids fora de sequência, repetidos ou passo sem `down`.
 */
export function validarMigrations(migrations: readonly Migration[] = MIGRATIONS): void {
  migrations.forEach((m, i) => {
    if (m.id !== i + 1) {
      throw new Error(`migration na posição ${i} deveria ter id ${i + 1}, tem ${m.id} (${m.nome})`);
    }
    if (m.up.length === 0) throw new Error(`migration ${m.id} (${m.nome}) não tem comandos de up`);
    if (m.down.length === 0) throw new Error(`migration ${m.id} (${m.nome}) não tem comandos de down`);
  });
}

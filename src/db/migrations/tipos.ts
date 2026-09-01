/**
 * Contrato de uma migration.
 *
 * Escritas à mão em vez de geradas pelo `drizzle-kit generate` por um motivo
 * só: o gerador do Drizzle não produz `down`. O critério da Fase 1 exige que as
 * migrations sejam REVERSÍVEIS, então cada passo declara o SQL de ida e o de
 * volta, e o par é verificado por teste (up -> down -> up).
 */
export interface Migration {
  /** Sequencial, começando em 1. Define a ordem de aplicação. */
  readonly id: number;
  /** Rótulo humano, aparece na tela de debug e na tabela de controle. */
  readonly nome: string;
  /** Comandos aplicados na subida, em ordem. */
  readonly up: readonly string[];
  /** Comandos aplicados na descida, em ordem (inverso do `up`). */
  readonly down: readonly string[];
}

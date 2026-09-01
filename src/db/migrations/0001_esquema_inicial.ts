import type { Migration } from './tipos';

/**
 * Esquema inicial: categoria, objetivo, recorrencia, lancamento.
 *
 * Decisões que valem comentário:
 * - Dinheiro é INTEGER (centavos) em toda coluna monetária, com CHECK >= 0.
 *   O sinal nunca é gravado; vem de `tipo`.
 * - Data é TEXT 'YYYY-MM-DD', validado por GLOB. Ordena lexicograficamente
 *   igual a cronologicamente, o que faz BETWEEN funcionar sem fuso.
 * - `pago` e `data_pagamento` são amarrados por CHECK: ou os dois indicam
 *   "não pago", ou os dois indicam "pago". Sem isso, "realizado" (soma de
 *   pago=1) poderia divergir da data de caixa.
 * - FKs usam ON DELETE SET NULL: apagar uma categoria não pode apagar o
 *   histórico financeiro do usuário.
 */
export const migration0001: Migration = {
  id: 1,
  nome: 'esquema_inicial',
  up: [
    `CREATE TABLE categoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      grupo TEXT,
      cor TEXT,
      icone TEXT,
      divida INTEGER DEFAULT 0,
      arquivada INTEGER DEFAULT 0,
      CONSTRAINT categoria_grupo_ck CHECK (grupo IS NULL OR grupo IN ('CASA','PESSOAL')),
      CONSTRAINT categoria_divida_ck CHECK (divida IN (0,1)),
      CONSTRAINT categoria_arquivada_ck CHECK (arquivada IN (0,1))
    )`,
    `CREATE INDEX idx_categoria_arquivada ON categoria(arquivada)`,

    `CREATE TABLE objetivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor_alvo INTEGER NOT NULL,
      meta_mensal INTEGER,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT,
      CONSTRAINT objetivo_valor_alvo_ck CHECK (valor_alvo >= 0),
      CONSTRAINT objetivo_meta_mensal_ck CHECK (meta_mensal IS NULL OR meta_mensal >= 0),
      CONSTRAINT objetivo_ativo_ck CHECK (ativo IN (0,1))
    )`,

    `CREATE TABLE recorrencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao TEXT NOT NULL,
      valor_previsto INTEGER NOT NULL,
      dia_do_mes INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      natureza TEXT NOT NULL,
      categoria_id INTEGER REFERENCES categoria(id) ON DELETE SET NULL,
      ativo INTEGER DEFAULT 1,
      CONSTRAINT recorrencia_dia_ck CHECK (dia_do_mes BETWEEN 1 AND 31),
      CONSTRAINT recorrencia_valor_ck CHECK (valor_previsto >= 0),
      CONSTRAINT recorrencia_tipo_ck CHECK (tipo IN ('RECEITA','DESPESA','APORTE')),
      CONSTRAINT recorrencia_natureza_ck CHECK (natureza IN ('FIXA','VARIAVEL')),
      CONSTRAINT recorrencia_ativo_ck CHECK (ativo IN (0,1))
    )`,
    `CREATE INDEX idx_recorrencia_ativo ON recorrencia(ativo)`,

    `CREATE TABLE lancamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      data_pagamento TEXT,
      descricao TEXT,
      valor INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      natureza TEXT,
      categoria_id INTEGER REFERENCES categoria(id) ON DELETE SET NULL,
      objetivo_id INTEGER REFERENCES objetivo(id) ON DELETE SET NULL,
      recorrencia_id INTEGER REFERENCES recorrencia(id) ON DELETE SET NULL,
      pago INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL,
      CONSTRAINT lancamento_tipo_ck CHECK (tipo IN ('RECEITA','DESPESA','APORTE')),
      CONSTRAINT lancamento_natureza_ck CHECK (natureza IS NULL OR natureza IN ('FIXA','VARIAVEL')),
      CONSTRAINT lancamento_valor_ck CHECK (valor >= 0),
      CONSTRAINT lancamento_pago_ck CHECK (pago IN (0,1)),
      CONSTRAINT lancamento_data_ck CHECK (data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
      CONSTRAINT lancamento_data_pagamento_ck CHECK (
        data_pagamento IS NULL OR data_pagamento GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      ),
      CONSTRAINT lancamento_pagamento_coerente_ck CHECK (
        (pago = 0 AND data_pagamento IS NULL) OR (pago = 1 AND data_pagamento IS NOT NULL)
      )
    )`,
    `CREATE INDEX idx_lancamento_data ON lancamento(data)`,
    `CREATE INDEX idx_lancamento_tipo_data ON lancamento(tipo, data)`,
    `CREATE INDEX idx_lancamento_recorrencia_data ON lancamento(recorrencia_id, data)`,
    `CREATE INDEX idx_lancamento_categoria_data ON lancamento(categoria_id, data)`,
    // Trava de idempotência: no máximo um lançamento por (recorrência, ano-mês).
    // Mesmo que a geração seja chamada dez vezes em paralelo, o banco recusa a
    // duplicata. Parcial para não travar lançamentos avulsos (recorrencia_id NULL).
    `CREATE UNIQUE INDEX idx_lancamento_recorrencia_mes
       ON lancamento(recorrencia_id, substr(data, 1, 7))
       WHERE recorrencia_id IS NOT NULL`,
  ],
  down: [
    `DROP INDEX IF EXISTS idx_lancamento_recorrencia_mes`,
    `DROP INDEX IF EXISTS idx_lancamento_categoria_data`,
    `DROP INDEX IF EXISTS idx_lancamento_recorrencia_data`,
    `DROP INDEX IF EXISTS idx_lancamento_tipo_data`,
    `DROP INDEX IF EXISTS idx_lancamento_data`,
    `DROP TABLE IF EXISTS lancamento`,
    `DROP INDEX IF EXISTS idx_recorrencia_ativo`,
    `DROP TABLE IF EXISTS recorrencia`,
    `DROP TABLE IF EXISTS objetivo`,
    `DROP INDEX IF EXISTS idx_categoria_arquivada`,
    `DROP TABLE IF EXISTS categoria`,
  ],
};

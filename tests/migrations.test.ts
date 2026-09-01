import { beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, validarMigrations, VERSAO_ALVO } from '../src/db/migrations';
import type { Migration } from '../src/db/migrations';
import {
  historicoMigracoes,
  migracoesAplicadas,
  migrar,
  recriar,
  reverter,
  versaoAtual,
} from '../src/db/migrator';
import type { BancoSQLite } from '../src/db/sqlite';
import { abrirBancoDeTeste, esquema, indices, tabelas } from './apoio/bancoDeTeste';

const AGORA = () => '2026-08-31';

let db: BancoSQLite & { fechar: () => void };

beforeEach(() => {
  db = abrirBancoDeTeste();
});

describe('lista de migrations', () => {
  it('tem ids sequenciais a partir de 1 e todo passo tem down', () => {
    expect(() => validarMigrations()).not.toThrow();
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    expect(VERSAO_ALVO).toBe(MIGRATIONS.length);
  });

  it('recusa uma lista com id fora de sequência', () => {
    const quebrada: Migration[] = [{ id: 2, nome: 'x', up: ['SELECT 1'], down: ['SELECT 1'] }];
    expect(() => validarMigrations(quebrada)).toThrow(/id 1/);
  });

  it('recusa migration sem down', () => {
    const semDown: Migration[] = [{ id: 1, nome: 'x', up: ['SELECT 1'], down: [] }];
    expect(() => validarMigrations(semDown)).toThrow(/down/);
  });
});

describe('subida do zero', () => {
  it('cria todas as tabelas do esquema', () => {
    const r = migrar(db, { agora: AGORA });

    expect(r.versaoAnterior).toBe(0);
    expect(r.versaoAtual).toBe(VERSAO_ALVO);
    expect(r.aplicadas).toEqual(MIGRATIONS.map((m) => m.id));
    expect(tabelas(db)).toEqual(['__migracoes', 'categoria', 'lancamento', 'objetivo', 'recorrencia']);
  });

  it('cria os índices exigidos pelo spec, mais a trava de idempotência', () => {
    migrar(db, { agora: AGORA });
    const nomes = indices(db);

    expect(nomes).toContain('idx_lancamento_data');
    expect(nomes).toContain('idx_lancamento_tipo_data');
    expect(nomes).toContain('idx_lancamento_recorrencia_data');
    expect(nomes).toContain('idx_lancamento_recorrencia_mes');
  });

  it('registra o histórico na tabela de controle', () => {
    migrar(db, { agora: AGORA });
    const historico = historicoMigracoes(db);

    expect(historico).toHaveLength(MIGRATIONS.length);
    expect(historico[0]).toMatchObject({ id: 1, nome: 'esquema_inicial', aplicada_em: '2026-08-31' });
  });
});

describe('idempotência', () => {
  it('rodar dez vezes não aplica nada além da primeira', () => {
    migrar(db, { agora: AGORA });
    const esquemaInicial = esquema(db);

    for (let i = 0; i < 9; i++) {
      const r = migrar(db, { agora: AGORA });
      expect(r.aplicadas).toEqual([]);
    }

    expect(versaoAtual(db)).toBe(VERSAO_ALVO);
    expect(historicoMigracoes(db)).toHaveLength(MIGRATIONS.length);
    expect(esquema(db)).toBe(esquemaInicial);
  });
});

describe('reversibilidade', () => {
  it('reverter até 0 deixa o banco sem nenhuma tabela da aplicação', () => {
    migrar(db, { agora: AGORA });
    const r = reverter(db, 0);

    expect(r.revertidas).toEqual([...MIGRATIONS].map((m) => m.id).reverse());
    expect(versaoAtual(db)).toBe(0);
    expect(migracoesAplicadas(db)).toEqual([]);
    // Só a tabela de controle sobrevive — ela não é criada por migration.
    expect(tabelas(db)).toEqual(['__migracoes']);
    expect(indices(db)).toEqual([]);
  });

  it('up -> down -> up devolve exatamente o mesmo esquema', () => {
    migrar(db, { agora: AGORA });
    const antes = esquema(db);

    reverter(db, 0);
    migrar(db, { agora: AGORA });

    expect(esquema(db)).toBe(antes);
    expect(versaoAtual(db)).toBe(VERSAO_ALVO);
  });

  it('recriar() derruba e sobe de novo, zerando os dados', () => {
    migrar(db, { agora: AGORA });
    db.runSync(`INSERT INTO categoria (nome, grupo) VALUES (?, ?)`, ['Mercado', 'CASA']);
    expect(db.getAllSync(`SELECT * FROM categoria`)).toHaveLength(1);

    recriar(db, { agora: AGORA });

    expect(versaoAtual(db)).toBe(VERSAO_ALVO);
    expect(db.getAllSync(`SELECT * FROM categoria`)).toHaveLength(0);
  });

  it('reverter num banco já vazio é no-op', () => {
    const r = reverter(db, 0);
    expect(r.revertidas).toEqual([]);
    expect(versaoAtual(db)).toBe(0);
  });
});

describe('atomicidade', () => {
  it('migration que falha no meio não deixa tabela pela metade', () => {
    const quebrada: Migration[] = [
      {
        id: 1,
        nome: 'quebrada',
        up: [`CREATE TABLE a (id INTEGER PRIMARY KEY)`, `ISTO NAO E SQL`],
        down: [`DROP TABLE IF EXISTS a`],
      },
    ];

    expect(() => migrar(db, { migrations: quebrada, agora: AGORA })).toThrow();
    expect(tabelas(db)).toEqual(['__migracoes']);
    expect(versaoAtual(db)).toBe(0);
  });
});

describe('invariantes do esquema (CHECKs)', () => {
  beforeEach(() => {
    migrar(db, { agora: AGORA });
  });

  const inserirLancamento = (
    campos: Partial<{
      data: string;
      data_pagamento: string | null;
      valor: number;
      tipo: string;
      natureza: string | null;
      recorrencia_id: number | null;
      pago: number;
    }> = {},
  ) => {
    const l = {
      data: '2026-08-10',
      data_pagamento: null,
      valor: 1000,
      tipo: 'DESPESA',
      natureza: 'VARIAVEL',
      recorrencia_id: null,
      pago: 0,
      ...campos,
    };
    db.runSync(
      `INSERT INTO lancamento (data, data_pagamento, valor, tipo, natureza, recorrencia_id, pago, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [l.data, l.data_pagamento, l.valor, l.tipo, l.natureza, l.recorrencia_id, l.pago, '2026-08-10'],
    );
  };

  it('aceita um lançamento válido', () => {
    expect(() => inserirLancamento()).not.toThrow();
  });

  it('recusa valor negativo (o sinal vem do tipo, nunca do valor)', () => {
    expect(() => inserirLancamento({ valor: -1000 })).toThrow();
  });

  it('recusa tipo fora do domínio', () => {
    expect(() => inserirLancamento({ tipo: 'TRANSFERENCIA' })).toThrow();
  });

  it('recusa natureza fora do domínio, mas aceita NULL', () => {
    expect(() => inserirLancamento({ natureza: 'SEMESTRAL' })).toThrow();
    expect(() => inserirLancamento({ natureza: null })).not.toThrow();
  });

  it('recusa data fora do formato YYYY-MM-DD', () => {
    expect(() => inserirLancamento({ data: '10/08/2026' })).toThrow();
    expect(() => inserirLancamento({ data: '2026-8-10' })).toThrow();
  });

  it('amarra pago e data_pagamento', () => {
    expect(() => inserirLancamento({ pago: 1, data_pagamento: null })).toThrow();
    expect(() => inserirLancamento({ pago: 0, data_pagamento: '2026-08-10' })).toThrow();
    expect(() => inserirLancamento({ pago: 1, data_pagamento: '2026-08-10' })).not.toThrow();
  });

  it('recusa dia_do_mes fora de 1..31', () => {
    const inserirRecorrencia = (dia: number) =>
      db.runSync(
        `INSERT INTO recorrencia (descricao, valor_previsto, dia_do_mes, tipo, natureza)
         VALUES (?, ?, ?, ?, ?)`,
        ['Aluguel', 180000, dia, 'DESPESA', 'FIXA'],
      );

    expect(() => inserirRecorrencia(0)).toThrow();
    expect(() => inserirRecorrencia(32)).toThrow();
    expect(() => inserirRecorrencia(31)).not.toThrow();
  });

  it('recusa grupo de categoria fora de CASA/PESSOAL, mas aceita NULL', () => {
    expect(() =>
      db.runSync(`INSERT INTO categoria (nome, grupo) VALUES (?, ?)`, ['X', 'TRABALHO']),
    ).toThrow();
    expect(() =>
      db.runSync(`INSERT INTO categoria (nome, grupo) VALUES (?, ?)`, ['Salário', null]),
    ).not.toThrow();
  });
});

describe('trava de idempotência das recorrências', () => {
  beforeEach(() => {
    migrar(db, { agora: AGORA });
    db.runSync(
      `INSERT INTO recorrencia (id, descricao, valor_previsto, dia_do_mes, tipo, natureza)
       VALUES (1, 'Aluguel', 180000, 5, 'DESPESA', 'FIXA')`,
    );
  });

  const gerar = (data: string) =>
    db.runSync(
      `INSERT INTO lancamento (data, valor, tipo, natureza, recorrencia_id, pago, criado_em)
       VALUES (?, 180000, 'DESPESA', 'FIXA', 1, 0, '2026-08-01')`,
      [data],
    );

  it('o banco recusa dois lançamentos da mesma recorrência no mesmo mês', () => {
    gerar('2026-08-05');
    expect(() => gerar('2026-08-05')).toThrow();
    // Nem em outro dia do mesmo mês.
    expect(() => gerar('2026-08-20')).toThrow();
  });

  it('permite a mesma recorrência em meses diferentes', () => {
    gerar('2026-08-05');
    expect(() => gerar('2026-09-05')).not.toThrow();
    expect(() => gerar('2026-07-05')).not.toThrow();
  });

  it('não trava lançamentos avulsos (recorrencia_id NULL)', () => {
    const avulso = () =>
      db.runSync(
        `INSERT INTO lancamento (data, valor, tipo, recorrencia_id, pago, criado_em)
         VALUES ('2026-08-05', 1000, 'DESPESA', NULL, 0, '2026-08-05')`,
      );
    avulso();
    expect(avulso).not.toThrow();
  });
});

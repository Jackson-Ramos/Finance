import { describe, expect, it } from 'vitest';
import {
  anoMesDe,
  assertDataISO,
  chaveAnoMes,
  compararDatas,
  deDate,
  diaDaSemana,
  diaDoMesGrampeado,
  diasNoMes,
  ehAnoMes,
  ehDataISO,
  estaNoMes,
  hoje,
  intervaloDoMes,
  mesAnterior,
  mesSeguinte,
  mesesAnteriores,
  paraDate,
  primeiroDia,
  somarMeses,
  ultimoDia,
  ultimosMeses,
} from '../src/lib/date';

describe('validação', () => {
  it('aceita apenas YYYY-MM-DD que existe no calendário', () => {
    expect(ehDataISO('2026-08-31')).toBe(true);
    expect(ehDataISO('2024-02-29')).toBe(true); // bissexto
    expect(ehDataISO('2026-02-29')).toBe(false); // não bissexto
    expect(ehDataISO('2026-02-30')).toBe(false);
    expect(ehDataISO('2026-04-31')).toBe(false);
    expect(ehDataISO('2026-13-01')).toBe(false);
    expect(ehDataISO('2026-00-01')).toBe(false);
    expect(ehDataISO('2026-08-00')).toBe(false);
    expect(ehDataISO('2026-8-31')).toBe(false);
    expect(ehDataISO('31/08/2026')).toBe(false);
    expect(ehDataISO('2026-08-31T00:00:00Z')).toBe(false);
    expect(ehDataISO(null)).toBe(false);
  });

  it('assertDataISO explica o formato esperado', () => {
    expect(() => assertDataISO('31/08/2026', 'data')).toThrow(/YYYY-MM-DD/);
  });

  it('valida chave de mês', () => {
    expect(ehAnoMes('2026-08')).toBe(true);
    expect(ehAnoMes('2026-13')).toBe(false);
    expect(ehAnoMes('2026-08-01')).toBe(false);
  });
});

describe('conversão sem fuso', () => {
  it('paraDate devolve meia-noite LOCAL, não UTC', () => {
    const d = paraDate('2026-08-31');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(31);
    expect(d.getHours()).toBe(0);
  });

  it('não escorrega um dia no fuso do Brasil (UTC-3)', () => {
    // `new Date('2026-08-31')` seria 31/08 00:00 UTC = 30/08 21:00 em SP.
    expect(deDate(new Date('2026-08-31'))).not.toBe('2026-08-31');
    expect(deDate(paraDate('2026-08-31'))).toBe('2026-08-31');
  });

  it('faz ida e volta em todos os dias de um ano bissexto', () => {
    for (let mes = 1; mes <= 12; mes++) {
      const chave = chaveAnoMes(2024, mes);
      for (let dia = 1; dia <= diasNoMes(chave); dia++) {
        const iso = `${chave}-${String(dia).padStart(2, '0')}`;
        expect(deDate(paraDate(iso))).toBe(iso);
      }
    }
  });

  it('hoje() devolve uma data ISO válida', () => {
    expect(ehDataISO(hoje())).toBe(true);
  });
});

describe('dias no mês', () => {
  it('conhece 28, 29, 30 e 31', () => {
    expect(diasNoMes('2026-02')).toBe(28);
    expect(diasNoMes('2024-02')).toBe(29);
    expect(diasNoMes('2000-02')).toBe(29); // divisível por 400
    expect(diasNoMes('1900-02')).toBe(28); // divisível por 100, não por 400
    expect(diasNoMes('2026-04')).toBe(30);
    expect(diasNoMes('2026-01')).toBe(31);
    expect(diasNoMes('2026-12')).toBe(31);
  });
});

describe('diaDoMesGrampeado — virada de mês das recorrências', () => {
  it('mantém o dia quando ele cabe no mês', () => {
    expect(diaDoMesGrampeado('2026-08', 5)).toBe('2026-08-05');
    expect(diaDoMesGrampeado('2026-08', 31)).toBe('2026-08-31');
    expect(diaDoMesGrampeado('2026-08', 1)).toBe('2026-08-01');
  });

  it('grampeia no último dia de fevereiro (28)', () => {
    expect(diaDoMesGrampeado('2026-02', 29)).toBe('2026-02-28');
    expect(diaDoMesGrampeado('2026-02', 30)).toBe('2026-02-28');
    expect(diaDoMesGrampeado('2026-02', 31)).toBe('2026-02-28');
  });

  it('grampeia no último dia de fevereiro bissexto (29)', () => {
    expect(diaDoMesGrampeado('2024-02', 29)).toBe('2024-02-29');
    expect(diaDoMesGrampeado('2024-02', 30)).toBe('2024-02-29');
    expect(diaDoMesGrampeado('2024-02', 31)).toBe('2024-02-29');
  });

  it('grampeia no dia 30 em meses de 30 dias', () => {
    for (const mes of ['2026-04', '2026-06', '2026-09', '2026-11']) {
      expect(diaDoMesGrampeado(mes, 31)).toBe(`${mes}-30`);
      expect(diaDoMesGrampeado(mes, 30)).toBe(`${mes}-30`);
    }
  });

  it('o resultado é sempre uma data que existe, para todo dia 1..31 e todo mês', () => {
    for (let ano = 2023; ano <= 2028; ano++) {
      for (let mes = 1; mes <= 12; mes++) {
        for (let dia = 1; dia <= 31; dia++) {
          const iso = diaDoMesGrampeado(chaveAnoMes(ano, mes), dia);
          expect(ehDataISO(iso), iso).toBe(true);
          expect(anoMesDe(iso)).toBe(chaveAnoMes(ano, mes));
        }
      }
    }
  });

  it('recusa dia fora de 1..31', () => {
    expect(() => diaDoMesGrampeado('2026-08', 0)).toThrow(/1 e 31/);
    expect(() => diaDoMesGrampeado('2026-08', 32)).toThrow(/1 e 31/);
    expect(() => diaDoMesGrampeado('2026-08', 5.5)).toThrow(/1 e 31/);
  });
});

describe('navegação entre meses', () => {
  it('anda para frente e para trás cruzando o ano', () => {
    expect(mesSeguinte('2026-12')).toBe('2027-01');
    expect(mesAnterior('2026-01')).toBe('2025-12');
    expect(somarMeses('2026-08', 6)).toBe('2027-02');
    expect(somarMeses('2026-08', -8)).toBe('2025-12');
    expect(somarMeses('2026-08', 0)).toBe('2026-08');
  });

  it('não é afetado por meses de tamanhos diferentes', () => {
    // O bug clássico é somar 1 mês em 31/01 e cair em 03/03. Aqui a chave é
    // só ano-mês, então nunca há dia para transbordar.
    expect(somarMeses('2026-01', 1)).toBe('2026-02');
    expect(somarMeses('2026-01', 2)).toBe('2026-03');
    expect(somarMeses('2024-01', 1)).toBe('2024-02');
  });

  it('ultimosMeses inclui o mês de referência, em ordem cronológica', () => {
    expect(ultimosMeses('2026-03', 3)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(ultimosMeses('2026-01', 3)).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(ultimosMeses('2026-08', 1)).toEqual(['2026-08']);
    expect(ultimosMeses('2026-12', 12)).toHaveLength(12);
  });

  it('mesesAnteriores exclui o mês de referência', () => {
    expect(mesesAnteriores('2026-04', 3)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(mesesAnteriores('2026-01', 3)).toEqual(['2025-10', '2025-11', '2025-12']);
  });

  it('recusa n inválido', () => {
    expect(() => ultimosMeses('2026-08', 0)).toThrow();
    expect(() => ultimosMeses('2026-08', -1)).toThrow();
  });
});

describe('limites do mês', () => {
  it('primeiro e último dia respeitam o tamanho do mês', () => {
    expect(primeiroDia('2026-02')).toBe('2026-02-01');
    expect(ultimoDia('2026-02')).toBe('2026-02-28');
    expect(ultimoDia('2024-02')).toBe('2024-02-29');
    expect(ultimoDia('2026-04')).toBe('2026-04-30');
    expect(ultimoDia('2026-12')).toBe('2026-12-31');
  });

  it('o intervalo do mês é fechado e serve para BETWEEN', () => {
    expect(intervaloDoMes('2026-02')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' });

    const { inicio, fim } = intervaloDoMes('2026-02');
    for (const dia of ['2026-02-01', '2026-02-15', '2026-02-28']) {
      expect(dia >= inicio && dia <= fim).toBe(true);
    }
    for (const fora of ['2026-01-31', '2026-03-01']) {
      expect(fora >= inicio && fora <= fim).toBe(false);
    }
  });
});

describe('comparação', () => {
  it('ordem lexicográfica é ordem cronológica', () => {
    expect(compararDatas('2026-01-31', '2026-02-01')).toBe(-1);
    expect(compararDatas('2026-02-01', '2026-01-31')).toBe(1);
    expect(compararDatas('2026-02-01', '2026-02-01')).toBe(0);

    const embaralhado = ['2026-12-01', '2026-01-15', '2025-12-31', '2026-01-02'];
    expect([...embaralhado].sort()).toEqual([
      '2025-12-31',
      '2026-01-02',
      '2026-01-15',
      '2026-12-01',
    ]);
  });

  it('estaNoMes usa a competência, não o fuso', () => {
    expect(estaNoMes('2026-08-01', '2026-08')).toBe(true);
    expect(estaNoMes('2026-08-31', '2026-08')).toBe(true);
    expect(estaNoMes('2026-09-01', '2026-08')).toBe(false);
  });

  it('diaDaSemana usa o calendário local', () => {
    // 31/08/2026 é uma segunda-feira.
    expect(diaDaSemana('2026-08-31')).toBe(1);
  });
});

import type { BimElement, PilarArranque, RedeHidrossanitaria, Sapata, TipoElemento, VigaBaldrame } from '../types';
import { calcularQuantitativo } from './quantities';
import { calcularQuantitativoTubulacao } from './hydro';

type ElementoEstrutural = Sapata | PilarArranque | VigaBaldrame;

function ehEstrutural(elemento: BimElement): elemento is ElementoEstrutural {
  return elemento.tipo === 'sapata' || elemento.tipo === 'pilar_arranque' || elemento.tipo === 'viga_baldrame';
}

export interface TotaisMateriais {
  quantidadeElementos: number;
  volumeConcretoM3: number;
  areaFormaM2: number;
  pesoAcoKg: number;
  cimentoSacos: number;
  areiaM3: number;
  britaM3: number;
}

export interface ResumoEtapa {
  /** Totais somando todos os elementos da etapa. */
  total: TotaisMateriais;
  /** Totais por tipo de elemento (só entram os tipos com pelo menos 1 elemento). */
  porTipo: { tipo: TipoElemento; totais: TotaisMateriais }[];
}

function totaisVazios(quantidadeElementos = 0): TotaisMateriais {
  return { quantidadeElementos, volumeConcretoM3: 0, areaFormaM2: 0, pesoAcoKg: 0, cimentoSacos: 0, areiaM3: 0, britaM3: 0 };
}

function somar(a: TotaisMateriais, b: TotaisMateriais): TotaisMateriais {
  return {
    quantidadeElementos: a.quantidadeElementos + b.quantidadeElementos,
    volumeConcretoM3: a.volumeConcretoM3 + b.volumeConcretoM3,
    areaFormaM2: a.areaFormaM2 + b.areaFormaM2,
    pesoAcoKg: a.pesoAcoKg + b.pesoAcoKg,
    cimentoSacos: a.cimentoSacos + b.cimentoSacos,
    areiaM3: a.areiaM3 + b.areiaM3,
    britaM3: a.britaM3 + b.britaM3,
  };
}

function totaisDoElemento(elemento: ElementoEstrutural): TotaisMateriais {
  const q = calcularQuantitativo(elemento);
  return {
    quantidadeElementos: 1,
    volumeConcretoM3: q.volumeConcretoM3,
    areaFormaM2: q.forma.areaTotalM2,
    pesoAcoKg: q.armadura.pesoTotalKg,
    cimentoSacos: q.concreto.cimentoSacos,
    areiaM3: q.concreto.areiaM3,
    britaM3: q.concreto.britaM3,
  };
}

const ORDEM_TIPO: TipoElemento[] = ['sapata', 'pilar_arranque', 'viga_baldrame'];

/**
 * Totais de material da etapa de fundação — sapata, pilar de arranque e viga baldrame — no
 * total geral e por tipo de elemento. Elementos de outras disciplinas (hidrossanitário) têm seu
 * próprio resumo (ver `resumoHidrossanitario`) e não entram aqui.
 */
export function calcularResumoEtapa(elementos: BimElement[]): ResumoEtapa {
  const porTipoMap = new Map<TipoElemento, TotaisMateriais>();
  let total = totaisVazios();

  for (const elemento of elementos.filter(ehEstrutural)) {
    const totaisEl = totaisDoElemento(elemento);
    total = somar(total, totaisEl);
    porTipoMap.set(elemento.tipo, somar(porTipoMap.get(elemento.tipo) ?? totaisVazios(), totaisEl));
  }

  const porTipo = ORDEM_TIPO.filter((tipo) => porTipoMap.has(tipo)).map((tipo) => ({ tipo, totais: porTipoMap.get(tipo)! }));

  return { total, porTipo };
}

export interface ResumoHidrossanitario {
  qtdTrechos: number;
  comprimentoTotalM: number;
  /** Comprimento total por rede — esgoto, água fria e pluvial são sistemas separados na obra,
   * então o quantitativo precisa discriminar, não só somar tudo junto. */
  comprimentoPorRedeM: Record<RedeHidrossanitaria, number>;
  qtdConexoes: number;
  pesoEstimadoKg: number;
  qtdCaixasDagua: number;
  capacidadeTotalLitros: number;
  qtdCaixasConcreto: number;
}

/** Totais de hidrossanitário (tubulação + caixa d'água + caixas de concreto) — separado do
 * resumo de fundação. */
export function calcularResumoHidrossanitario(elementos: BimElement[]): ResumoHidrossanitario {
  const r: ResumoHidrossanitario = {
    qtdTrechos: 0,
    comprimentoTotalM: 0,
    comprimentoPorRedeM: { esgoto: 0, agua_fria: 0, pluvial: 0 },
    qtdConexoes: 0,
    pesoEstimadoKg: 0,
    qtdCaixasDagua: 0,
    capacidadeTotalLitros: 0,
    qtdCaixasConcreto: 0,
  };
  for (const el of elementos) {
    if (el.tipo === 'tubulacao') {
      const q = calcularQuantitativoTubulacao(el);
      r.qtdTrechos += 1;
      r.comprimentoTotalM += q.comprimentoM;
      r.comprimentoPorRedeM[q.rede] += q.comprimentoM;
      r.qtdConexoes += q.qtdConexoes;
      r.pesoEstimadoKg += q.pesoEstimadoKg;
    } else if (el.tipo === 'caixa_dagua') {
      r.qtdCaixasDagua += 1;
      r.capacidadeTotalLitros += el.capacidadeLitros;
    } else if (el.tipo === 'caixa_concreto') {
      r.qtdCaixasConcreto += 1;
    }
  }
  return r;
}

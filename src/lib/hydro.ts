import type { CaixaConcreto, CaixaDagua, RedeHidrossanitaria, Tubulacao } from '../types';

export const NOME_REDE: Record<RedeHidrossanitaria, string> = {
  esgoto: 'Esgoto',
  agua_fria: 'Água fria',
  pluvial: 'Pluvial (água da chuva)',
};

export const NOME_SUBTIPO_CAIXA_CONCRETO = {
  gordura: 'Caixa de gordura',
  passagem: 'Caixa de passagem',
  fossa: 'Fossa',
} as const;

/**
 * Peso aproximado (kg/m) de tubo de PVC soldável por diâmetro nominal — tabela de referência
 * comum de mercado (classe/série padrão). É uma ESTIMATIVA: o peso real varia por fabricante,
 * série de parede (classe 15/20/EB) e material (PPR, ferro galvanizado etc. pesam diferente) —
 * útil pra ter uma ordem de grandeza do quantitativo, não pra orçamento fechado.
 */
const PESO_KG_M_PVC: Record<number, number> = {
  20: 0.11,
  25: 0.16,
  32: 0.22,
  40: 0.31,
  50: 0.44,
  60: 0.62,
  75: 0.95,
  100: 1.55,
  150: 2.9,
};

function pesoEstimadoKgM(diametroMm: number, material: string): number {
  if (!material.toLowerCase().includes('pvc')) return 0; // sem tabela de referência pra outros materiais ainda
  const diametros = Object.keys(PESO_KG_M_PVC).map(Number).sort((a, b) => a - b);
  const maisProximo = diametros.reduce((prev, curr) => (Math.abs(curr - diametroMm) < Math.abs(prev - diametroMm) ? curr : prev));
  return PESO_KG_M_PVC[maisProximo];
}

export interface QuantitativoTubulacao {
  rede: RedeHidrossanitaria;
  comprimentoM: number;
  diametroMm: number;
  material: string;
  qtdConexoes: number;
  pesoEstimadoKg: number;
  /** false quando não há tabela de referência pro material (peso fica 0, só informativo). */
  pesoConfiavel: boolean;
}

export function calcularQuantitativoTubulacao(elemento: Tubulacao): QuantitativoTubulacao {
  const pesoKgM = pesoEstimadoKgM(elemento.diametroMm, elemento.material);
  return {
    rede: elemento.rede,
    comprimentoM: elemento.geometria.comprimento,
    diametroMm: elemento.diametroMm,
    material: elemento.material,
    qtdConexoes: elemento.qtdConexoes,
    pesoEstimadoKg: pesoKgM * elemento.geometria.comprimento,
    pesoConfiavel: pesoKgM > 0,
  };
}

export interface QuantitativoCaixaDagua {
  capacidadeLitros: number;
  material: string;
  dimensoesM: { comprimento: number; largura: number; altura: number };
}

export function calcularQuantitativoCaixaDagua(elemento: CaixaDagua): QuantitativoCaixaDagua {
  return {
    capacidadeLitros: elemento.capacidadeLitros,
    material: elemento.material,
    dimensoesM: elemento.geometria,
  };
}

export interface QuantitativoCaixaConcreto {
  subtipo: CaixaConcreto['subtipo'];
  material: string;
  dimensoesM: { comprimento: number; largura: number; altura: number };
}

export function calcularQuantitativoCaixaConcreto(elemento: CaixaConcreto): QuantitativoCaixaConcreto {
  return {
    subtipo: elemento.subtipo,
    material: elemento.material,
    dimensoesM: elemento.geometria,
  };
}

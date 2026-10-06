import { v4 as uuidv4 } from 'uuid';
import {
  TRACO_PADRAO,
  etapasHidrossanitarias,
  etapasIniciais,
  type BimElement,
  type CaixaConcreto,
  type CaixaDagua,
  type PilarArranque,
  type Sapata,
  type SubtipoCaixaConcreto,
  type Tubulacao,
  type VigaBaldrame,
} from '../types';

export function novaSapata(tag: string, posicao = { x: 0, y: 0, z: 0 }): Sapata {
  return {
    id: uuidv4(),
    tipo: 'sapata',
    tag,
    posicao,
    traco: { ...TRACO_PADRAO },
    etapas: etapasIniciais(),
    geometria: { comprimento: 1.2, largura: 1.2, altura: 0.4 },
    armadura: {
      diametroX: 10,
      espacamentoX: 15,
      diametroY: 10,
      espacamentoY: 15,
      cobrimento: 5,
      gancho: 10,
    },
  };
}

export function novoPilarArranque(tag: string, posicao = { x: 0, y: 0, z: 0 }): PilarArranque {
  return {
    id: uuidv4(),
    tipo: 'pilar_arranque',
    tag,
    posicao,
    traco: { ...TRACO_PADRAO },
    etapas: etapasIniciais(),
    geometria: { largura: 0.2, comprimento: 0.2, altura: 0.6 },
    armadura: {
      longitudinais: { diametro: 10, quantidade: 4 },
      estribo: { diametro: 5, espacamento: 15 },
      cobrimento: 3,
      comprimentoAncoragem: 40,
    },
  };
}

export function novaVigaBaldrame(tag: string, posicao = { x: 0, y: 0, z: 0 }): VigaBaldrame {
  return {
    id: uuidv4(),
    tipo: 'viga_baldrame',
    tag,
    posicao,
    traco: { ...TRACO_PADRAO },
    etapas: etapasIniciais(),
    geometria: { comprimento: 3, largura: 0.2, altura: 0.3 },
    armadura: {
      superior: { diametro: 10, quantidade: 2 },
      inferior: { diametro: 10, quantidade: 2 },
      estribo: { diametro: 5, espacamento: 15 },
      cobrimento: 3,
      gancho: 8,
    },
  };
}

export function novaTubulacao(tag: string, posicao = { x: 0, y: 0, z: 0 }): Tubulacao {
  return {
    id: uuidv4(),
    tipo: 'tubulacao',
    tag,
    posicao,
    etapas: etapasHidrossanitarias(),
    rede: 'esgoto',
    diametroMm: 25,
    material: 'PVC soldável',
    qtdConexoes: 0,
    geometria: { comprimento: 3, largura: 0.025, altura: 0.025 },
  };
}

export function novaCaixaDagua(tag: string, posicao = { x: 0, y: 0, z: 0 }): CaixaDagua {
  return {
    id: uuidv4(),
    tipo: 'caixa_dagua',
    tag,
    posicao,
    etapas: etapasHidrossanitarias(),
    capacidadeLitros: 1000,
    material: 'Polietileno',
    geometria: { comprimento: 1.2, largura: 1.2, altura: 1.1 },
  };
}

const MATERIAL_PADRAO_CAIXA_CONCRETO: Record<SubtipoCaixaConcreto, string> = {
  gordura: 'Concreto pré-moldado',
  passagem: 'Concreto pré-moldado',
  fossa: 'Concreto moldado in loco',
};

const GEOMETRIA_PADRAO_CAIXA_CONCRETO: Record<SubtipoCaixaConcreto, { comprimento: number; largura: number; altura: number }> = {
  gordura: { comprimento: 0.4, largura: 0.4, altura: 0.5 },
  passagem: { comprimento: 0.6, largura: 0.6, altura: 0.6 },
  fossa: { comprimento: 1.5, largura: 1.0, altura: 1.5 },
};

export function novaCaixaConcreto(
  tag: string,
  posicao = { x: 0, y: 0, z: 0 },
  subtipo: SubtipoCaixaConcreto = 'passagem',
): CaixaConcreto {
  return {
    id: uuidv4(),
    tipo: 'caixa_concreto',
    tag,
    posicao,
    etapas: etapasHidrossanitarias(),
    subtipo,
    material: MATERIAL_PADRAO_CAIXA_CONCRETO[subtipo],
    geometria: { ...GEOMETRIA_PADRAO_CAIXA_CONCRETO[subtipo] },
  };
}

export function criarElementoPadrao(tipo: BimElement['tipo'], tag: string, posicao?: { x: number; y: number; z: number }): BimElement {
  switch (tipo) {
    case 'sapata':
      return novaSapata(tag, posicao);
    case 'pilar_arranque':
      return novoPilarArranque(tag, posicao);
    case 'viga_baldrame':
      return novaVigaBaldrame(tag, posicao);
    case 'tubulacao':
      return novaTubulacao(tag, posicao);
    case 'caixa_dagua':
      return novaCaixaDagua(tag, posicao);
    case 'caixa_concreto':
      return novaCaixaConcreto(tag, posicao);
  }
}

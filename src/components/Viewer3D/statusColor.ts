import type { BimElement, CaixaConcreto, IdEtapa, Tubulacao } from '../../types';

export function etapaExecutada(elemento: BimElement, etapa: IdEtapa): boolean {
  return elemento.etapas.find((e) => e.etapa === etapa)?.executado ?? false;
}

/** Cor do concreto conforme status de execução: cinza = previsto, verde = concretado. */
export function corConcreto(elemento: BimElement): string {
  return etapaExecutada(elemento, 'concretagem') ? '#4caf7d' : '#b9c0c6';
}

export function corForma(elemento: BimElement): string {
  return etapaExecutada(elemento, 'forma') ? '#c98a3e' : '#e6c9a0';
}

export function corArmadura(elemento: BimElement): string {
  return etapaExecutada(elemento, 'armadura') ? '#d94b4b' : '#8f97a0';
}

/**
 * Cor do tubo conforme a REDE a que pertence — não são todas iguais: esgoto, água fria e
 * pluvial são sistemas separados na obra, com cor própria por convenção (esgoto em
 * branco/cinza, água fria em marrom, pluvial em azul). O status de execução (instalado ou só
 * previsto) é mostrado pela intensidade da cor, não pela cor em si.
 */
export function corTubulacao(elemento: Tubulacao): string {
  const instalado = etapaExecutada(elemento, 'instalacao');
  switch (elemento.rede) {
    case 'esgoto':
      return instalado ? '#f2f2f0' : '#cfd2d4';
    case 'agua_fria':
      return instalado ? '#8b4513' : '#c9a079';
    case 'pluvial':
      return instalado ? '#2f6fb3' : '#a8c5e8';
  }
}

/** Caixa d'água: sempre azul (reservatório de água), mais clara quando só prevista. */
export function corCaixaDagua(elemento: BimElement): string {
  return etapaExecutada(elemento, 'instalacao') ? '#1e5f99' : '#8fb3d9';
}

/** Caixa de gordura/passagem/fossa: em concreto — tons de cinza-bege, como o concreto da
 * fundação, nunca azul (pra não confundir com a caixa d'água). */
export function corCaixaConcreto(elemento: CaixaConcreto): string {
  return etapaExecutada(elemento, 'instalacao') ? '#8f8a7e' : '#c7c2ba';
}

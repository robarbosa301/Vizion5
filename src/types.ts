/**
 * Modelo de dados do MVP: Fundações (sapata isolada, pilar de arranque, viga baldrame) e,
 * a partir daqui, Hidrossanitário (tubulação, caixa d'água). Cada elemento carrega geometria
 * e etapas de execução (previsto x executado) para o controle 5D em campo; os elementos de
 * concreto (fundação) também carregam traço e armadura — os hidrossanitários não.
 */

export type TipoElementoEstrutural = 'sapata' | 'pilar_arranque' | 'viga_baldrame';
export type TipoElementoHidrossanitario = 'tubulacao' | 'caixa_dagua' | 'caixa_concreto';
export type TipoElemento = TipoElementoEstrutural | TipoElementoHidrossanitario;

export function categoriaDoTipo(tipo: TipoElemento): 'estrutural' | 'hidrossanitario' {
  return tipo === 'tubulacao' || tipo === 'caixa_dagua' || tipo === 'caixa_concreto' ? 'hidrossanitario' : 'estrutural';
}

/**
 * Rede a que um trecho de tubulação pertence — não são todas "iguais": esgoto, água fria
 * (alimentação) e pluvial (água da chuva) são sistemas fisicamente separados na obra, com cor
 * de tubo própria (convenção de obra: esgoto em branco/cinza, água fria em marrom, pluvial em
 * azul), então o elemento precisa saber a qual rede pertence — não só o diâmetro/material.
 */
export type RedeHidrossanitaria = 'esgoto' | 'agua_fria' | 'pluvial';

/** Subtipo de uma caixa de concreto — todas moldadas/pré-moldadas em concreto, ao contrário da
 * caixa d'água (plástico/fibra). */
export type SubtipoCaixaConcreto = 'gordura' | 'passagem' | 'fossa';

export type IdEtapa = 'forma' | 'armadura' | 'concretagem' | 'instalacao' | 'teste';

export interface EtapaExecucao {
  etapa: IdEtapa;
  dataPrevista?: string; // ISO date
  executado: boolean;
  dataExecucao?: string; // ISO date
  observacao?: string;
  /** Preenchido apenas na etapa de concretagem: volume de concreto realmente lançado (m³). */
  volumeRealM3?: number;
}

export function etapasIniciais(): EtapaExecucao[] {
  return [
    { etapa: 'forma', executado: false },
    { etapa: 'armadura', executado: false },
    { etapa: 'concretagem', executado: false },
  ];
}

/** Etapas de um trecho de tubulação ou caixa d'água: instalar e depois testar (estanqueidade/pressão). */
export function etapasHidrossanitarias(): EtapaExecucao[] {
  return [
    { etapa: 'instalacao', executado: false },
    { etapa: 'teste', executado: false },
  ];
}

/**
 * Traço de concreto em massa, unitário em relação ao cimento (1 : a : b),
 * com relação água/cimento (a/c). É o formato usado em dosagem racional
 * (NBR 12655) e permite calcular consumo de materiais por m³ com o método
 * dos volumes absolutos. Quem só conhece o traço "em volume" (ex.: 1:2:3
 * com padiola) pode preencher consumoCimentoKgM3Override com o valor de
 * uma tabela de referência da obra — nesse caso ele prevalece sobre o
 * cálculo teórico.
 */
export interface TracoConcreto {
  cimento: number; // sempre 1
  areia: number; // partes de areia por 1 de cimento (massa)
  brita: number; // partes de brita por 1 de cimento (massa)
  fatorAguaCimento: number; // a/c, ex. 0.55
  /** kg de cimento por m³ de concreto, se o usuário quiser sobrepor o cálculo teórico. */
  consumoCimentoKgM3Override?: number;
}

export const TRACO_PADRAO: TracoConcreto = {
  cimento: 1,
  areia: 2,
  brita: 3,
  fatorAguaCimento: 0.55,
};

export interface ArmaduraSapata {
  diametroX: number; // mm
  espacamentoX: number; // cm, entre eixos
  diametroY: number; // mm
  espacamentoY: number; // cm, entre eixos
  cobrimento: number; // cm
  gancho: number; // cm, comprimento do gancho em cada ponta da barra
}

export interface GrupoBarras {
  diametro: number; // mm
  quantidade: number;
}

export interface ArmaduraPilar {
  longitudinais: GrupoBarras;
  estribo: { diametro: number; espacamento: number }; // mm, cm
  cobrimento: number; // cm
  comprimentoAncoragem: number; // cm, embutido na sapata + gancho no topo
}

export interface ArmaduraViga {
  superior: GrupoBarras;
  inferior: GrupoBarras;
  estribo: { diametro: number; espacamento: number }; // mm, cm
  cobrimento: number; // cm
  gancho: number; // cm, comprimento do gancho longitudinal nas pontas
}

/** Um grupo de barras já resolvido (quantidade, diâmetro, comprimento, peso) — usado tanto
 * pelo cálculo paramétrico (src/lib/steel.ts) quanto pela armadura importada de um IFC. */
export interface GrupoArmaduraResultado {
  descricao: string;
  quantidade: number;
  diametroMm: number;
  comprimentoUnitarioM: number;
  comprimentoTotalM: number;
  pesoKg: number;
  volumeM3: number;
}

interface ElementoBase {
  id: string;
  tag: string; // identificação de campo, ex. "S1", "P3", "VB2"
  observacoes?: string;
  etapas: EtapaExecucao[];
  /** Posição no canteiro, para posicionar no viewer 3D (m). */
  posicao: { x: number; y: number; z: number };
  /**
   * Rotação em torno do eixo vertical (Y, radianos), quando o elemento veio de um IFC e sua
   * orientação real não é a mesma do eixo X do app (comum: pilares/vigas de um projeto real não
   * são todos paralelos ao mesmo eixo). Gira o elemento inteiro (fôrma/concreto/armadura) em
   * torno da própria posição ao renderizar — sem isso, todo elemento é desenhado como se seu
   * "comprimento" corresse sempre no eixo X do app, ignorando a orientação real do projeto.
   */
  rotacaoY?: number;
  /** Classe de resistência do concreto (ex. "C-25"), quando vinda de um projeto importado. Só informativo. */
  classeConcreto?: string;
  /** Cobrimento nominal (cm), quando vindo de um projeto importado — sobrepõe o cobrimento da armadura paramétrica na exibição. */
  cobrimentoProjeto?: number;
  /**
   * Quando o elemento veio de um IFC, os grupos de armadura reais (quantidade, diâmetro e
   * comprimento vindos do projeto) — usados no lugar do cálculo paramétrico em `armadura`
   * para os quantitativos. O campo `armadura` continua existindo (com uma estimativa
   * compatível) só para alimentar a visualização 3D e permanecer editável.
   */
  armaduraImportada?: GrupoArmaduraResultado[];
}

export interface Sapata extends ElementoBase {
  tipo: 'sapata';
  traco: TracoConcreto;
  /** Bloco da base (o retângulo maior, junto ao lastro). */
  geometria: {
    comprimento: number; // m (eixo X)
    largura: number; // m (eixo Y)
    altura: number; // m (eixo Z)
  };
  /**
   * Tronco de pirâmide opcional sobre a base — dimensões do TOPO (onde nasce o pilar) e a
   * altura do tronco. A base do tronco é o topo do bloco `geometria`. Quando ausente, a
   * sapata é um bloco simples (sem dado/pedestal).
   */
  tronco?: {
    comprimento: number; // m, dimensão do topo (eixo X)
    largura: number; // m, dimensão do topo (eixo Y)
    altura: number; // m
  };
  armadura: ArmaduraSapata;
}

export interface PilarArranque extends ElementoBase {
  tipo: 'pilar_arranque';
  traco: TracoConcreto;
  geometria: {
    largura: number; // m (eixo X)
    comprimento: number; // m (eixo Y) — para pilar retangular; quadrado se igual à largura
    altura: number; // m, do topo da sapata até a face superior da viga baldrame (arranque real e visível)
  };
  armadura: ArmaduraPilar;
}

export interface VigaBaldrame extends ElementoBase {
  tipo: 'viga_baldrame';
  traco: TracoConcreto;
  geometria: {
    comprimento: number; // m, vão
    largura: number; // m
    altura: number; // m
  };
  armadura: ArmaduraViga;
}

/**
 * Trecho de tubulação (um IfcPipeSegment, ou um trecho criado manualmente): elemento linear,
 * como uma viga, mas sem concreto/fôrma/armadura — só diâmetro, material e comprimento. A
 * geometria usa o mesmo formato {comprimento, largura, altura} dos elementos estruturais
 * (aqui largura = altura = diâmetro) só pra reaproveitar o viewer 3D, a seleção e o foco de
 * câmera, que já lidam com esse formato — na prática é um cilindro de `comprimento` x `diâmetro`.
 */
export interface Tubulacao extends ElementoBase {
  tipo: 'tubulacao';
  /** Rede física a que o trecho pertence (esgoto / água fria / pluvial) — define a cor do tubo. */
  rede: RedeHidrossanitaria;
  diametroMm: number;
  material: string; // ex. "PVC soldável", "PPR", "Ferro galvanizado"
  /** Conexões (joelhos, tês, luvas etc.) associadas a esse trecho — só quantitativo, sem
   * posição 3D própria (não viraram elementos próprios nesta primeira versão). */
  qtdConexoes: number;
  geometria: {
    comprimento: number; // m
    largura: number; // m — igual à altura (diâmetro, em metros)
    altura: number; // m — igual à largura (diâmetro, em metros)
  };
}

/** Caixa d'água / reservatório — um volume simples, com capacidade em litros. Sempre azul. */
export interface CaixaDagua extends ElementoBase {
  tipo: 'caixa_dagua';
  capacidadeLitros: number;
  material: string; // ex. "Polietileno", "Fibra"
  geometria: {
    comprimento: number; // m
    largura: number; // m
    altura: number; // m
  };
}

/** Caixa de gordura, de passagem/inspeção ou fossa — moldadas em concreto, ao contrário da
 * caixa d'água. Mesma geometria simples (volume), já que o que muda entre elas é a função, não
 * a forma de modelar. */
export interface CaixaConcreto extends ElementoBase {
  tipo: 'caixa_concreto';
  subtipo: SubtipoCaixaConcreto;
  material: string; // ex. "Concreto moldado in loco", "Concreto pré-moldado"
  geometria: {
    comprimento: number; // m
    largura: number; // m
    altura: number; // m
  };
}

export type BimElement = Sapata | PilarArranque | VigaBaldrame | Tubulacao | CaixaDagua | CaixaConcreto;

export type CamadaVisivel = 'forma' | 'concreto' | 'armadura';

import { create } from 'zustand';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { BimElement, IdEtapa, PilarArranque, Sapata } from '../types';
import { criarElementoPadrao } from '../lib/factories';

export interface ObraSalva {
  id: string;
  nome: string;
  criadaEm: string;
  atualizadaEm: string;
  elementos: BimElement[];
}

interface ProjectState {
  uidAtual: string | null;
  obras: ObraSalva[];
  obraAtivaId: string | null;
  carregandoObras: boolean;

  nomeObra: string;
  elementos: BimElement[];
  elementoSelecionadoId: string | null;

  iniciarSincronizacao: (uid: string) => void;
  pararSincronizacao: () => void;

  criarObra: (nome: string) => void;
  abrirObra: (id: string) => void;
  excluirObra: (id: string) => void;
  voltarParaInicio: () => void;

  setNomeObra: (nome: string) => void;
  adicionarElemento: (tipo: BimElement['tipo'], tag: string) => void;
  importarElementos: (elementos: BimElement[]) => void;
  atualizarElemento: (id: string, patch: Partial<BimElement>) => void;
  removerElemento: (id: string) => void;
  selecionarElemento: (id: string | null) => void;
  marcarEtapa: (
    elementoId: string,
    etapa: IdEtapa,
    executado: boolean,
    extra?: { dataExecucao?: string; observacao?: string; volumeRealM3?: number },
  ) => void;
}

let unsubscribeObras: Unsubscribe | null = null;

/**
 * Carimbo da última escrita local (por obra) — usado só pra o listener de sincronização (abaixo)
 * saber ignorar um snapshot "atrasado": como cada edição grava no Firestore sem esperar confirmação
 * (otimista) e o MESMO listener que escuta mudanças de outros aparelhos também reage à nossa
 * própria escrita, duas edições em sequência rápida podem fazer o eco de uma escrita MAIS ANTIGA
 * chegar DEPOIS do estado local já mais novo — sem essa guarda, isso sobrescreve a edição mais
 * recente com a mais velha (reverte o campo que acabou de ser alterado por um instante, ou, em
 * campo com conexão ruim, de vez). Only aceita um snapshot da obra ativa se ele for tão novo
 * quanto (ou mais novo que) a última escrita local que a gente mesmo mandou.
 */
let ultimaEscritaLocal: { obraId: string; atualizadaEm: string } | null = null;

function obraDocRef(uid: string, obraId: string) {
  return doc(db, 'users', uid, 'obras', obraId);
}

/** Grava a obra ativa no Firestore (fire-and-forget: a UI já foi atualizada otimisticamente). */
function persistirObraAtiva(uid: string | null, obraId: string | null, nome: string, elementos: BimElement[]) {
  if (!uid || !obraId) return;
  const atualizadaEm = new Date().toISOString();
  ultimaEscritaLocal = { obraId, atualizadaEm };
  setDoc(obraDocRef(uid, obraId), { nome, elementos, atualizadaEm }, { merge: true }).catch((e) =>
    console.error('Falha ao salvar obra no Firestore:', e),
  );
}

/** Já existe algum elemento do tipo `tipo` pousado nessa posição X/Z (mesmo pé, dentro de uma
 * tolerância pequena)? Usado pra não empilhar vários pilares na mesma sapata — ver comentário de
 * `posicaoPadraoParaNovoElemento` abaixo. */
function temElementoEm(tipo: BimElement['tipo'], x: number, z: number, elementos: BimElement[]): boolean {
  const TOLERANCIA_M = 0.1;
  return elementos.some((e) => e.tipo === tipo && Math.hypot(e.posicao.x - x, e.posicao.z - z) < TOLERANCIA_M);
}

/**
 * Posição inicial de um elemento recém-adicionado pelo botão "+": pilar de arranque nasce em
 * cima de uma sapata que ainda não tem pilar (mesmo X/Z, Y no topo dela — já somando o tronco,
 * quando existe) e viga baldrame nasce em cima de um pilar que ainda não tem viga. Sem isso, todo
 * elemento novo nascia em Y=0 e X crescente, sem nenhuma relação com os outros já lançados — um
 * pilar adicionado logo depois de uma sapata não ficava apoiado nela, e a armadura de ancoragem
 * (que desce da base do pilar) ficava pendurada no vazio, sem nenhuma sapata ali embaixo pra
 * receber.
 *
 * Importante usar a sapata/pilar "ainda sem par", não simplesmente o último lançado: alguém que
 * clica "+ Sapata" três vezes seguidas e só depois "+ Pilar" três vezes (um jeito natural de
 * testar o app) faria os três pilares nascerem empilhados todos na MESMA (última) sapata, com as
 * outras duas sapatas sobrando vazias — exatamente o tipo de "ferro flutuando" que motivou essa
 * função existir, só que causado por ela mesma. Escolhendo sempre a sapata/pilar mais recente que
 * ainda não tem um elemento do tipo de cima, cada clique casa com uma base nova (na ordem em que
 * foram lançadas), e só cai no fallback (posição antiga) quando toda base disponível já tem par.
 */
function posicaoPadraoParaNovoElemento(
  tipo: BimElement['tipo'],
  elementosAtuais: BimElement[],
): { posicao: { x: number; y: number; z: number }; comprimentoAncoragemCm?: number } | null {
  if (tipo === 'pilar_arranque') {
    const sapataLivre = [...elementosAtuais]
      .reverse()
      .find((e): e is Sapata => e.tipo === 'sapata' && !temElementoEm('pilar_arranque', e.posicao.x, e.posicao.z, elementosAtuais));
    if (!sapataLivre) return null;
    const topo = sapataLivre.posicao.y + sapataLivre.geometria.altura + (sapataLivre.tronco?.altura ?? 0);
    // A ancoragem precisa atravessar toda a espessura da sapata (base + tronco) e enganchar perto
    // do fundo dela — não parar na superfície de cima — mesmo ajuste feito na importação de IFC
    // (ver comentário em importIfc.ts). Sem isso, um pilar novo nascia com os 40cm padrão da
    // fábrica, que raramente bastam pra atravessar uma sapata de verdade.
    const cobrimentoSapataM = sapataLivre.armadura.cobrimento / 100;
    const profundidadeTotalM = topo - sapataLivre.posicao.y;
    const comprimentoAncoragemCm = Math.max(1, (profundidadeTotalM - cobrimentoSapataM) * 100);
    return { posicao: { x: sapataLivre.posicao.x, y: topo, z: sapataLivre.posicao.z }, comprimentoAncoragemCm };
  }
  if (tipo === 'viga_baldrame') {
    const pilarLivre = [...elementosAtuais]
      .reverse()
      .find((e): e is PilarArranque => e.tipo === 'pilar_arranque' && !temElementoEm('viga_baldrame', e.posicao.x, e.posicao.z, elementosAtuais));
    if (!pilarLivre) return null;
    const topo = pilarLivre.posicao.y + pilarLivre.geometria.altura;
    return { posicao: { x: pilarLivre.posicao.x, y: topo, z: pilarLivre.posicao.z } };
  }
  return null;
}

/**
 * Antes de ter login, as obras ficavam só no localStorage do aparelho. No primeiro login de
 * cada conta, sobe essas obras locais pro Firestore (uma vez só, marcado por uma flag) pra não
 * perder nada que já estava salvo.
 */
function migrarDadosLocaisSeNecessario(uid: string) {
  const flag = `vizion5-migrado-${uid}`;
  if (localStorage.getItem(flag)) return;
  try {
    const raw = localStorage.getItem('vizion5-project');
    if (raw) {
      const obrasLocais: ObraSalva[] = JSON.parse(raw)?.state?.obras ?? [];
      for (const obra of obrasLocais) {
        setDoc(obraDocRef(uid, obra.id), obra, { merge: true }).catch((e) =>
          console.error('Falha ao migrar obra local:', e),
        );
      }
    }
  } catch (e) {
    console.error('Falha ao ler dados locais pra migração:', e);
  }
  localStorage.setItem(flag, '1');
}

/**
 * Residencial Eddy — projeto de referência/teste: toda conta nova começa com ele (sapata,
 * pilar de arranque e viga baldrame já criados), pra ter algo pronto pra explorar, testar a
 * vista explodida e os quantitativos sem precisar criar elemento por elemento do zero. É uma
 * obra comum, como qualquer outra — dá pra editar, apagar ou ignorar.
 */
function criarObraDemo(): ObraSalva {
  const agora = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    nome: 'Residencial Eddy',
    criadaEm: agora,
    atualizadaEm: agora,
    elementos: [
      criarElementoPadrao('sapata', 'S1', { x: 0, y: 0, z: 0 }),
      criarElementoPadrao('pilar_arranque', 'P1', { x: 1.5, y: 0, z: 0 }),
      criarElementoPadrao('viga_baldrame', 'VB1', { x: 3, y: 0, z: 0 }),
    ],
  };
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  uidAtual: null,
  obras: [],
  obraAtivaId: null,
  carregandoObras: true,

  nomeObra: '',
  elementos: [],
  elementoSelecionadoId: null,

  iniciarSincronizacao: (uid) => {
    unsubscribeObras?.();
    set({ uidAtual: uid, carregandoObras: true });
    migrarDadosLocaisSeNecessario(uid);

    let primeiraEmissao = true;
    const q = query(collection(db, 'users', uid, 'obras'), orderBy('atualizadaEm', 'desc'));
    unsubscribeObras = onSnapshot(
      q,
      (snap) => {
        const obras: ObraSalva[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ObraSalva, 'id'>) }));

        if (primeiraEmissao) {
          primeiraEmissao = false;
          const flagSeed = `vizion5-seed-${uid}`;
          if (obras.length === 0 && !localStorage.getItem(flagSeed)) {
            localStorage.setItem(flagSeed, '1');
            const demo = criarObraDemo();
            setDoc(obraDocRef(uid, demo.id), demo).catch((e) => console.error('Falha ao criar obra de exemplo:', e));
            return; // a própria escrita dispara a próxima emissão do snapshot, com a obra já dentro
          }
        }

        set((state) => {
          const ativa = obras.find((o) => o.id === state.obraAtivaId);

          // Snapshot mais antigo que a última escrita local da obra ativa: eco atrasado de uma
          // edição anterior chegando depois de uma mais recente já aplicada localmente. Mantém
          // nome/elementos locais (mais atuais) e só atualiza a lista de obras.
          const ecoAtrasado =
            ativa &&
            ultimaEscritaLocal &&
            ultimaEscritaLocal.obraId === ativa.id &&
            ativa.atualizadaEm < ultimaEscritaLocal.atualizadaEm;

          return {
            obras,
            carregandoObras: false,
            nomeObra: ativa && !ecoAtrasado ? ativa.nome : state.nomeObra,
            elementos: ativa && !ecoAtrasado ? ativa.elementos : state.elementos,
          };
        });
      },
      (e) => {
        console.error('Falha ao sincronizar obras:', e);
        set({ carregandoObras: false });
      },
    );
  },

  pararSincronizacao: () => {
    unsubscribeObras?.();
    unsubscribeObras = null;
    set({
      uidAtual: null,
      obras: [],
      obraAtivaId: null,
      carregandoObras: true,
      nomeObra: '',
      elementos: [],
      elementoSelecionadoId: null,
    });
  },

  criarObra: (nome) => {
    const { uidAtual } = get();
    if (!uidAtual) return;
    const id = crypto.randomUUID();
    const agora = new Date().toISOString();
    const nova: ObraSalva = { id, nome, criadaEm: agora, atualizadaEm: agora, elementos: [] };
    ultimaEscritaLocal = { obraId: id, atualizadaEm: agora };
    setDoc(obraDocRef(uidAtual, id), nova).catch((e) => console.error('Falha ao criar obra:', e));
    set({ obraAtivaId: id, nomeObra: nome, elementos: [], elementoSelecionadoId: null });
  },

  abrirObra: (id) =>
    set((state) => {
      const obra = state.obras.find((o) => o.id === id);
      if (!obra) return state;
      return { obraAtivaId: id, nomeObra: obra.nome, elementos: obra.elementos, elementoSelecionadoId: null };
    }),

  excluirObra: (id) => {
    const { uidAtual, obraAtivaId } = get();
    if (!uidAtual) return;
    deleteDoc(obraDocRef(uidAtual, id)).catch((e) => console.error('Falha ao excluir obra:', e));
    if (obraAtivaId === id) {
      set({ obraAtivaId: null, nomeObra: '', elementos: [], elementoSelecionadoId: null });
    }
  },

  voltarParaInicio: () => set({ obraAtivaId: null }),

  setNomeObra: (nome) => {
    set({ nomeObra: nome });
    const { uidAtual, obraAtivaId, elementos } = get();
    persistirObraAtiva(uidAtual, obraAtivaId, nome, elementos);
  },

  adicionarElemento: (tipo, tag) => {
    const state = get();
    const offset = state.elementos.length * 1.5;
    const padrao = posicaoPadraoParaNovoElemento(tipo, state.elementos);
    const novo = criarElementoPadrao(tipo, tag, padrao?.posicao ?? { x: offset, y: 0, z: 0 });
    if (novo.tipo === 'pilar_arranque' && padrao?.comprimentoAncoragemCm !== undefined) {
      novo.armadura.comprimentoAncoragem = padrao.comprimentoAncoragemCm;
    }
    const elementos = [...state.elementos, novo];
    set({ elementos, elementoSelecionadoId: novo.id });
    persistirObraAtiva(state.uidAtual, state.obraAtivaId, state.nomeObra, elementos);
  },

  importarElementos: (elementos) => {
    const state = get();
    set({ elementos, elementoSelecionadoId: elementos[0]?.id ?? null });
    persistirObraAtiva(state.uidAtual, state.obraAtivaId, state.nomeObra, elementos);
  },

  atualizarElemento: (id, patch) => {
    const state = get();
    const elementos = state.elementos.map((el) => (el.id === id ? ({ ...el, ...patch } as BimElement) : el));
    set({ elementos });
    persistirObraAtiva(state.uidAtual, state.obraAtivaId, state.nomeObra, elementos);
  },

  removerElemento: (id) => {
    const state = get();
    const elementos = state.elementos.filter((el) => el.id !== id);
    set({
      elementos,
      elementoSelecionadoId: state.elementoSelecionadoId === id ? null : state.elementoSelecionadoId,
    });
    persistirObraAtiva(state.uidAtual, state.obraAtivaId, state.nomeObra, elementos);
  },

  selecionarElemento: (id) => set({ elementoSelecionadoId: id }),

  marcarEtapa: (elementoId, etapa, executado, extra) => {
    const state = get();
    const elementos = state.elementos.map((el) => {
      if (el.id !== elementoId) return el;
      return {
        ...el,
        etapas: el.etapas.map((e) =>
          e.etapa === etapa
            ? {
                ...e,
                executado,
                dataExecucao: executado ? extra?.dataExecucao ?? new Date().toISOString().slice(0, 10) : undefined,
                observacao: extra?.observacao ?? e.observacao,
                volumeRealM3: extra?.volumeRealM3 ?? e.volumeRealM3,
              }
            : e,
        ),
      };
    });
    set({ elementos });
    persistirObraAtiva(state.uidAtual, state.obraAtivaId, state.nomeObra, elementos);
  },
}));

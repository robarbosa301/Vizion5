import { create } from 'zustand';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { BimElement, IdEtapa } from '../types';
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

function obraDocRef(uid: string, obraId: string) {
  return doc(db, 'users', uid, 'obras', obraId);
}

/** Grava a obra ativa no Firestore (fire-and-forget: a UI já foi atualizada otimisticamente). */
function persistirObraAtiva(uid: string | null, obraId: string | null, nome: string, elementos: BimElement[]) {
  if (!uid || !obraId) return;
  setDoc(obraDocRef(uid, obraId), { nome, elementos, atualizadaEm: new Date().toISOString() }, { merge: true }).catch(
    (e) => console.error('Falha ao salvar obra no Firestore:', e),
  );
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
    const q = query(collection(db, 'users', uid, 'obras'), orderBy('atualizadaEm', 'desc'));
    unsubscribeObras = onSnapshot(
      q,
      (snap) => {
        const obras: ObraSalva[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ObraSalva, 'id'>) }));
        set((state) => {
          const ativa = obras.find((o) => o.id === state.obraAtivaId);
          return {
            obras,
            carregandoObras: false,
            nomeObra: ativa ? ativa.nome : state.nomeObra,
            elementos: ativa ? ativa.elementos : state.elementos,
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
    const novo = criarElementoPadrao(tipo, tag, { x: offset, y: 0, z: 0 });
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

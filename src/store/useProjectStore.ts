import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  obras: ObraSalva[];
  obraAtivaId: string | null;

  nomeObra: string;
  elementos: BimElement[];
  elementoSelecionadoId: string | null;

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

function sincronizarObraAtiva(
  obras: ObraSalva[],
  obraAtivaId: string | null,
  nomeObra: string,
  elementos: BimElement[],
): ObraSalva[] {
  if (!obraAtivaId) return obras;
  return obras.map((o) =>
    o.id === obraAtivaId ? { ...o, nome: nomeObra, elementos, atualizadaEm: new Date().toISOString() } : o,
  );
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      obras: [],
      obraAtivaId: null,

      nomeObra: '',
      elementos: [],
      elementoSelecionadoId: null,

      criarObra: (nome) =>
        set((state) => {
          const id = crypto.randomUUID();
          const agora = new Date().toISOString();
          const nova: ObraSalva = { id, nome, criadaEm: agora, atualizadaEm: agora, elementos: [] };
          return {
            obras: [...state.obras, nova],
            obraAtivaId: id,
            nomeObra: nome,
            elementos: [],
            elementoSelecionadoId: null,
          };
        }),

      abrirObra: (id) =>
        set((state) => {
          const obra = state.obras.find((o) => o.id === id);
          if (!obra) return state;
          return { obraAtivaId: id, nomeObra: obra.nome, elementos: obra.elementos, elementoSelecionadoId: null };
        }),

      excluirObra: (id) =>
        set((state) => {
          const obras = state.obras.filter((o) => o.id !== id);
          if (state.obraAtivaId !== id) return { obras };
          return { obras, obraAtivaId: null, nomeObra: '', elementos: [], elementoSelecionadoId: null };
        }),

      voltarParaInicio: () => set({ obraAtivaId: null }),

      setNomeObra: (nome) =>
        set((state) => ({
          nomeObra: nome,
          obras: sincronizarObraAtiva(state.obras, state.obraAtivaId, nome, state.elementos),
        })),

      adicionarElemento: (tipo, tag) =>
        set((state) => {
          const offset = state.elementos.length * 1.5;
          const novo = criarElementoPadrao(tipo, tag, { x: offset, y: 0, z: 0 });
          const elementos = [...state.elementos, novo];
          return {
            elementos,
            elementoSelecionadoId: novo.id,
            obras: sincronizarObraAtiva(state.obras, state.obraAtivaId, state.nomeObra, elementos),
          };
        }),

      importarElementos: (elementos) =>
        set((state) => ({
          elementos,
          elementoSelecionadoId: elementos[0]?.id ?? null,
          obras: sincronizarObraAtiva(state.obras, state.obraAtivaId, state.nomeObra, elementos),
        })),

      atualizarElemento: (id, patch) =>
        set((state) => {
          const elementos = state.elementos.map((el) => (el.id === id ? ({ ...el, ...patch } as BimElement) : el));
          return { elementos, obras: sincronizarObraAtiva(state.obras, state.obraAtivaId, state.nomeObra, elementos) };
        }),

      removerElemento: (id) =>
        set((state) => {
          const elementos = state.elementos.filter((el) => el.id !== id);
          return {
            elementos,
            elementoSelecionadoId: state.elementoSelecionadoId === id ? null : state.elementoSelecionadoId,
            obras: sincronizarObraAtiva(state.obras, state.obraAtivaId, state.nomeObra, elementos),
          };
        }),

      selecionarElemento: (id) => set({ elementoSelecionadoId: id }),

      marcarEtapa: (elementoId, etapa, executado, extra) =>
        set((state) => {
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
          return { elementos, obras: sincronizarObraAtiva(state.obras, state.obraAtivaId, state.nomeObra, elementos) };
        }),
    }),
    {
      name: 'vizion5-project',
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          const antigo = persistedState as { nomeObra?: string; elementos?: BimElement[] } | undefined;
          if (antigo?.elementos && antigo.elementos.length > 0) {
            const agora = new Date().toISOString();
            const obra: ObraSalva = {
              id: crypto.randomUUID(),
              nome: antigo.nomeObra || 'Obra sem nome',
              criadaEm: agora,
              atualizadaEm: agora,
              elementos: antigo.elementos,
            };
            return { obras: [obra], obraAtivaId: null, nomeObra: '', elementos: [], elementoSelecionadoId: null };
          }
          return { obras: [], obraAtivaId: null, nomeObra: '', elementos: [], elementoSelecionadoId: null };
        }
        return persistedState;
      },
    },
  ),
);

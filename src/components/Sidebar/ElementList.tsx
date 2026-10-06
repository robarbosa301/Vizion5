import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { categoriaDoTipo, type BimElement, type RedeHidrossanitaria } from '../../types';
import { calcularQuantitativo } from '../../lib/quantities';
import { NOME_REDE, calcularQuantitativoTubulacao } from '../../lib/hydro';
import { ImportIfc } from './ImportIfc';

type Disciplina = 'estrutura' | 'hidrossanitario' | 'eletrica' | 'arquitetura';

const DISCIPLINAS: { id: Disciplina; rotulo: string; implementada: boolean }[] = [
  { id: 'estrutura', rotulo: 'Estrutura', implementada: true },
  { id: 'hidrossanitario', rotulo: 'Hidrossanitário', implementada: true },
  { id: 'eletrica', rotulo: 'Elétrica', implementada: false },
  { id: 'arquitetura', rotulo: 'Arquitetura', implementada: false },
];

function disciplinaDoElemento(el: BimElement): Disciplina {
  return categoriaDoTipo(el.tipo) === 'hidrossanitario' ? 'hidrossanitario' : 'estrutura';
}

/** Chave do grupo retraível de um elemento: elementos estruturais agrupam por tipo; tubulação
 * agrupa por REDE (esgoto/água fria/pluvial são sistemas separados na obra, não a mesma coisa
 * agrupada só por ser "tubo") — senão um projeto com as três redes mistura tudo num grupo só. */
function chaveGrupo(el: BimElement): string {
  return el.tipo === 'tubulacao' ? `tubulacao-${el.rede}` : el.tipo;
}

const ORDEM_REDE: RedeHidrossanitaria[] = ['esgoto', 'pluvial', 'agua_fria'];

function pesoDoElemento(el: BimElement): number {
  if (el.tipo === 'sapata' || el.tipo === 'pilar_arranque' || el.tipo === 'viga_baldrame') {
    return calcularQuantitativo(el).pesoTotalKg;
  }
  if (el.tipo === 'tubulacao') {
    return calcularQuantitativoTubulacao(el).pesoEstimadoKg;
  }
  return 0; // caixa d'água/caixa de concreto: sem peso rastreado
}

function statusResumo(el: BimElement): string {
  const feitos = el.etapas.filter((e) => e.executado).length;
  return `${feitos}/${el.etapas.length}`;
}

function n(v: number) {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function ordenarTags(elementos: BimElement[]): BimElement[] {
  return [...elementos].sort((a, b) => a.tag.localeCompare(b.tag, 'pt-BR', { numeric: true }));
}

export function ElementList() {
  const elementos = useProjectStore((s) => s.elementos);
  const selecionadoId = useProjectStore((s) => s.elementoSelecionadoId);
  const selecionar = useProjectStore((s) => s.selecionarElemento);
  const adicionar = useProjectStore((s) => s.adicionarElemento);
  const [novaTag, setNovaTag] = useState('');
  const [disciplina, setDisciplina] = useState<Disciplina>('estrutura');
  // Lista grande (dezenas de elementos importados) fica mais fácil de navegar agrupada, com cada
  // grupo retraível — por padrão retraído, só expande o que interessa no momento.
  const [expandido, setExpandido] = useState<Set<string>>(new Set());

  function handleAdicionar(tipo: BimElement['tipo']) {
    const prefixos: Record<BimElement['tipo'], string> = {
      sapata: 'S',
      pilar_arranque: 'P',
      viga_baldrame: 'VB',
      tubulacao: 'T',
      caixa_dagua: 'CX',
      caixa_concreto: 'CC',
    };
    const tag = novaTag.trim() || `${prefixos[tipo]}${elementos.length + 1}`;
    adicionar(tipo, tag);
    setNovaTag('');
  }

  // Selecionar um elemento pelo 3D (não pela lista) troca pra aba da disciplina dele e expande o
  // grupo, senão o item selecionado fica escondido atrás de outra aba ou de um grupo retraído.
  useEffect(() => {
    const el = elementos.find((e) => e.id === selecionadoId);
    if (!el) return;
    setDisciplina(disciplinaDoElemento(el));
    const chave = chaveGrupo(el);
    setExpandido((prev) => (prev.has(chave) ? prev : new Set(prev).add(chave)));
  }, [selecionadoId, elementos]);

  function alternarGrupo(chave: string) {
    setExpandido((prev) => {
      const next = new Set(prev);
      if (next.has(chave)) next.delete(chave);
      else next.add(chave);
      return next;
    });
  }

  const pesos = useMemo(() => {
    const m = new Map<string, number>();
    for (const el of elementos) m.set(el.id, pesoDoElemento(el));
    return m;
  }, [elementos]);

  function construirGrupo(chave: string, titulo: string, doGrupo: BimElement[]) {
    const ordenados = ordenarTags(doGrupo);
    const pesoTotal = ordenados.reduce((acc, el) => acc + (pesos.get(el.id) ?? 0), 0);
    return { chave, titulo, elementos: ordenados, pesoTotal };
  }

  const gruposEstrutura = useMemo(() => {
    const defs: [BimElement['tipo'], string][] = [
      ['sapata', 'Sapatas'],
      ['pilar_arranque', 'Pilares'],
      ['viga_baldrame', 'Vigas baldrame'],
    ];
    return defs
      .map(([tipo, titulo]) => construirGrupo(tipo, titulo, elementos.filter((e) => e.tipo === tipo)))
      .filter((g) => g.elementos.length > 0);
  }, [elementos, pesos]);

  const gruposHidro = useMemo(() => {
    const tubos = elementos.filter((e) => e.tipo === 'tubulacao');
    const porRede = ORDEM_REDE.map((rede) =>
      construirGrupo(`tubulacao-${rede}`, NOME_REDE[rede], tubos.filter((t) => t.tipo === 'tubulacao' && t.rede === rede)),
    );
    const outros = [
      construirGrupo('caixa_dagua', "Caixa d'água", elementos.filter((e) => e.tipo === 'caixa_dagua')),
      construirGrupo('caixa_concreto', 'Caixa de concreto', elementos.filter((e) => e.tipo === 'caixa_concreto')),
    ];
    return [...porRede, ...outros].filter((g) => g.elementos.length > 0);
  }, [elementos, pesos]);

  const grupos = disciplina === 'estrutura' ? gruposEstrutura : disciplina === 'hidrossanitario' ? gruposHidro : [];

  const disciplinaAtual = DISCIPLINAS.find((d) => d.id === disciplina)!;

  return (
    <div className="element-list">
      <ImportIfc />

      <div className="tabs tabs-disciplina">
        {DISCIPLINAS.map((d) => (
          <button key={d.id} className={disciplina === d.id ? 'active' : ''} onClick={() => setDisciplina(d.id)}>
            {d.rotulo}
          </button>
        ))}
      </div>

      {!disciplinaAtual.implementada ? (
        <p className="empty">Disciplina {disciplinaAtual.rotulo.toLowerCase()} ainda não implementada nesta versão.</p>
      ) : (
        <>
          <div className="add-row">
            <input placeholder={disciplina === 'estrutura' ? 'Identificação (ex. S1)' : 'Identificação (ex. T1)'} value={novaTag} onChange={(e) => setNovaTag(e.target.value)} />
            <div className="add-buttons">
              {disciplina === 'estrutura' && (
                <>
                  <button onClick={() => handleAdicionar('sapata')}>+ Sapata</button>
                  <button onClick={() => handleAdicionar('pilar_arranque')}>+ Pilar</button>
                  <button onClick={() => handleAdicionar('viga_baldrame')}>+ Viga baldrame</button>
                </>
              )}
              {disciplina === 'hidrossanitario' && (
                <>
                  <button onClick={() => handleAdicionar('tubulacao')}>+ Tubulação</button>
                  <button onClick={() => handleAdicionar('caixa_dagua')}>+ Caixa d'água</button>
                  <button onClick={() => handleAdicionar('caixa_concreto')}>+ Caixa de concreto</button>
                </>
              )}
            </div>
          </div>

          {grupos.map((g) => {
            const aberto = expandido.has(g.chave);
            return (
              <div key={g.chave} className="grupo-tipo">
                <button className="grupo-cabecalho" onClick={() => alternarGrupo(g.chave)}>
                  <span className={`seta ${aberto ? 'aberta' : ''}`}>▸</span>
                  <span className="grupo-titulo">
                    {g.titulo} <span className="grupo-qtd">({g.elementos.length})</span>
                  </span>
                  <span className="grupo-peso">{n(g.pesoTotal)} kg</span>
                </button>
                {aberto && (
                  <ul>
                    {g.elementos.map((el) => (
                      <li key={el.id} className={el.id === selecionadoId ? 'selected' : ''} onClick={() => selecionar(el.id)}>
                        <span className="tag">
                          {el.tag}
                          {el.armaduraImportada && el.armaduraImportada.length > 0 && <span className="badge-ifc">IFC</span>}
                        </span>
                        <span className="peso">{n(pesos.get(el.id) ?? 0)} kg</span>
                        <span className="status">{statusResumo(el)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {grupos.length === 0 && (
            <p className="empty">
              Nenhum elemento {disciplina === 'estrutura' ? 'estrutural' : 'hidrossanitário'} ainda. Adicione um acima ou importe um IFC.
            </p>
          )}
        </>
      )}
    </div>
  );
}

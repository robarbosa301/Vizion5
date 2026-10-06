import { useState } from 'react';
import { categoriaDoTipo, type BimElement } from '../../types';
import { useProjectStore } from '../../store/useProjectStore';
import { calcularQuantitativo } from '../../lib/quantities';
import { calcularQuantitativoCaixaConcreto, calcularQuantitativoCaixaDagua, calcularQuantitativoTubulacao } from '../../lib/hydro';
import { NumberField } from './NumberField';
import { TracoForm } from './TracoForm';
import { QuantitiesPanel } from './QuantitiesPanel';
import { QuantitiesPanelCaixaConcreto, QuantitiesPanelCaixaDagua, QuantitiesPanelTubulacao } from './QuantitiesPanelHidro';
import { ExecutionPanel } from './ExecutionPanel';
import { CaixaConcretoFields, CaixaDaguaFields, PilarFields, SapataFields, TubulacaoFields, VigaFields } from './GeometryArmaduraForms';

type Aba = 'editar' | 'quantitativos' | 'execucao';

export function ElementInspector({ elemento }: { elemento: BimElement }) {
  const atualizarElemento = useProjectStore((s) => s.atualizarElemento);
  const removerElemento = useProjectStore((s) => s.removerElemento);
  const [aba, setAba] = useState<Aba>('editar');
  const categoria = categoriaDoTipo(elemento.tipo);

  function onChange(patch: Partial<BimElement>) {
    atualizarElemento(elemento.id, patch);
  }

  return (
    <div className="inspector">
      <div className="inspector-header">
        <input
          className="tag-input"
          value={elemento.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
        />
        <button className="danger" onClick={() => removerElemento(elemento.id)}>
          Remover
        </button>
      </div>

      {categoria === 'estrutural' && elemento.classeConcreto && (
        <p className="hint">
          Projeto (IFC): concreto {elemento.classeConcreto}
          {elemento.cobrimentoProjeto !== undefined && `, cobrimento ${elemento.cobrimentoProjeto}cm`}.
        </p>
      )}
      <div className="tabs">
        <button className={aba === 'editar' ? 'active' : ''} onClick={() => setAba('editar')}>
          Editar
        </button>
        <button className={aba === 'quantitativos' ? 'active' : ''} onClick={() => setAba('quantitativos')}>
          Quantitativos
        </button>
        <button className={aba === 'execucao' ? 'active' : ''} onClick={() => setAba('execucao')}>
          Execução
        </button>
      </div>

      {aba === 'editar' && (
        <div className="tab-content">
          <fieldset className="group">
            <legend>Posição no canteiro</legend>
            <NumberField label="X" suffix="m" value={elemento.posicao.x} onChange={(v) => onChange({ posicao: { ...elemento.posicao, x: v } })} />
            <NumberField label="Y (elevação)" suffix="m" value={elemento.posicao.y} onChange={(v) => onChange({ posicao: { ...elemento.posicao, y: v } })} />
            <NumberField label="Z" suffix="m" value={elemento.posicao.z} onChange={(v) => onChange({ posicao: { ...elemento.posicao, z: v } })} />
          </fieldset>

          {elemento.tipo === 'sapata' && <SapataFields el={elemento} onChange={onChange} />}
          {elemento.tipo === 'pilar_arranque' && <PilarFields el={elemento} onChange={onChange} />}
          {elemento.tipo === 'viga_baldrame' && <VigaFields el={elemento} onChange={onChange} />}
          {elemento.tipo === 'tubulacao' && <TubulacaoFields el={elemento} onChange={onChange} />}
          {elemento.tipo === 'caixa_dagua' && <CaixaDaguaFields el={elemento} onChange={onChange} />}
          {elemento.tipo === 'caixa_concreto' && <CaixaConcretoFields el={elemento} onChange={onChange} />}

          {(elemento.tipo === 'sapata' || elemento.tipo === 'pilar_arranque' || elemento.tipo === 'viga_baldrame') && (
            <TracoForm traco={elemento.traco} onChange={(traco) => onChange({ traco })} />
          )}
        </div>
      )}

      {aba === 'quantitativos' && (
        <div className="tab-content">
          {elemento.tipo === 'sapata' || elemento.tipo === 'pilar_arranque' || elemento.tipo === 'viga_baldrame' ? (
            <QuantitiesPanel q={calcularQuantitativo(elemento)} />
          ) : elemento.tipo === 'tubulacao' ? (
            <QuantitiesPanelTubulacao q={calcularQuantitativoTubulacao(elemento)} />
          ) : elemento.tipo === 'caixa_dagua' ? (
            <QuantitiesPanelCaixaDagua q={calcularQuantitativoCaixaDagua(elemento)} />
          ) : (
            <QuantitiesPanelCaixaConcreto q={calcularQuantitativoCaixaConcreto(elemento)} />
          )}
        </div>
      )}

      {aba === 'execucao' && (
        <div className="tab-content">
          <ExecutionPanel elemento={elemento} />
        </div>
      )}
    </div>
  );
}

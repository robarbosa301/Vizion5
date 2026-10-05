import { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';

function formatarData(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TelaInicio() {
  const obras = useProjectStore((s) => s.obras);
  const criarObra = useProjectStore((s) => s.criarObra);
  const abrirObra = useProjectStore((s) => s.abrirObra);
  const excluirObra = useProjectStore((s) => s.excluirObra);

  const [nomeNovaObra, setNomeNovaObra] = useState('');

  const obrasOrdenadas = [...obras].sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm));

  function criar() {
    const nome = nomeNovaObra.trim() || 'Nova obra';
    criarObra(nome);
    setNomeNovaObra('');
  }

  function excluir(id: string, nome: string) {
    if (window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) {
      excluirObra(id);
    }
  }

  return (
    <div className="tela-inicio">
      <div className="tela-inicio-cabecalho">
        <span className="app-nome">Vizion5</span>
        <p className="tela-inicio-legenda">Visualizador BIM 5D para acompanhamento de obra em campo</p>
      </div>

      <form
        className="nova-consulta"
        onSubmit={(e) => {
          e.preventDefault();
          criar();
        }}
      >
        <input
          type="text"
          placeholder="Nome da obra (ex: Residencial Eddy)"
          value={nomeNovaObra}
          onChange={(e) => setNomeNovaObra(e.target.value)}
        />
        <button type="submit">+ Nova consulta</button>
      </form>

      <div className="lista-consultas">
        <h3>Consultas salvas</h3>
        {obrasOrdenadas.length === 0 ? (
          <p className="placeholder">Nenhuma obra salva ainda. Crie uma acima pra começar.</p>
        ) : (
          <ul>
            {obrasOrdenadas.map((obra) => (
              <li key={obra.id} className="consulta-item" onClick={() => abrirObra(obra.id)}>
                <div className="consulta-info">
                  <span className="consulta-nome">{obra.nome}</span>
                  <span className="consulta-meta">
                    {obra.elementos.length} {obra.elementos.length === 1 ? 'elemento' : 'elementos'} · atualizado em{' '}
                    {formatarData(obra.atualizadaEm)}
                  </span>
                </div>
                <button
                  type="button"
                  className="consulta-excluir"
                  onClick={(e) => {
                    e.stopPropagation();
                    excluir(obra.id, obra.nome);
                  }}
                  aria-label={`Excluir ${obra.nome}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="6" x2="19" y2="6" />
                    <path d="M8 6V4h8v2M6 6l1 14h10l1-14" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

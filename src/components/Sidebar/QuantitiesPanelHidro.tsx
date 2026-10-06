import { NOME_REDE, NOME_SUBTIPO_CAIXA_CONCRETO, type QuantitativoCaixaConcreto, type QuantitativoCaixaDagua, type QuantitativoTubulacao } from '../../lib/hydro';

function n(v: number, casas = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export function QuantitiesPanelTubulacao({ q }: { q: QuantitativoTubulacao }) {
  return (
    <div className="quantities">
      <section className="peso-total-destaque">
        <h4>Peso estimado do trecho</h4>
        <p className="total">{q.pesoConfiavel ? `${n(q.pesoEstimadoKg, 1)} kg` : '—'}</p>
        {!q.pesoConfiavel && (
          <p className="hint">Sem tabela de referência de peso pro material "{q.material}" ainda — só PVC soldável por enquanto.</p>
        )}
      </section>
      <section>
        <h4>Tubulação</h4>
        <table>
          <tbody>
            <tr>
              <td>Rede</td>
              <td>{NOME_REDE[q.rede]}</td>
            </tr>
            <tr>
              <td>Comprimento</td>
              <td>{n(q.comprimentoM)} m</td>
            </tr>
            <tr>
              <td>Diâmetro</td>
              <td>⌀{n(q.diametroMm, 1)} mm</td>
            </tr>
            <tr>
              <td>Material</td>
              <td>{q.material}</td>
            </tr>
            <tr>
              <td>Conexões</td>
              <td>{q.qtdConexoes} un.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function QuantitiesPanelCaixaDagua({ q }: { q: QuantitativoCaixaDagua }) {
  return (
    <div className="quantities">
      <section className="peso-total-destaque">
        <h4>Capacidade</h4>
        <p className="total">{n(q.capacidadeLitros, 0)} L</p>
      </section>
      <section>
        <h4>Caixa d'água</h4>
        <table>
          <tbody>
            <tr>
              <td>Material</td>
              <td>{q.material}</td>
            </tr>
            <tr>
              <td>Dimensões</td>
              <td>
                {n(q.dimensoesM.comprimento)} × {n(q.dimensoesM.largura)} × {n(q.dimensoesM.altura)} m
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function QuantitiesPanelCaixaConcreto({ q }: { q: QuantitativoCaixaConcreto }) {
  return (
    <div className="quantities">
      <section className="peso-total-destaque">
        <h4>Tipo</h4>
        <p className="total">{NOME_SUBTIPO_CAIXA_CONCRETO[q.subtipo]}</p>
      </section>
      <section>
        <h4>{NOME_SUBTIPO_CAIXA_CONCRETO[q.subtipo]}</h4>
        <table>
          <tbody>
            <tr>
              <td>Material</td>
              <td>{q.material}</td>
            </tr>
            <tr>
              <td>Dimensões</td>
              <td>
                {n(q.dimensoesM.comprimento)} × {n(q.dimensoesM.largura)} × {n(q.dimensoesM.altura)} m
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

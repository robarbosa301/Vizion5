import type { BimElement, RedeHidrossanitaria, TipoElemento } from '../../types';
import { calcularResumoEtapa, calcularResumoHidrossanitario, type TotaisMateriais } from '../../lib/resumo';
import { NOME_REDE } from '../../lib/hydro';

const ROTULO_TIPO: Record<TipoElemento, string> = {
  sapata: 'Sapatas',
  pilar_arranque: 'Pilares',
  viga_baldrame: 'Vigas',
  tubulacao: 'Tubulação',
  caixa_dagua: "Caixa d'água",
  caixa_concreto: 'Caixa de concreto',
};

const ORDEM_REDE: RedeHidrossanitaria[] = ['esgoto', 'agua_fria', 'pluvial'];

function n(v: number, casas = 2) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function LinhaTotais({ titulo, totais, destaque }: { titulo: string; totais: TotaisMateriais; destaque?: boolean }) {
  return (
    <tr className={destaque ? 'linha-destaque' : ''}>
      <td className="col-titulo">
        {titulo}
        <span className="col-qtd"> ({totais.quantidadeElementos})</span>
      </td>
      <td>{n(totais.volumeConcretoM3, 3)}</td>
      <td>{n(totais.areaFormaM2)}</td>
      <td>{n(totais.pesoAcoKg, 1)}</td>
      <td>{n(totais.cimentoSacos, 1)}</td>
    </tr>
  );
}

/**
 * Totais de material da etapa de fundação (hoje a única etapa do projeto): geral e por tipo de
 * elemento, pra saber quanto do total é sapata, quanto é pilar, quanto é viga. Aparece no lugar
 * do placeholder quando nada está selecionado.
 */
export function PainelResumo({ elementos }: { elementos: BimElement[] }) {
  if (elementos.length === 0) {
    return <div className="placeholder">Nenhum elemento ainda. Adicione uma sapata ou importe um IFC.</div>;
  }

  const temEstrutural = elementos.some((e) => e.tipo === 'sapata' || e.tipo === 'pilar_arranque' || e.tipo === 'viga_baldrame');
  const temHidro = elementos.some((e) => e.tipo === 'tubulacao' || e.tipo === 'caixa_dagua' || e.tipo === 'caixa_concreto');
  const resumo = temEstrutural ? calcularResumoEtapa(elementos) : null;
  const resumoHidro = temHidro ? calcularResumoHidrossanitario(elementos) : null;

  return (
    <div className="painel-resumo">
      {resumo && (
        <>
          <h3>Etapa: Fundação</h3>
          <p className="resumo-legenda">Sapatas, pilares de arranque e vigas baldrame — total da etapa e por tipo de elemento.</p>
          <table>
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Concreto<br />m³</th>
                <th>Fôrma<br />m²</th>
                <th>Aço<br />kg</th>
                <th>Cimento<br />sacos</th>
              </tr>
            </thead>
            <tbody>
              {resumo.porTipo.map(({ tipo, totais }) => (
                <LinhaTotais key={tipo} titulo={ROTULO_TIPO[tipo]} totais={totais} />
              ))}
              <LinhaTotais titulo="Total" totais={resumo.total} destaque />
            </tbody>
          </table>
          <p className="resumo-nota">Areia: {n(resumo.total.areiaM3)} m³ · Brita: {n(resumo.total.britaM3)} m³</p>
        </>
      )}

      {resumoHidro && (
        <>
          <h3 style={resumo ? { marginTop: 20 } : undefined}>Etapa: Hidrossanitário</h3>
          <p className="resumo-legenda">Tubulação (por rede), caixa d'água e caixas de concreto — totais da etapa.</p>
          <table className="tabela-hidro">
            <tbody>
              <tr>
                <td className="col-titulo">Trechos de tubulação</td>
                <td>{resumoHidro.qtdTrechos}</td>
              </tr>
              <tr>
                <td className="col-titulo">Comprimento total</td>
                <td>{n(resumoHidro.comprimentoTotalM)} m</td>
              </tr>
              {ORDEM_REDE.filter((rede) => resumoHidro.comprimentoPorRedeM[rede] > 0).map((rede) => (
                <tr key={rede}>
                  <td className="col-titulo col-sub">— {NOME_REDE[rede]}</td>
                  <td>{n(resumoHidro.comprimentoPorRedeM[rede])} m</td>
                </tr>
              ))}
              <tr>
                <td className="col-titulo">Conexões</td>
                <td>{resumoHidro.qtdConexoes}</td>
              </tr>
              <tr>
                <td className="col-titulo">Peso estimado</td>
                <td>{n(resumoHidro.pesoEstimadoKg, 1)} kg</td>
              </tr>
              <tr>
                <td className="col-titulo">Caixas d'água</td>
                <td>{resumoHidro.qtdCaixasDagua}</td>
              </tr>
              <tr>
                <td className="col-titulo">Capacidade total</td>
                <td>{n(resumoHidro.capacidadeTotalLitros, 0)} L</td>
              </tr>
              <tr>
                <td className="col-titulo">Caixas de concreto (gordura/passagem/fossa)</td>
                <td>{resumoHidro.qtdCaixasConcreto}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

import type { ThreeEvent } from '@react-three/fiber';
import type { BimElement, CamadaVisivel } from '../../types';
import { ConcretoBox } from './ConcretoBox';
import { FormaBox } from './FormaBox';
import { TroncoConcreto, TroncoForma } from './TroncoMesh';
import { ArmaduraPilarMesh, ArmaduraSapataMesh, ArmaduraVigaMesh } from './ArmaduraMeshes';
import { TubulacaoMesh, CaixaVolumeMesh } from './HidrossanitarioMeshes';
import { corArmadura, corCaixaConcreto, corCaixaDagua, corConcreto, corForma, corTubulacao } from './statusColor';
import { Edges } from '@react-three/drei';

interface Props {
  elemento: BimElement;
  camadas: Set<CamadaVisivel>;
  selecionado: boolean;
  onSelecionar: (id: string) => void;
}

export function ElementMesh({ elemento, camadas, selecionado, onSelecionar }: Props) {
  const { geometria } = elemento;
  const comprimento = geometria.comprimento;
  const largura = geometria.largura;
  const altura = geometria.altura;
  const tronco = elemento.tipo === 'sapata' ? elemento.tronco : undefined;
  // Fôrma/concreto só existem pros elementos estruturais (sapata/pilar/viga) — sem essa guarda,
  // tubulação/caixa d'água/caixa de concreto também ganhavam uma caixa de fôrma (tom amadeirado)
  // e concreto atrás da própria malha, que acabava dominando visualmente a cor por rede/categoria.
  const estrutural = elemento.tipo === 'sapata' || elemento.tipo === 'pilar_arranque' || elemento.tipo === 'viga_baldrame';

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onSelecionar(elemento.id);
  }

  // Altura total da peça (base + tronco, quando existe) — o destaque de seleção envolve a peça
  // inteira, não só o bloco da base, e fica visível em qualquer combinação de camadas ligadas
  // (não depende da camada Concreto estar ativa).
  const alturaTotalDestaque = altura + (tronco?.altura ?? 0);
  const folgaDestaque = 0.03;

  // Quantidade real de estribos do projeto (quando o elemento veio de um IFC) — usada no lugar de
  // uma contagem reconstruída a partir do espaçamento, pra o 3D bater exatamente com o projeto em
  // vez de uma aproximação (que também sofria arredondamento pra baixo e podia mostrar a menos).
  const qtdEstriboReal = elemento.armaduraImportada?.find((g) => {
    const d = g.descricao.toLowerCase();
    return d.includes('estribo') && !d.includes('aberto');
  })?.quantidade;

  return (
    <group
      position={[elemento.posicao.x, elemento.posicao.y, elemento.posicao.z]}
      rotation={[0, elemento.rotacaoY ?? 0, 0]}
      onClick={handleClick}
    >
      {selecionado && (
        <mesh position={[0, alturaTotalDestaque / 2, 0]}>
          <boxGeometry
            args={[comprimento + folgaDestaque, alturaTotalDestaque + folgaDestaque, largura + folgaDestaque]}
          />
          <meshBasicMaterial visible={false} />
          <Edges color="#ffd23f" scale={1} />
        </mesh>
      )}
      {estrutural && camadas.has('concreto') && (
        <group>
          <ConcretoBox comprimento={comprimento} altura={altura} largura={largura} cor={corConcreto(elemento)} />
          {tronco && (
            <TroncoConcreto
              comprimentoBase={comprimento}
              larguraBase={largura}
              comprimentoTopo={tronco.comprimento}
              larguraTopo={tronco.largura}
              altura={tronco.altura}
              y0={altura}
              cor={corConcreto(elemento)}
            />
          )}
        </group>
      )}
      {estrutural && camadas.has('forma') && (
        <group>
          <FormaBox comprimento={comprimento} altura={altura} largura={largura} cor={corForma(elemento)} />
          {tronco && (
            <TroncoForma
              comprimentoBase={comprimento}
              larguraBase={largura}
              comprimentoTopo={tronco.comprimento}
              larguraTopo={tronco.largura}
              altura={tronco.altura}
              y0={altura}
              cor={corForma(elemento)}
            />
          )}
        </group>
      )}
      {camadas.has('armadura') && elemento.tipo === 'sapata' && (
        <ArmaduraSapataMesh geometria={elemento.geometria} armadura={elemento.armadura} cor={corArmadura(elemento)} />
      )}
      {camadas.has('armadura') && elemento.tipo === 'pilar_arranque' && (
        <ArmaduraPilarMesh
          geometria={elemento.geometria}
          armadura={elemento.armadura}
          cor={corArmadura(elemento)}
          qtdEstriboReal={qtdEstriboReal}
        />
      )}
      {camadas.has('armadura') && elemento.tipo === 'viga_baldrame' && (
        <ArmaduraVigaMesh
          geometria={elemento.geometria}
          armadura={elemento.armadura}
          cor={corArmadura(elemento)}
          qtdEstriboReal={qtdEstriboReal}
        />
      )}

      {/* Tubulação/caixa d'água/caixa de concreto não têm camadas fôrma/concreto/armadura — sempre aparecem. */}
      {elemento.tipo === 'tubulacao' && (
        <TubulacaoMesh comprimento={comprimento} diametroM={elemento.diametroMm / 1000} cor={corTubulacao(elemento)} />
      )}
      {elemento.tipo === 'caixa_dagua' && (
        <CaixaVolumeMesh comprimento={comprimento} largura={largura} altura={altura} cor={corCaixaDagua(elemento)} />
      )}
      {elemento.tipo === 'caixa_concreto' && (
        <CaixaVolumeMesh comprimento={comprimento} largura={largura} altura={altura} cor={corCaixaConcreto(elemento)} />
      )}
    </group>
  );
}

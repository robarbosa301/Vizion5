import { Edges } from '@react-three/drei';

interface TubulacaoProps {
  comprimento: number; // m, eixo X
  diametroM: number;
  cor: string;
}

/** Trecho de tubulação: um cilindro ao longo do eixo X, igual à convenção de comprimento dos demais elementos. */
export function TubulacaoMesh({ comprimento, diametroM, cor }: TubulacaoProps) {
  const raio = diametroM / 2;
  return (
    <mesh position={[0, raio, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[raio, raio, comprimento, 12]} />
      <meshStandardMaterial color={cor} />
      {/* contorno sempre visível — tubo fino (poucos cm) some de perfil em certos ângulos sem ele */}
      <Edges color="#000000" opacity={0.35} transparent scale={1} />
    </mesh>
  );
}

interface CaixaDaguaProps {
  comprimento: number; // m
  largura: number; // m
  altura: number; // m
  cor: string;
}

/** Caixa d'água: um volume simples (a forma real — cilíndrica ou retangular — varia por fabricante). */
export function CaixaDaguaMesh({ comprimento, largura, altura, cor }: CaixaDaguaProps) {
  return (
    <mesh position={[0, altura / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[comprimento, altura, largura]} />
      <meshStandardMaterial color={cor} />
      <Edges color="#000000" opacity={0.35} transparent scale={1} />
    </mesh>
  );
}

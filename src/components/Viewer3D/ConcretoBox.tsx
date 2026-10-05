import { Edges } from '@react-three/drei';

interface Props {
  comprimento: number; // X
  altura: number; // Y
  largura: number; // Z
  cor: string;
  opacidade?: number;
}

/** Volume de concreto do elemento, centrado verticalmente sobre a base do grupo pai. */
export function ConcretoBox({ comprimento, altura, largura, cor, opacidade = 1 }: Props) {
  return (
    <mesh position={[0, altura / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[comprimento, altura, largura]} />
      <meshStandardMaterial color={cor} transparent={opacidade < 1} opacity={opacidade} />
      {/* aresta sempre visível — peças finas (pilares de 0.2m) somem de perfil em certos ângulos
          de câmera sem ela, parecendo "fôrma/concreto ausente" quando na verdade só é um corte fino */}
      <Edges color="#000000" opacity={0.35} transparent scale={1} />
    </mesh>
  );
}

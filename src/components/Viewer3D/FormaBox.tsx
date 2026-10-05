import { Edges } from '@react-three/drei';

export const ESPESSURA_TABUA = 0.025; // m, ~2.5cm — só para representação visual da fôrma

interface Props {
  comprimento: number; // X
  altura: number; // Y
  largura: number; // Z
  cor: string;
  /** Afasta cada taipal do volume de concreto na direção da sua própria normal (m) — para a vista explodida. */
  explode?: number;
}

/** Fôrma de madeira: 4 taipais nas faces laterais, encostados no volume de concreto (ou afastados, se `explode`). */
export function FormaBox({ comprimento, altura, largura, cor, explode = 0 }: Props) {
  const material = <meshStandardMaterial color={cor} />;
  // aresta sempre visível — peças finas (pilares de 0.2m) somem de perfil em certos ângulos de
  // câmera sem ela, parecendo "fôrma ausente" quando na verdade só é um taipal fino visto de lado
  const aresta = <Edges color="#000000" opacity={0.35} transparent scale={1} />;
  return (
    <group position={[0, altura / 2, 0]}>
      {/* frente / trás (perpendiculares a Z) */}
      <mesh position={[0, 0, largura / 2 + ESPESSURA_TABUA / 2 + explode]}>
        <boxGeometry args={[comprimento + 2 * ESPESSURA_TABUA, altura, ESPESSURA_TABUA]} />
        {material}
        {aresta}
      </mesh>
      <mesh position={[0, 0, -largura / 2 - ESPESSURA_TABUA / 2 - explode]}>
        <boxGeometry args={[comprimento + 2 * ESPESSURA_TABUA, altura, ESPESSURA_TABUA]} />
        {material}
        {aresta}
      </mesh>
      {/* esquerda / direita (perpendiculares a X) */}
      <mesh position={[comprimento / 2 + ESPESSURA_TABUA / 2 + explode, 0, 0]}>
        <boxGeometry args={[ESPESSURA_TABUA, altura, largura]} />
        {material}
        {aresta}
      </mesh>
      <mesh position={[-comprimento / 2 - ESPESSURA_TABUA / 2 - explode, 0, 0]}>
        <boxGeometry args={[ESPESSURA_TABUA, altura, largura]} />
        {material}
        {aresta}
      </mesh>
    </group>
  );
}

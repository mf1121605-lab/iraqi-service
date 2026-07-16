import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';

const GEOMETRIES = {
  military: <octahedronGeometry args={[1, 0]} />,
  education: <dodecahedronGeometry args={[1, 0]} />,
  welfare: <icosahedronGeometry args={[1, 1]} />,
  general: <torusKnotGeometry args={[0.7, 0.26, 128, 16]} />,
};

function Shape({ variant, color }) {
  const geometry = GEOMETRIES[variant] ?? GEOMETRIES.general;
  return (
    <Float speed={2.2} rotationIntensity={1.1} floatIntensity={1.6}>
      <mesh castShadow receiveShadow>
        {geometry}
        {variant === 'welfare' ? (
          <MeshDistortMaterial color={color} metalness={0.75} roughness={0.2} distort={0.25} speed={1.5} />
        ) : (
          <meshStandardMaterial color={color} metalness={0.85} roughness={0.18} />
        )}
      </mesh>
    </Float>
  );
}

// Client-only 3D badge (rendered via next/dynamic with ssr:false by callers) —
// renders a small metallic/glass primitive shape per service category since we
// have no bespoke GLTF icon models; React Three Fiber + Drei is real, not a
// CSS approximation, it just draws an abstracted gem-like form instead of a
// literal shield/cap/heart sculpt.
//
// Deliberately no drei <Environment> here: it fetches an HDR map from a
// third-party CDN at runtime, and a failed fetch (network hiccup, ad
// blocker, offline) throws and takes down the whole page, not just this
// badge. A few local lights fake enough specular highlight for a metallic
// look without any external dependency.
export default function Icon3D({ variant = 'general', color = '#e6ab2c', className }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 2]} intensity={1.4} castShadow />
        <directionalLight position={[-2, 1, -2]} intensity={0.5} color="#ffffff" />
        <pointLight position={[-2, -1, 1.5]} intensity={0.6} color="#e6ab2c" />
        <pointLight position={[1, -2, 1]} intensity={0.3} color="#ffffff" />
        <Shape variant={variant} color={color} />
      </Canvas>
    </div>
  );
}

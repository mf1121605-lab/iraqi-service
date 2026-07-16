import { useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';

// Classic shield silhouette: flat top, pointed bottom.
function buildShieldShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.95, 0.85);
  s.lineTo(0.95, 0.85);
  s.lineTo(0.95, -0.1);
  s.quadraticCurveTo(0.95, -1.05, 0, -1.5);
  s.quadraticCurveTo(-0.95, -1.05, -0.95, -0.1);
  s.lineTo(-0.95, 0.85);
  return s;
}

// Classic two-lobe heart silhouette, tip at the bottom.
function buildHeartShape() {
  const s = new THREE.Shape();
  s.moveTo(0.25, 0.25);
  s.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0);
  s.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35);
  s.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95);
  s.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35);
  s.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0);
  s.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25);
  return s;
}

const SHIELD_SHAPE = buildShieldShape();
const HEART_SHAPE = buildHeartShape();
const EXTRUDE_SETTINGS = { depth: 0.32, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 4 };

function useCenteredGeometry(shape) {
  return useMemo(() => {
    const geometry = new THREE.ExtrudeGeometry(shape, EXTRUDE_SETTINGS);
    geometry.center();
    return geometry;
  }, [shape]);
}

// Kept below 0.65 and paired with a faint emissive tint: a near-mirror
// metalness with no environment map to reflect goes solid black the moment
// the flat face isn't pointed straight at a light, which Float's constant
// rotation guarantees will happen. The emissive keeps the shape legible at
// every angle while roughness still reads as brushed metal, not plastic.
function metalMaterialProps(color) {
  return { color, metalness: 0.55, roughness: 0.3, emissive: color, emissiveIntensity: 0.12 };
}

function CapIcon({ color }) {
  const props = metalMaterialProps(color);
  const goldProps = metalMaterialProps('#e6ab2c');
  return (
    <group scale={0.85}>
      <RoundedBox args={[1.7, 0.16, 1.7]} radius={0.05} rotation={[0, Math.PI / 4, 0]}>
        <meshStandardMaterial {...props} />
      </RoundedBox>
      <mesh position={[0, -0.32, 0]}>
        <cylinderGeometry args={[0.34, 0.44, 0.5, 24]} />
        <meshStandardMaterial {...props} />
      </mesh>
      <mesh position={[0.55, -0.05, 0.55]} rotation={[0, 0, Math.PI / 5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
      <mesh position={[0.85, -0.42, 0.85]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial {...goldProps} />
      </mesh>
    </group>
  );
}

function ShieldIcon({ color }) {
  const geometry = useCenteredGeometry(SHIELD_SHAPE);
  return (
    <mesh geometry={geometry} scale={0.85}>
      <meshStandardMaterial {...metalMaterialProps(color)} />
    </mesh>
  );
}

function HeartIcon({ color }) {
  const geometry = useCenteredGeometry(HEART_SHAPE);
  return (
    <mesh geometry={geometry} scale={0.85}>
      <meshPhysicalMaterial color={color} metalness={0.3} roughness={0.15} clearcoat={1} clearcoatRoughness={0.1} emissive={color} emissiveIntensity={0.15} />
    </mesh>
  );
}

const GRID_OFFSETS = [
  [-0.45, 0.45],
  [0.45, 0.45],
  [-0.45, -0.45],
  [0.45, -0.45],
];

function GridIcon({ color }) {
  const props = metalMaterialProps(color);
  return (
    <group scale={0.85}>
      {GRID_OFFSETS.map(([x, y], i) => (
        <RoundedBox key={i} args={[0.75, 0.75, 0.32]} radius={0.08} position={[x, y, 0]}>
          <meshStandardMaterial {...props} />
        </RoundedBox>
      ))}
    </group>
  );
}

const ICONS = {
  education: CapIcon,
  military: ShieldIcon,
  welfare: HeartIcon,
  general: GridIcon,
};

function Shape({ variant, color }) {
  const IconComponent = ICONS[variant] ?? ICONS.general;
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
      <IconComponent color={color} />
    </Float>
  );
}

// Client-only 3D badge (rendered via next/dynamic with ssr:false by callers) —
// builds literal icon silhouettes (graduation cap, shield, heart, grid) out of
// real Three.js primitives/extrusions since we have no GLTF model files and
// can't fetch any from a CDN in this environment; React Three Fiber + Drei
// renders and lights them, it's not a CSS approximation.
//
// Deliberately no drei <Environment> here: it fetches an HDR map from a
// third-party CDN at runtime, and a failed fetch (network hiccup, ad
// blocker, offline) throws and takes down the whole page, not just this
// badge. A colored rim light plus local key/fill lights fake enough
// specular highlight for a metallic/glossy look without any external asset.
export default function Icon3D({ variant = 'general', color = '#e6ab2c', className }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.4} />
        <directionalLight position={[-2, 1, -2]} intensity={0.4} color="#ffffff" />
        <pointLight position={[-2, -1.5, 1.5]} intensity={0.9} color={color} />
        <pointLight position={[1.5, -2, 1]} intensity={0.35} color="#ffffff" />
        <Shape variant={variant} color={color} />
      </Canvas>
    </div>
  );
}

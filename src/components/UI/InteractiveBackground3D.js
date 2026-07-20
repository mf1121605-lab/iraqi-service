import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';

function MouseTracker({ mouse }) {
  const { camera } = useThree();
  const lightRef = useRef();

  useFrame((state) => {
    // Smoothly interpolate camera target and light towards mouse
    const targetX = (mouse.current.x * 2);
    const targetY = (mouse.current.y * 2);
    
    // Move light to follow mouse
    if (lightRef.current) {
      lightRef.current.position.x = THREE.MathUtils.lerp(lightRef.current.position.x, targetX * 3, 0.05);
      lightRef.current.position.y = THREE.MathUtils.lerp(lightRef.current.position.y, targetY * 3, 0.05);
    }

    // Gentle camera drift
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX * 0.5, 0.02);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY * 0.5, 0.02);
    camera.lookAt(0, 0, 0);
  });

  return (
    <pointLight
      ref={lightRef}
      position={[0, 0, 4]}
      intensity={3.5}
      color="#f4d98d"
      distance={8}
      decay={2}
    />
  );
}

function FloatingShapes() {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      groupRef.current.rotation.x = state.clock.getElapsedTime() * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Golden Torus Ring 1 */}
      <Float speed={1.5} rotationIntensity={1.2} floatIntensity={1.5}>
        <mesh position={[-2.5, 1.5, -2]} rotation={[Math.PI / 4, Math.PI / 6, 0]}>
          <torusGeometry args={[0.8, 0.18, 16, 100]} />
          <meshStandardMaterial
            color="#e6ab2c"
            metalness={0.9}
            roughness={0.15}
            emissive="#b46f17"
            emissiveIntensity={0.15}
          />
        </mesh>
      </Float>

      {/* Golden Floating Sphere */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
        <mesh position={[3, -1.8, -1.5]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial
            color="#e6ab2c"
            metalness={0.95}
            roughness={0.1}
            emissive="#8a5307"
            emissiveIntensity={0.2}
          />
        </mesh>
      </Float>

      {/* Secondary Torus Ring 2 */}
      <Float speed={1.2} rotationIntensity={1.5} floatIntensity={1.2}>
        <mesh position={[2, 2.2, -3]} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
          <torusGeometry args={[0.5, 0.12, 16, 80]} />
          <meshStandardMaterial
            color="#f4d98d"
            metalness={0.85}
            roughness={0.2}
            emissive="#b46f17"
            emissiveIntensity={0.1}
          />
        </mesh>
      </Float>
    </group>
  );
}

function Starfield() {
  const pointsRef = useRef();
  const count = 180;

  const [positions] = useState(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;      // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;  // y
      pos[i * 3 + 2] = (Math.random() - 0.7) * 8;   // z
    }
    return pos;
  });

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.015;
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.008;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#e6ab2c"
        size={0.045}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  );
}

export default function InteractiveBackground3D() {
  const mouse = useRef({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (event) => {
      // Normalize mouse coordinates to [-1, 1]
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.4} />
        {/* Soft fill lights */}
        <directionalLight position={[-5, 5, 2]} intensity={0.8} color="#ffffff" />
        <directionalLight position={[5, -5, -2]} intensity={0.4} color="#e6ab2c" />
        
        <MouseTracker mouse={mouse} />
        <FloatingShapes />
        <Starfield />
      </Canvas>
    </div>
  );
}

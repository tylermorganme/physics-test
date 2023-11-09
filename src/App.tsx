import { useState } from 'react'
import './App.css'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei'
import AxesHelperWithLabels from './components/AxesHelperWithLabels'
import { useControls } from 'leva'
import React from 'react'
import { BallCollider, Physics, RigidBody, RigidBodyTypeString } from '@react-three/rapier'
import * as THREE from "three"

interface Enemy {
  id: number;
  position: Triplet;
  velocity: Triplet;
}

type Triplet = [x: number, y: number, z: number];

const zeroVector = new THREE.Vector3(0, 0, 0);

function App() {
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const { physicsDebug } = useControls({ physicsDebug: { value: true, label: "Physics Debug" } })
  const { enemyCount: colliderCount } = useControls("Colliders", { enemyCount: { value: 100, min: 0, max: 10000, step: 100, label: "Count" } })
  const { spawnScale } = useControls("Colliders", { spawnScale: { value: 10, min: 0, max: 100, step: 100, label: "Spawn Scale" } })

  const { xGravity } = useControls("Gravity", { xGravity: { value: 0, min: -20, max: 20, step: 1, label: "X Gravity" } })
  const { zGravity } = useControls("Gravity", { zGravity: { value: 0, min: -20, max: 20, step: 1, label: "Y Gravity" } })
  const { velocity } = useControls("Velocity", { velocity: { value: 0, min: -20, max: 20, step: 1, label: "Velocity" } })
  const { sameDirection } = useControls("Velocity", { sameDirection: { value: true, label: "Same Direction?" } })
  const { type } = useControls({
    type: {
      options: ["dyanmic", "static", "kinematicPosition", "kinematicVelocity"],
      label: "Rigid Body Type"
    }
  })
  const { velocityIterations } = useControls('Iterations', {
    velocityIterations: { value: 4, min: 1, max: 4, step: 1, label: "Velocity" }
  })
  const { velocityFrictionIterations } = useControls('Iterations', {
    velocityFrictionIterations: { value: 8, min: 1, max: 8, step: 1, label: "Friction" }
  })
  const { stabilizationIterations } = useControls('Iterations', {
    stabilizationIterations: { value: 1, min: 1, max: 2, step: 1, label: "Stabilization" }
  })


  React.useEffect(() => {
    const newEnemies: Enemy[] = []
    for (let i = 0; i < colliderCount; i++) {
      newEnemies.push({
        id: i,
        position: [(-1 + Math.random() * 2) * spawnScale, 0, (-1 + Math.random() * 2) * spawnScale],
        velocity: [-1 + Math.random() * 2, 0, -1 + Math.random() * 2]
      })
      setEnemies(newEnemies);
    }
  }, [colliderCount, spawnScale])

  return (
    <Canvas>
      <OrbitControls />
      <PerspectiveCamera />

      <Stats />
      <AxesHelperWithLabels />
      <Physics
        debug={physicsDebug}
        gravity={[xGravity, 0, zGravity]}
        maxVelocityIterations={velocityIterations}
        maxVelocityFrictionIterations={velocityFrictionIterations}
        maxStabilizationIterations={stabilizationIterations}
      >
        {enemies.map(enemy => {
          return (
            <RigidBody
              key={enemy.id}
              position={enemy.position}
              canSleep={false}
              linearVelocity={sameDirection ? [velocity, 0, 0] : [enemy.velocity[0] * velocity, 0, enemy.velocity[2] * velocity]}
              lockRotations={true}
              type={type as RigidBodyTypeString}
            >
              <BallCollider
                args={[0.25]}
              />
            </RigidBody>
          )
        })}
      </Physics>

    </Canvas>
  )
}

export default App

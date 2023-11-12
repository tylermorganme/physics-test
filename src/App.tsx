import { MutableRefObject, useMemo, useRef, useState } from 'react'
import './App.css'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei'
import AxesHelperWithLabels from './components/AxesHelperWithLabels'
import { useControls } from 'leva'
import React from 'react'
import { BallCollider, Physics, RapierRigidBody, RigidBody, RigidBodyTypeString, useRapier, vec3 } from '@react-three/rapier'
import * as THREE from "three"

interface Enemy {
  id: number;
  position: Triplet;
  velocity: Triplet;
}

type Triplet = [x: number, y: number, z: number];


//This can be used to batch all of the physics body updates in a single useframe call
// const GameState = () => {
//   const {world} = useRapier();
//   const counter = useRef(0);
//   const velocityLastUpdated = useRef(Date.now());


//   useFrame(()=> {
//     // if (Date.now() - velocityLastUpdated.current < 250) return;
//     // velocityLastUpdated.current = Date.now();
//     counter.current++
//     const tempVector = new THREE.Vector3()
//     world.forEachRigidBody(body=> {
//       body.setLinvel(tempVector.set(0.01 * counter.current, 0, 0), false)
//     })
//   })

//   return null
// }

interface EnemyRenderProps {
  enemy: Enemy;
  type: RigidBodyTypeString
}


const enabledTranslations: [boolean, boolean, boolean] = [true, false, true];

interface CalcVelocityProps {
  sameDirection: boolean;
  velocity: Triplet;
}

const RenderEnemy: React.FC<EnemyRenderProps> = ({
  enemy,
  type
}) => {
  const bodyRef = useRef<RapierRigidBody>(null);
  const vectorRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const enemyRef = useRef<Enemy>({...enemy, velocity:[enemy.velocity[0] * 0.01, 0, enemy.velocity[2] * 0.01 ]})
  const counterRef = useRef(0);
  const velocityLastUpdated = useRef(Date.now());

  useFrame(() => {
    if (Date.now() - velocityLastUpdated.current < 250) return;
    velocityLastUpdated.current = Date.now();
    counterRef.current++
    bodyRef.current?.setLinvel(
      vectorRef.current.set(
        enemyRef.current.velocity[0] * counterRef.current,
        0,
        enemyRef.current.velocity[2] * counterRef.current)
      , true)
  })


  return (
    <RigidBody
      ref={bodyRef}
      position={enemyRef.current.position}
      canSleep={false}
      lockRotations={true}
      enabledTranslations={enabledTranslations}
      type={type as RigidBodyTypeString}
    >
      <BallCollider
        args={[0.25]}
      />
    </RigidBody>
  )
}


function App() {
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const { physicsDebug } = useControls({ physicsDebug: { value: true, label: "Physics Debug" } })
  const { colliderCount } = useControls("Colliders", { colliderCount: { value: 500, min: 0, max: 3000, step: 100, label: "Count" } })
  const { spawnScale } = useControls("Colliders", { spawnScale: { value: 10, min: 0, max: 100, step: 100, label: "Spawn Scale" } })

  const { xGravity } = useControls("Gravity", { xGravity: { value: 0, min: -20, max: 20, step: 1, label: "X Gravity" } })
  const { zGravity } = useControls("Gravity", { zGravity: { value: 0, min: -20, max: 20, step: 1, label: "Y Gravity" } })
  // const { velocityMagnitude } = useControls("Velocity", { velocityMagnitude: { value: 0, min: -20, max: 20, step: 1, label: "Magnitude" } })
  // const magnitudeRef = useRef(0);
  // const { sameDirection } = useControls("Velocity", { sameDirection: { value: true, label: "Same Direction?" } })
  const { type } = useControls({
    type: {
      options: ["dynamic", "static", "kinematicPosition", "kinematicVelocity"],
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

    }
    setEnemies(newEnemies)
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
        {/* <GameState/> */}
        {enemies.map((enemy) => <RenderEnemy
          key={enemy.id}
          enemy={enemy}
          type={type as RigidBodyTypeString}
        />)}
      </Physics>

    </Canvas>
  )
}

export default App

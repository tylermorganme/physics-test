import {
  Suspense,
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./App.css";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  Sphere,
  Stats,
} from "@react-three/drei";
import AxesHelperWithLabels from "./components/AxesHelperWithLabels";
import { useControls } from "leva";
import React from "react";
import { RigidBodyTypeString } from "@react-three/rapier";
import * as THREE from "three";
import {
  ColliderDesc,
  RigidBody,
  RigidBodyDesc,
  World,
} from "@dimforge/rapier2d";
import { UPDATE_PRIORITY } from "./constant";

interface RapierContext {
  world: World | null;
  rapierInitialized: boolean;
}

interface Physics2DProps {
  gravity?: THREE.Vector2;
  children: React.ReactNode;
  debug?: boolean;
  timeStep?: number;
}

interface Enemy {
  id: number;
  position: Duplet;
  velocity: Duplet;
}

type Duplet = [x: number, y: number];

interface EnemyRenderProps {
  enemy: Enemy;
  type: RigidBodyTypeString;
}

const rapierContext = createContext<RapierContext | null>(null);

const useRapier2D = () => {
  const context = useContext(rapierContext);
  if (context === null) {
    throw new Error("useRapier must be used within a rapierContext.Provider");
  }
  if (!context.world) {
    throw new Error("world cannot be undefined");
  }
  return context;
};

const Physics2D: React.FC<Physics2DProps> = ({
  gravity = new THREE.Vector3(0, 0),
  children,
  debug = false,
  timeStep = 1 / 60,
}) => {
  const world = useRef<World | null>(null);
  const [rapierInitialized, setRapierInitialized] = useState(false);
  const context = useMemo(
    () => ({ world: world.current, rapierInitialized }),
    [rapierInitialized]
  );

  useEffect(() => {
    const initializeWorld = async () => {
      const RAPIER = await import("@dimforge/rapier2d");

      const newWorld = new RAPIER.World(gravity);
      newWorld.timestep = timeStep;
      world.current = newWorld;
      setRapierInitialized(true);
    };

    initializeWorld();
  }, []);

  useEffect(() => {
    if (!world.current) return;
    world.current.gravity = gravity;
  }, [gravity]);

  useEffect(() => {
    if (!world.current) return;
    world.current.timestep = timeStep;
  }, [timeStep]);

  useFrame(() => {
    world?.current?.step();
  }, UPDATE_PRIORITY.PHYSICS);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {rapierInitialized && (
        <rapierContext.Provider value={context}>
          {debug && <Debug />}
          {children}
        </rapierContext.Provider>
      )}
    </Suspense>
  );
};

const Debug = memo(() => {
  const { world } = useRapier2D();
  const ref = useRef<THREE.LineSegments>(new THREE.LineSegments());

  useFrame(() => {
    if (!world) return;
    const mesh = ref.current;
    if (!mesh) return;
    const buffers = world.debugRender();

    const vertices3D = new Float32Array((buffers.vertices.length / 2) * 3);
    for (let i = 0, j = 0; i < buffers.vertices.length; i += 2, j += 3) {
      vertices3D[j] = buffers.vertices[i];
      vertices3D[j + 1] = buffers.vertices[i + 1];
      vertices3D[j + 2] = 0;
    }

    mesh.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(vertices3D, 3)
    );

    mesh.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(buffers.colors, 4)
    );
  }, UPDATE_PRIORITY.PHYSICS_DEBUGGER);

  return (
    <group>
      <lineSegments ref={ref} frustumCulled={false}>
        <lineBasicMaterial color={0xffffff} vertexColors />
        <bufferGeometry />
      </lineSegments>
    </group>
  );
});

interface UseRigidBodyProps {
  initialPosition: Duplet;
}

const useRigidBody = ({ initialPosition = [0, 0] }: UseRigidBodyProps) => {
  const { world, rapierInitialized } = useRapier2D();
  const rigidBodyHandle = useRef<number | null>(null);
  const rigidBodyRef = useRef<RigidBody | null>(null);
  const colliderHandles = useRef<number[]>([]);
  // Change this ref to need something that has an interface that allow the
  // position to be changed.
  const threeRef = useRef<THREE.Group<THREE.Object3DEventMap>>(null);
  useEffect(() => {
    if (!rapierInitialized || !world) return;
    const rbDesc = RigidBodyDesc.dynamic()
      .setTranslation(...initialPosition)
      .setCanSleep(false)
      .lockRotations();
    const rb = world.createRigidBody(rbDesc);
    rigidBodyRef.current = rb;
    const colliderDesc = ColliderDesc.ball(1);
    const collider = world.createCollider(colliderDesc, rb);
    //Grab a reference to the collider;
    colliderHandles.current = [collider.handle];
    rigidBodyHandle.current = rb.handle;
  }, [rapierInitialized]);

  //TODO: Add logic to keep THREE component in sync with physics body;
  useFrame(() => {
    if (rigidBodyRef.current && threeRef.current) {
      const rigidBodyTranslation = { ...rigidBodyRef.current.translation() };
      threeRef.current.position.set(
        rigidBodyTranslation.x,
        rigidBodyTranslation.y,
        0
      );
    }
  }, UPDATE_PRIORITY.RENDER);

  useEffect(() => {
    return () => {
      if (!world) return;
      for (let colliderHandle of colliderHandles.current) {
        world.removeCollider(world.getCollider(colliderHandle), false);
      }
      if (rigidBodyHandle.current) {
        world.removeRigidBody(world.getRigidBody(rigidBodyHandle.current));
      }
    };
  }, [rapierInitialized]);

  return { threeRef, rigidBodyRef };
};

const RenderEnemy: React.FC<EnemyRenderProps> = ({ enemy }) => {
  const counterRef = useRef(0);
  const { threeRef, rigidBodyRef } = useRigidBody({
    initialPosition: enemy.position,
  });
  const direction = useMemo(
    () => ({ x: (1 - Math.random() * 2) * 0.01, y: (1 - Math.random() * 2) * 0.01, }), []
  );

  useFrame(() => {
    counterRef.current++;
    const { x, y } = direction;
    rigidBodyRef.current?.setLinvel(
      { x: x * counterRef.current, y: y * counterRef.current },
      true
    );
    counterRef.current++;
  });

  return <group ref={threeRef}>{/* <Sphere args={[0.5]}/> */}</group>;
};

function App() {
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const { physicsDebug } = useControls({
    physicsDebug: { value: true, label: "Physics Debug" },
  });
  const { colliderCount } = useControls("Colliders", {
    colliderCount: { value: 100, min: 0, max: 6000, step: 100, label: "Count" },
  });
  const { spawnScale } = useControls("Colliders", {
    spawnScale: {
      value: 10,
      min: 0,
      max: 100,
      step: 10,
      label: "Spawn Scale",
    },
  });

  const { type } = useControls({
    type: {
      options: ["dynamic", "static", "kinematicPosition", "kinematicVelocity"],
      label: "Rigid Body Type",
    },
  });

  React.useEffect(() => {
    const newEnemies: Enemy[] = [];
    for (let i = 0; i < colliderCount; i++) {
      newEnemies.push({
        id: i,
        position: [
          (-1 + Math.random() * 2) * spawnScale,
          (-1 + Math.random() * 2) * spawnScale,
        ],
        velocity: [-1 + Math.random() * 2, -1 + Math.random() * 2],
      });
    }
    setEnemies(newEnemies);
  }, [colliderCount, spawnScale]);

  return (
    <Canvas>
      <OrbitControls />
      <PerspectiveCamera />
      <Stats />
      <AxesHelperWithLabels />
      <Physics2D debug={physicsDebug}>
        {/* <GameState/> */}
        {enemies.map((enemy) => (
          <RenderEnemy
            key={enemy.id}
            enemy={enemy}
            type={type as RigidBodyTypeString}
          />
        ))}
      </Physics2D>
    </Canvas>
  );
}

export default App;

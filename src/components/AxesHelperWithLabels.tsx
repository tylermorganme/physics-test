import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const AxisLabel: React.FC<{ position: [number, number, number], text: string }> = ({ position, text }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  
  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) {
      mesh.lookAt(camera.position);
    }
  }, [camera.position]);

  return (
    <Text position={position} fontSize={0.2} color="black" ref={meshRef}>
      {text}
    </Text>
  );
};

const AxesHelperWithLabels = () => {

  return (
    <>
      <axesHelper args={[5]} />
      <AxisLabel position={[5.2, 0, 0]} text="X" />
      <AxisLabel position={[0, 5.2, 0]} text="Y" />
      <AxisLabel position={[0, 0, 5.2]} text="Z" />
    </>
  );
};



export default AxesHelperWithLabels
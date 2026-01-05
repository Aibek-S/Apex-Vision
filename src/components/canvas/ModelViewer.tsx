import React, { Suspense, useMemo, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, useGLTF, Environment } from "@react-three/drei";
import { Group, MathUtils } from "three";

type ModelViewerProps = {
    modelUrl: string;
    followCursor?: boolean;
    autoRotate?: boolean;
    rotationStrength?: number;
    smoothness?: number;
    baseRotation?: [number, number, number];
};

type MousePosition = { x: number; y: number };

const Model: React.FC<{
    modelUrl: string;
    mouseRef: React.MutableRefObject<MousePosition>;
    followCursor: boolean;
    autoRotate: boolean;
    rotationStrength: number;
    smoothness: number;
    baseRotation: [number, number, number];
}> = ({
    modelUrl,
    mouseRef,
    followCursor,
    autoRotate,
    rotationStrength,
    smoothness,
    baseRotation,
}) => {
    const { scene } = useGLTF(modelUrl);
    const model = useMemo(() => scene.clone(), [scene]);
    const groupRef = useRef<Group>(null);
    const autoAngle = useRef(0);

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        if (autoRotate) {
            autoAngle.current += delta * 0.5;
        }

        const cursorX = followCursor
            ? mouseRef.current.x * rotationStrength
            : 0;
        const cursorY = followCursor
            ? mouseRef.current.y * rotationStrength
            : 0;

        const targetX = baseRotation[0] + cursorY;
        const targetY = baseRotation[1] + cursorX + autoAngle.current;
        const targetZ = baseRotation[2];

        groupRef.current.rotation.x = MathUtils.lerp(
            groupRef.current.rotation.x,
            targetX,
            smoothness
        );
        groupRef.current.rotation.y = MathUtils.lerp(
            groupRef.current.rotation.y,
            targetY,
            smoothness
        );
        groupRef.current.rotation.z = MathUtils.lerp(
            groupRef.current.rotation.z,
            targetZ,
            smoothness
        );
    });

    return (
        <group ref={groupRef}>
            <primitive object={model} scale={3.5} />
        </group>
    );
};

export const ModelViewer: React.FC<ModelViewerProps> = ({
    modelUrl,
    followCursor = false,
    autoRotate = false,
    rotationStrength = 0.3,
    smoothness = 0.08,
    baseRotation = [0, 0, 0],
}) => {
    const mouseRef = useRef<MousePosition>({ x: 0, y: 0 });

    useEffect(() => {
        if (!followCursor) return;

        const onMouseMove = (e: MouseEvent) => {
            // Нормализация [-1, 1]
            mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
            mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
        };

        window.addEventListener("mousemove", onMouseMove);
        return () => window.removeEventListener("mousemove", onMouseMove);
    }, [followCursor]);

    useGLTF.preload(modelUrl);

    return (
        <div className="w-full h-full">
            <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />

                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={1.2} />
                <pointLight
                    position={[0, 3, 0]}
                    intensity={0.8}
                    color="#ff3c38"
                />

                <Environment preset="sunset" />

                <Suspense fallback={null}>
                    <Model
                        modelUrl={modelUrl}
                        mouseRef={mouseRef}
                        followCursor={followCursor}
                        autoRotate={autoRotate}
                        rotationStrength={rotationStrength}
                        smoothness={smoothness}
                        baseRotation={baseRotation}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default ModelViewer;

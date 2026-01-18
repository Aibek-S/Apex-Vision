import React, {
    Suspense,
    useMemo,
    useRef,
    useEffect,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
    PerspectiveCamera,
    useGLTF,
    Environment,
    useProgress,
} from "@react-three/drei";
import { Box3, Group, MathUtils, Vector3 } from "three";

export type ModelViewerHandle = {
    captureScreenshots: (
        angles: Array<[number, number, number]>
    ) => Promise<File[]>;
};

type ModelViewerProps = {
    modelUrl: string;
    followCursor?: boolean;
    autoRotate?: boolean;
    rotationStrength?: number;
    smoothness?: number;
    baseRotation?: [number, number, number];
    onReady?: () => void;
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
    groupRef: React.MutableRefObject<Group | null>;
    onReady?: () => void;
}> = ({
    modelUrl,
    mouseRef,
    followCursor,
    autoRotate,
    rotationStrength,
    smoothness,
    baseRotation,
    groupRef,
    onReady,
}) => {
    const { scene } = useGLTF(modelUrl);
    const model = useMemo(() => scene.clone(), [scene]);
    const autoAngle = useRef(0);

    useEffect(() => {
        const box = new Box3().setFromObject(model);
        const worldCenter = box.getCenter(new Vector3());
        const localCenter = model.worldToLocal(worldCenter.clone());
        model.traverse((child) => {
            if (!(child as { isMesh?: boolean }).isMesh) return;
            const mesh = child as {
                geometry?: {
                    translate: (x: number, y: number, z: number) => void;
                    clone: () => unknown;
                    userData?: Record<string, unknown>;
                };
            };
            if (!mesh.geometry) return;
            if (mesh.geometry.userData?.originCentered) return;
            mesh.geometry = mesh.geometry.clone() as typeof mesh.geometry;
            mesh.geometry.translate(
                -localCenter.x,
                -localCenter.y,
                -localCenter.z
            );
            mesh.geometry.userData = {
                ...(mesh.geometry.userData ?? {}),
                originCentered: true,
            };
        });
        model.updateMatrixWorld(true);
    }, [model]);

    useEffect(() => {
        onReady?.();
    }, [onReady, model]);

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

export const ModelViewer = forwardRef<ModelViewerHandle, ModelViewerProps>(
    (
        {
            modelUrl,
            followCursor = false,
            autoRotate = false,
            rotationStrength = 0.3,
            smoothness = 0.08,
            baseRotation = [0, 0, 0],
            onReady,
        },
        ref
    ) => {
        const mouseRef = useRef<MousePosition>({ x: 0, y: 0 });
        const wrapperRef = useRef<HTMLDivElement>(null);
        const groupRef = useRef<Group | null>(null);
        const glRef = useRef<import("three").WebGLRenderer | null>(null);
        const sceneRef = useRef<import("three").Scene | null>(null);
        const cameraRef = useRef<import("three").Camera | null>(null);
        const [isReady, setIsReady] = useState(false);

        useEffect(() => {
            if (!followCursor) return;

            const onMouseMove = (e: MouseEvent) => {
                if (!wrapperRef.current) return;

                const rect = wrapperRef.current.getBoundingClientRect();
                const normalizedX =
                    ((e.clientX - rect.left) / rect.width - 0.5) * 2;
                const normalizedY =
                    ((e.clientY - rect.top) / rect.height - 0.5) * 2;

                mouseRef.current.x = Math.max(-1, Math.min(1, normalizedX));
                mouseRef.current.y = Math.max(-1, Math.min(1, normalizedY));
            };

            window.addEventListener("mousemove", onMouseMove);
            return () => window.removeEventListener("mousemove", onMouseMove);
        }, [followCursor]);

        useGLTF.preload(modelUrl);

        const { active } = useProgress();

        useImperativeHandle(ref, () => ({
            captureScreenshots: async (angles) => {
                if (!glRef.current || !sceneRef.current || !cameraRef.current) {
                    throw new Error("WebGL сцена не готова для скриншотов.");
                }
                if (!groupRef.current || !isReady) {
                    throw new Error(
                        "Модель еще загружается, попробуйте позже."
                    );
                }

                const files: File[] = [];
                const { current: gl } = glRef;
                const { current: scene } = sceneRef;
                const { current: camera } = cameraRef;
                const baseRotation = groupRef.current.rotation.clone();

                for (let i = 0; i < angles.length; i += 1) {
                    const [x, y, z] = angles[i];
                    groupRef.current.rotation.set(
                        baseRotation.x + x,
                        baseRotation.y + y,
                        baseRotation.z + z
                    );
                    await new Promise((resolve) =>
                        requestAnimationFrame(resolve)
                    );
                    gl.render(scene, camera);
                    const blob = await new Promise<Blob>((resolve, reject) => {
                        gl.domElement.toBlob(
                            (result) => {
                                if (result) resolve(result);
                                else
                                    reject(
                                        new Error(
                                            "Не удалось создать скриншот."
                                        )
                                    );
                            },
                            "image/jpeg",
                            0.9
                        );
                    });
                    files.push(
                        new File([blob], `model-view-${i + 1}.jpg`, {
                            type: "image/jpeg",
                        })
                    );
                }

                groupRef.current.rotation.copy(baseRotation);
                return files;
            },
        }));

        return (
            <div ref={wrapperRef} className="relative w-full h-full">
                {active && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray/30 text-white z-10">
                        <span className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        <p className="text-lg font-medium">
                            Модель подгружается...
                        </p>
                    </div>
                )}
                <Canvas
                    dpr={[1, 2]}
                    gl={{
                        antialias: true,
                        alpha: true,
                        preserveDrawingBuffer: true,
                    }}
                    onCreated={({ gl, scene, camera }) => {
                        gl.setClearColor("#ffffff", 1);
                        glRef.current = gl;
                        sceneRef.current = scene;
                        cameraRef.current = camera;
                    }}
                >
                    <PerspectiveCamera
                        makeDefault
                        position={[0, 0, 5]}
                        fov={50}
                    />

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
                            groupRef={groupRef}
                            onReady={() => {
                                setIsReady(true);
                                onReady?.();
                            }}
                        />
                    </Suspense>
                </Canvas>
            </div>
        );
    }
);

export default ModelViewer;

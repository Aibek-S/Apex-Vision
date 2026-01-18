import {
    useEffect,
    useMemo,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";
import type { MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import { Box3, Vector3 } from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";

type ObjModelViewerProps = {
    objUrl: string;
    mtlUrl?: string | null;
    height?: number | string;
    autoRotate?: boolean;
    onReady?: () => void;
};

export type ObjModelViewerHandle = {
    captureScreenshots: (angles: Array<[number, number, number]>) => Promise<File[]>;
};

const getBasePath = (url: string) => {
    const lastSlash = url.lastIndexOf("/");
    return lastSlash >= 0 ? url.slice(0, lastSlash + 1) : url;
};

const ObjModel = ({
    objUrl,
    mtlUrl,
    groupRef,
    modelRotation,
    onReady,
}: {
    objUrl: string;
    mtlUrl?: string | null;
    groupRef: MutableRefObject<Group | null>;
    modelRotation: [number, number, number];
    onReady?: () => void;
}) => {
    const [object, setObject] = useState<Group | null>(null);
    const [error, setError] = useState<string | null>(null);

    const objKey = useMemo(() => `${objUrl}|${mtlUrl ?? ""}`, [objUrl, mtlUrl]);

    useEffect(() => {
        let isActive = true;
        setObject(null);
        setError(null);

        const load = async () => {
            const objLoader = new OBJLoader();

            if (mtlUrl) {
                const mtlLoader = new MTLLoader();
                mtlLoader.setResourcePath(getBasePath(mtlUrl));
                const materials = await mtlLoader.loadAsync(mtlUrl);
                materials.preload();
                objLoader.setMaterials(materials);
            }

            const obj = await objLoader.loadAsync(objUrl);
            const bounds = new Box3().setFromObject(obj);
            const worldCenter = bounds.getCenter(new Vector3());
            const localCenter = obj.worldToLocal(worldCenter.clone());
            obj.traverse((child) => {
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
            obj.updateMatrixWorld(true);
            if (isActive) {
                setObject(obj);
                onReady?.();
            }
        };

        load().catch((err) => {
            if (!isActive) return;
            setError(err instanceof Error ? err.message : "Не удалось загрузить модель.");
        });

        return () => {
            isActive = false;
        };
    }, [objKey, objUrl, mtlUrl]);

    if (error) {
        return (
            <group>
                {/* eslint-disable-next-line react/no-unknown-property */}
                <mesh>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#ff6b6b" />
                </mesh>
            </group>
        );
    }

    if (!object) return null;

    return (
        <group ref={groupRef} rotation={modelRotation}>
            <primitive object={object} scale={1.2} />
        </group>
    );
};

const ObjModelViewer = forwardRef<ObjModelViewerHandle, ObjModelViewerProps>(
    ({ objUrl, mtlUrl, height = 320, autoRotate = false, onReady }, ref) => {
    const controlsRef = useRef<any>(null);
    const groupRef = useRef<Group | null>(null);
    const glRef = useRef<import("three").WebGLRenderer | null>(null);
    const sceneRef = useRef<import("three").Scene | null>(null);
    const cameraRef = useRef<import("three").Camera | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        const controls = controlsRef.current;
        if (!controls) return;

        const setShiftPan = (enabled: boolean) => {
            if (!controls?.mouseButtons) return;
            controls.mouseButtons.LEFT = enabled ? 2 : 0;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Shift") setShiftPan(true);
        };
        const onKeyUp = (event: KeyboardEvent) => {
            if (event.key === "Shift") setShiftPan(false);
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    useImperativeHandle(ref, () => ({
        captureScreenshots: async (angles) => {
            if (!glRef.current || !sceneRef.current || !cameraRef.current) {
                throw new Error("WebGL сцена не готова для скриншотов.");
            }
            if (!groupRef.current || !isReady) {
                throw new Error("Модель еще загружается, попробуйте позже.");
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
                await new Promise((resolve) => requestAnimationFrame(resolve));
                gl.render(scene, camera);
                const blob = await new Promise<Blob>((resolve, reject) => {
                    gl.domElement.toBlob((result) => {
                        if (result) resolve(result);
                        else reject(new Error("Не удалось создать скриншот."));
                    }, "image/jpeg", 0.9);
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
        <div style={{ width: "100%", height, position: "relative" }}>
            <button
                type="button"
                onClick={() => setIsFlipped((prev) => !prev)}
                className="absolute right-3 top-3 z-10 rounded-md bg-black/70 px-3 py-1 text-xs font-semibold text-white hover:bg-black/80"
            >
                Вид сверху {isFlipped ? "обычно" : "вниз"}
            </button>
            <Canvas
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
                onCreated={({ gl, scene, camera }) => {
                    gl.setClearColor("#ffffff", 1);
                    glRef.current = gl;
                    sceneRef.current = scene;
                    cameraRef.current = camera;
                }}
            >
                <ambientLight intensity={0.8} />
                <directionalLight position={[6, 8, 6]} intensity={1.4} />
                <directionalLight position={[-6, 4, -4]} intensity={0.6} />
                <pointLight position={[0, 4, 0]} intensity={0.8} />
                <OrbitControls
                    ref={controlsRef}
                    enablePan
                    enableRotate
                    enableZoom
                    enableDamping
                    dampingFactor={0.08}
                    autoRotate={autoRotate}
                />
                <ObjModel
                    objUrl={objUrl}
                    mtlUrl={mtlUrl}
                    groupRef={groupRef}
                    modelRotation={[isFlipped ? Math.PI : 0, 0, 0]}
                    onReady={() => {
                        setIsReady(true);
                        onReady?.();
                    }}
                />
            </Canvas>
        </div>
    );
    }
);

export default ObjModelViewer;

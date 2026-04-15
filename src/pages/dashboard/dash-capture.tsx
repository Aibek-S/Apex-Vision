import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    CloudUpload,
    ExternalLink,
    Loader2,
    RefreshCcw,
    ScanSearch,
} from "lucide-react";
import { Button } from "../../components/UI/button";
import ObjModelViewer from "../../components/canvas/ObjModelViewer";
import { useAuth } from "../../contexts/useAuth";
import { supabase } from "../../lib/supabase";

const WATCHER_RESULTS_PATH =
    "C:\\Users\\Acer\\Documents\\Apex\\FLL\\watcher_3d\\projects\\results";
const WATCHER_API_URL = "/api/watcher/latest";
const WATCHER_POLL_INTERVAL_MS = 1000;
const WATCHER_DURATION_MS = 9000;
const WATCHER_INTERVAL_MS = 300;
const HtmlModelViewer = "model-viewer" as any;
const LOCAL_STORAGE_ROOT =
    "C:\\Users\\Acer\\Documents\\Apex\\FLL\\Local_Storage";

export default function DashCapture() {
    const { id: artifactId } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [deviceStatus, setDeviceStatus] = useState<
        "idle" | "searching" | "found" | "not_found"
    >("idle");
    const [deviceError, setDeviceError] = useState<string | null>(null);
    const [watcherStatus, setWatcherStatus] = useState<
        "idle" | "watching" | "done" | "not_found"
    >("idle");
    const [progress, setProgress] = useState(0);
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [materialUrl, setMaterialUrl] = useState<string | null>(null);
    const [modelType, setModelType] = useState<string | null>(null);
    const [modelError, setModelError] = useState<string | null>(null);
    const [modelCode, setModelCode] = useState<string>("");
    const [storedModelUrl, setStoredModelUrl] = useState<string | null>(null);
    const [localUploadModalOpen, setLocalUploadModalOpen] = useState(false);
    const [localFiles, setLocalFiles] = useState<File[]>([]);
    const [localUploading, setLocalUploading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const artifactName =
        (location.state as { artifactName?: string } | undefined)
            ?.artifactName || "Артефакт";

    useEffect(() => {
        if (!artifactId) return;
        const stored = window.localStorage.getItem(
            `artifactModelCode:${artifactId}`,
        );
        if (stored) {
            setModelCode(stored);
        }
    }, [artifactId]);

    useEffect(() => {
        if (!artifactId) return;
        let isActive = true;
        const loadArtifact = async () => {
            const { data, error } = await supabase
                .from("artifacts")
                .select('"3d_url"')
                .eq("id", artifactId)
                .single();
            if (!isActive) return;
            if (!error && data?.["3d_url"]) {
                const url = data["3d_url"];
                if (isLocalModelUrl(url)) {
                    setStoredModelUrl(toFsUrl(url));
                } else {
                    setStoredModelUrl(null);
                }
            }
        };
        void loadArtifact();
        return () => {
            isActive = false;
        };
    }, [artifactId]);

    const handleModelCodeChange = (value: string) => {
        setModelCode(value);
        if (!artifactId) return;
        window.localStorage.setItem(`artifactModelCode:${artifactId}`, value);
    };

    const getFileNameFromUrl = (url: string) => {
        try {
            const parsed = new URL(url, window.location.origin);
            const parts = parsed.pathname.split("/");
            return parts[parts.length - 1] || "model";
        } catch {
            return "model";
        }
    };

    const getExtensionFromUrl = (url: string | null) => {
        if (!url) return null;
        try {
            const parsed = new URL(url, window.location.origin);
            const name = parsed.pathname.split("/").pop() || "";
            const ext = name.split(".").pop();
            return ext ? ext.toLowerCase() : null;
        } catch {
            return null;
        }
    };

    const buildLocalPath = (fileName: string) =>
        `${LOCAL_STORAGE_ROOT}\\${artifactId}\\${fileName}`;

    const toFsUrl = (path: string) =>
        path.startsWith("/@fs/")
            ? path
            : `/@fs/${path.replace(/\\/g, "/")}`;

    const isLocalModelUrl = (url: string) =>
        url.startsWith("/@fs/") || /^[a-zA-Z]:\\/.test(url);

    const ensureProjectDirectory = async () => {
        if (!("showDirectoryPicker" in window)) {
            throw new Error(
                "Ваш браузер не поддерживает доступ к локальным папкам. Используйте Chrome.",
            );
        }

        const picker = window as typeof window & {
            showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
        };
        const baseHandle = await picker.showDirectoryPicker();
        if (baseHandle.name !== "Local_Storage") {
            throw new Error(
                "Выберите папку Local_Storage по пути C:\\Users\\Acer\\Documents\\Apex\\FLL\\Local_Storage.",
            );
        }
        return await baseHandle.getDirectoryHandle(artifactId, {
            create: true,
        });
    };

    const updateArtifact3dUrl = async (url: string | null) => {
        if (!artifactId) return;
        const { error } = await supabase
            .from("artifacts")
            .update({ "3d_url": url })
            .eq("id", artifactId);
        if (error) {
            throw new Error(error.message);
        }
    };

    const handleLocalFileUpload = async () => {
        if (!localFiles.length || !artifactId) return;
        setLocalError(null);
        setLocalUploading(true);

        try {
            const modelFile =
                localFiles.find((file) =>
                    file.name.toLowerCase().endsWith(".obj"),
                ) ??
                localFiles.find((file) =>
                    file.name.toLowerCase().endsWith(".glb"),
                ) ??
                localFiles.find((file) =>
                    file.name.toLowerCase().endsWith(".gltf"),
                ) ??
                null;

            if (!modelFile) {
                throw new Error("Нужен файл модели (.obj, .glb или .gltf).");
            }

            const projectDir = await ensureProjectDirectory();
            const imageFiles = localFiles.filter((file) =>
                [".jpg", ".jpeg", ".png"].some((ext) =>
                    file.name.toLowerCase().endsWith(ext),
                ),
            );
            const imageByLower = new Map(
                imageFiles.map((file) => [file.name.toLowerCase(), file.name]),
            );

            for (const file of localFiles) {
                const fileHandle = await projectDir.getFileHandle(file.name, {
                    create: true,
                });
                const writable = await fileHandle.createWritable();
                if (file.name.toLowerCase().endsWith(".mtl")) {
                    const rawText = await file.text();
                    const sanitized = rawText.replace(/\u0000/g, "").trim();
                    const rewritten = sanitized
                        .split(/\r?\n/)
                        .map((line) => {
                            const parts = line.trim().split(/\s+/);
                            if (parts.length < 2) return line;
                            const key = parts[0].toLowerCase();
                            const isTextureLine = [
                                "map_kd",
                                "map_ka",
                                "map_ks",
                                "map_ke",
                                "map_ns",
                                "map_d",
                                "map_bump",
                                "bump",
                                "disp",
                                "decal",
                                "norm",
                            ].includes(key);
                            if (!isTextureLine) return line;

                            const rawRef = parts[parts.length - 1];
                            const baseName = rawRef.split(/[\\/]/).pop() ?? rawRef;
                            const lower = baseName.toLowerCase();
                            const resolved =
                                imageByLower.get(lower) ??
                                (imageFiles.length === 1
                                    ? imageFiles[0].name
                                    : baseName);
                            return [...parts.slice(0, -1), resolved].join(" ");
                        })
                        .join("\n");
                    await writable.write(rewritten);
                } else {
                    await writable.write(file);
                }
                await writable.close();
            }

            const localPath = buildLocalPath(modelFile.name);
            const localUrl = toFsUrl(localPath);
            setStoredModelUrl(localUrl);
            await updateArtifact3dUrl(localUrl);
            setLocalUploadModalOpen(false);
            setLocalFiles([]);
        } catch (error) {
            setLocalError(
                error instanceof Error
                    ? error.message
                    : "Не удалось сохранить файл локально.",
            );
        } finally {
            setLocalUploading(false);
        }
    };

    if (!artifactId) {
        return (
            <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-700">
                Не указан идентификатор артефакта. Вернитесь и выберите проект.
                <div className="pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/dashboard/home")}
                    >
                        К проектам
                    </Button>
                </div>
            </div>
        );
    }

    const handleFindDevice = async () => {
        if (deviceStatus === "searching") return;
        setDeviceError(null);
        setDeviceStatus("searching");

        try {
            if (!navigator.mediaDevices?.enumerateDevices) {
                setDeviceStatus("not_found");
                setDeviceError("Браузер не поддерживает поиск камер.");
                return;
            }

            if (navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                    });
                    stream.getTracks().forEach((track) => track.stop());
                } catch (error) {
                    setDeviceStatus("not_found");
                    setDeviceError(
                        error instanceof Error
                            ? error.message
                            : "Нет доступа к камере.",
                    );
                    return;
                }
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(
                (device) =>
                    device.kind === "videoinput" &&
                    device.label?.toLowerCase().includes("shining-uvc"),
            );

            setDeviceStatus(hasCamera ? "found" : "not_found");
        } catch (error) {
            setDeviceStatus("not_found");
            setDeviceError(
                error instanceof Error
                    ? error.message
                    : "Не удалось получить список устройств.",
            );
        }
    };

    const handleWatcher = () => {
        if (watcherStatus === "watching") return;
        setWatcherStatus("watching");
        setProgress(0);
        setModelUrl(null);
        setMaterialUrl(null);
        setModelType(null);
        setModelError(null);
    };

    const handleResetWatcher = () => {
        setWatcherStatus("idle");
        setProgress(0);
        setModelUrl(null);
        setMaterialUrl(null);
        setModelType(null);
        setModelError(null);
    };

    useEffect(() => {
        if (watcherStatus !== "watching") return;

        const totalTicks = Math.ceil(WATCHER_DURATION_MS / WATCHER_INTERVAL_MS);
        let tick = 0;
        const interval = window.setInterval(() => {
            tick += 1;
            const nextProgress = Math.min(
                100,
                Math.round((tick / totalTicks) * 100),
            );
            setProgress(nextProgress);
            if (tick >= totalTicks) {
                window.clearInterval(interval);
                setWatcherStatus("not_found");
            }
        }, WATCHER_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [watcherStatus]);

    useEffect(() => {
        if (watcherStatus !== "watching") return;

        let isActive = true;

        const poll = async () => {
            try {
                const trimmedCode = modelCode.trim();
                const requestUrl = trimmedCode
                    ? `${WATCHER_API_URL}?code=${encodeURIComponent(
                          trimmedCode,
                      )}`
                    : WATCHER_API_URL;
                const response = await fetch(requestUrl, {
                    cache: "no-store",
                });

                if (response.status === 404) {
                    return;
                }

                if (!response.ok) {
                    throw new Error("Не удалось получить список файлов.");
                }

                const data = (await response.json()) as {
                    modelUrl?: string;
                    modelExt?: string;
                    mtlUrl?: string | null;
                };
                if (data?.modelUrl && isActive) {
                    setModelUrl(data.modelUrl);
                    setMaterialUrl(data.mtlUrl ?? null);
                    setModelType(data.modelExt ?? null);
                    setWatcherStatus("done");
                }
            } catch (error) {
                if (isActive) {
                    setModelError(
                        error instanceof Error
                            ? error.message
                            : "Не удалось проверить папку результатов.",
                    );
                }
            }
        };

        void poll();
        const interval = window.setInterval(poll, WATCHER_POLL_INTERVAL_MS);

        return () => {
            isActive = false;
            window.clearInterval(interval);
        };
    }, [watcherStatus, modelCode]);


    useEffect(() => {
        if (deviceStatus !== "searching") return;

        let isActive = true;
        const poll = async () => {
            try {
                if (!navigator.mediaDevices?.enumerateDevices) {
                    if (isActive) {
                        setDeviceStatus("not_found");
                        setDeviceError("Браузер не поддерживает поиск камер.");
                    }
                    return;
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                const hasCamera = devices.some(
                    (device) =>
                        device.kind === "videoinput" &&
                        device.label?.toLowerCase().includes("shining-uvc"),
                );
                if (isActive) {
                    setDeviceStatus(hasCamera ? "found" : "searching");
                }
            } catch (error) {
                if (isActive) {
                    setDeviceStatus("not_found");
                    setDeviceError(
                        error instanceof Error
                            ? error.message
                            : "Не удалось получить список устройств.",
                    );
                }
            }
        };

        void poll();
        const interval = window.setInterval(poll, 1500);

        return () => {
            isActive = false;
            window.clearInterval(interval);
        };
    }, [deviceStatus]);

    const previewUrl = storedModelUrl ?? modelUrl;
    const previewType = previewUrl
        ? getExtensionFromUrl(previewUrl) ?? modelType
        : modelType;
    const previewMaterialUrl =
        previewType === "obj"
            ? previewUrl === modelUrl
                ? materialUrl
                : previewUrl?.replace(/\.obj$/i, ".mtl") ?? null
            : null;

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={<ArrowLeft className="w-4 h-4" />}
                        onClick={() => navigate(-1)}
                    >
                        Назад
                    </Button>
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                            Capture session
                        </p>
                        <h1 className="text-2xl font-black text-textDark">
                            {artifactName ?? "Артефакт"}
                        </h1>
                    </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/60 px-4 py-3 text-sm">
                    <p className="font-semibold text-textDark">
                        Подключение к устройству
                    </p>
                    <p className="text-secondary text-xs mt-0.5">
                        Пользователь: {user?.email ?? "не авторизован"}
                    </p>
                </div>
            </header>

            <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        Устройство и запуск программы
                    </p>
                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-textDark">
                                    Поиск устройства
                                </p>
                                <p className="text-xs text-secondary">
                                    Подключение к SHINING 3D SE V2
                                </p>
                            </div>
                            <Button
                                variant={
                                    deviceStatus === "found"
                                        ? "primary"
                                        : deviceStatus === "not_found"
                                          ? "destructive"
                                          : "outline"
                                }
                                onClick={handleFindDevice}
                                className={
                                    deviceStatus === "found"
                                        ? "bg-green-600 hover:bg-green-700 text-white border-none"
                                        : deviceStatus === "not_found"
                                          ? "bg-red-600 hover:bg-red-700 text-white border-none"
                                          : ""
                                }
                                disabled={deviceStatus === "searching"}
                                iconLeft={
                                    deviceStatus === "searching" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ScanSearch className="w-4 h-4" />
                                    )
                                }
                            >
                                {deviceStatus === "found"
                                    ? "Устройство найдено"
                                    : deviceStatus === "searching"
                                      ? "Поиск..."
                                      : deviceStatus === "not_found"
                                        ? "Повторить поиск"
                                        : "Найти устройство"}
                            </Button>
                        </div>
                        <div
                            className={`rounded-xl border border-dashed px-3 py-3 text-xs transition-colors ${
                                deviceStatus === "found"
                                    ? "border-green-500/30 bg-green-500/5 text-green-700"
                                    : deviceStatus === "not_found"
                                      ? "border-red-500/30 bg-red-500/5 text-red-700"
                                      : "border-primary/30 bg-primary/5 text-secondary"
                            }`}
                        >
                            {deviceStatus === "found" &&
                                "Устройство SHINING-UVC подключено. Дальнейшее сканирование выполняется через внешнюю программу."}
                            {deviceStatus === "searching" &&
                                "Идет поиск камеры SHINING-UVC. Подключите устройство и дождитесь результата."}
                            {deviceStatus === "not_found" &&
                                "Камера SHINING-UVC не найдена. Проверьте подключение и права доступа."}
                            {deviceStatus === "idle" &&
                                "Нажмите «Найти устройство», чтобы проверить доступность устройства."}
                            {deviceError && (
                                <span className="block mt-2 text-[11px] font-medium">
                                    Ошибка: {deviceError}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-4 space-y-2">
                        <p className="text-sm font-semibold text-textDark">
                            Запуск внешней программы
                        </p>
                        <p className="text-sm text-secondary">
                            Перейдите в программу обработки. Там выполняется
                            съемка и создание 3D-модели. После завершения
                            вернитесь на эту страницу и запустите watcher.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-secondary">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            Программа будет доступна позднее. Сейчас это
                            заглушка.
                        </div>
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-white px-4 py-4 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-textDark">
                                    Watcher
                                </p>
                                <p className="text-xs text-secondary">
                                    Мониторинг папки на выход модели
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handleWatcher}
                                    disabled={watcherStatus === "watching"}
                                >
                                    {watcherStatus === "watching"
                                        ? "Поиск..."
                                        : "Запустить watcher"}
                                </Button>
                                {watcherStatus !== "idle" && (
                                    <Button
                                        variant="outline"
                                        onClick={handleResetWatcher}
                                        disabled={watcherStatus === "watching"}
                                        iconLeft={
                                            <RefreshCcw className="w-4 h-4" />
                                        }
                                    >
                                        Сброс
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="space-y-1 text-sm text-secondary">
                                <span className="font-medium text-textDark">
                                    Код модели
                                </span>
                                <input
                                    type="text"
                                    value={modelCode}
                                    onChange={(event) =>
                                        handleModelCodeChange(
                                            event.target.value,
                                        )
                                    }
                                    placeholder='Например, "8123"'
                                    className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-2 text-textDark focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                                />
                                <span className="text-xs text-secondary/70">
                                    Назовите файл модели так же, например:
                                    8123.glb
                                </span>
                            </label>
                            <div className="rounded-2xl border border-black/5 bg-background/80 p-3 text-xs text-secondary/80">
                                Если код указан, watcher ищет файл с этим
                                именем. Если пусто — берется последняя модель.
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between text-xs text-secondary">
                                <span>Статус: </span>
                                <span>
                                    {watcherStatus === "idle" &&
                                        "ожидание запуска"}
                                    {watcherStatus === "watching" &&
                                        "обработка и ожидание результата"}
                                    {watcherStatus === "done" &&
                                        "модель найдена"}
                                    {watcherStatus === "not_found" &&
                                        "файл модели не найден"}
                                </span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-black/10">
                                <div
                                    className="h-2 rounded-full bg-primary transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="mt-1 text-[11px] text-secondary">
                                Путь: {WATCHER_RESULTS_PATH}
                            </div>
                        </div>

                        {watcherStatus === "watching" && (
                            <div className="flex items-center gap-2 text-xs text-secondary">
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                Обработка идет, ожидаем файл .obj/.glb/.gltf
                            </div>
                        )}

                        {watcherStatus === "done" &&
                            previewUrl &&
                            previewType === "obj" && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Модель готова и доступна в viewer
                                    </div>
                                    <div className="rounded-2xl border border-black/10 bg-white/80 p-3">
                                        <ObjModelViewer
                                            objUrl={previewUrl}
                                            mtlUrl={previewMaterialUrl}
                                            height={320}
                                        />
                                    </div>
                                    <div className="text-[11px] text-secondary">
                                        Управление: ЛКМ — вращение, колесо —
                                        зум, Shift + ЛКМ — панорама.
                                    </div>
                                </div>
                            )}
                        {watcherStatus === "done" &&
                            previewUrl &&
                            previewType &&
                            previewType !== "obj" && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Модель готова и доступна в viewer
                                    </div>
                                    <div className="rounded-2xl border border-black/10 bg-white/80 p-3">
                                        <HtmlModelViewer
                                            src={previewUrl}
                                            alt="Artifact 3D preview"
                                            camera-controls
                                            autoplay
                                            ar
                                            style={{
                                                width: "100%",
                                                height: "320px",
                                                background: "transparent",
                                            }}
                                        />
                                    </div>
                                    <div className="text-[11px] text-secondary">
                                        Управление: ЛКМ — вращение, колесо —
                                        зум, Shift + ЛКМ — панорама.
                                    </div>
                                </div>
                            )}
                        {watcherStatus === "done" && !previewUrl && (
                            <div className="text-xs text-secondary">
                                Модель не найдена. Проверьте папку результатов.
                            </div>
                        )}
                        {watcherStatus === "not_found" && (
                            <div className="text-xs text-secondary">
                                Файл модели не найден за время ожидания.
                            </div>
                        )}
                        {modelError && (
                            <div className="text-xs text-red-600">
                                Ошибка watcher: {modelError}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                            Информация
                        </p>
                        <div className="space-y-3 text-sm text-secondary">
                            <p>
                                Съемка и сборка 3D-модели выполняется внешней
                                программой. Этот экран показывает статус
                                устройства и ожидание результата.
                            </p>
                            <div className="rounded-2xl border border-black/5 bg-background/80 p-3 text-xs text-secondary/80">
                                Поддерживаемые форматы: .obj, .mtl, .png, .jpg, .jpeg, .glb, .gltf
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm space-y-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Локальное хранение
                            </p>
                            <div className="mt-2 rounded-2xl border border-black/5 bg-background/80 p-3 text-xs text-secondary/80">
                                Файлы модели сохраняются в C:\\Users\\Acer\\Documents\\Apex\\FLL\\Local_Storage\\{artifactId} и доступны через /@fs.
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocalUploadModalOpen(true)}
                            >
                                Выбрать файлы
                            </Button>
                        </div>

                        {storedModelUrl ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-700 space-y-2">
                                <div className="flex items-center gap-2 font-semibold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Модель сохранена локально
                                </div>
                                <div className="truncate text-[11px] text-emerald-700/80">
                                    {storedModelUrl}
                                </div>
                                <a
                                    href={storedModelUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-[11px] text-emerald-700 hover:underline"
                                >
                                    Открыть ссылку
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-black/5 bg-background/80 p-3 text-xs text-secondary/80">
                                Ссылка на 3D-модель еще не сохранена.
                            </div>
                        )}

                        {localError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                {localError}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {localUploadModalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-lg space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                    Загрузка 3D файла
                                </p>
                                <p className="text-sm font-semibold text-textDark">
                                    Выберите файлы для локального хранения
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setLocalUploadModalOpen(false);
                                    setLocalFiles([]);
                                    setLocalError(null);
                                }}
                            >
                                Закрыть
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <input
                                type="file"
                                multiple
                                accept=".obj,.mtl,.png,.jpg,.jpeg,.glb,.gltf"
                                onChange={(event) =>
                                    setLocalFiles(
                                        Array.from(event.target.files ?? []),
                                    )
                                }
                                className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-textDark"
                            />
                            <p className="text-xs text-secondary/70">
                                Поддерживаемые форматы: .obj, .mtl, .png, .jpg, .jpeg, .glb, .gltf
                            </p>
                        </div>

                        {localError && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                {localError}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setLocalUploadModalOpen(false);
                                    setLocalFiles([]);
                                    setLocalError(null);
                                }}
                            >
                                Отмена
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleLocalFileUpload}
                                disabled={!localFiles.length || localUploading}
                                iconLeft={
                                    localUploading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CloudUpload className="w-4 h-4" />
                                    )
                                }
                            >
                                {localUploading ? "Загрузка..." : "Загрузить"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



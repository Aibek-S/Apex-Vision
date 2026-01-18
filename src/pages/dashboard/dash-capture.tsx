import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    RefreshCcw,
    ScanSearch,
} from "lucide-react";
import { Button } from "../../components/UI/button";
import ObjModelViewer from "../../components/canvas/ObjModelViewer";
import { useAuth } from "../../contexts/useAuth";

const WATCHER_RESULTS_PATH =
    "C:\\Users\\Acer\\Documents\\Apex\\FLL\\watcher_3d\\projects\\results";
const WATCHER_API_URL = "/api/watcher/latest";
const WATCHER_POLL_INTERVAL_MS = 1000;
const WATCHER_DURATION_MS = 9000;
const WATCHER_INTERVAL_MS = 300;
const HtmlModelViewer = "model-viewer" as any;

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

    const artifactName =
        (location.state as { artifactName?: string } | undefined)
            ?.artifactName || "Артефакт";

    useEffect(() => {
        if (!artifactId) return;
        const stored = window.localStorage.getItem(
            `artifactModelCode:${artifactId}`
        );
        if (stored) {
            setModelCode(stored);
        }
    }, [artifactId]);

    const handleModelCodeChange = (value: string) => {
        setModelCode(value);
        if (!artifactId) return;
        window.localStorage.setItem(`artifactModelCode:${artifactId}`, value);
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
                            : "Нет доступа к камере."
                    );
                    return;
                }
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasCamera = devices.some(
                (device) =>
                    device.kind === "videoinput" &&
                    device.label?.toLowerCase().includes("shining-uvc")
            );

            setDeviceStatus(hasCamera ? "found" : "not_found");
        } catch (error) {
            setDeviceStatus("not_found");
            setDeviceError(
                error instanceof Error
                    ? error.message
                    : "Не удалось получить список устройств."
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
                Math.round((tick / totalTicks) * 100)
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
                          trimmedCode
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
                            : "Не удалось проверить папку результатов."
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
                        device.label?.toLowerCase().includes("shining-uvc")
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
                            : "Не удалось получить список устройств."
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
                                            event.target.value
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
                            modelUrl &&
                            modelType === "obj" && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Модель готова и доступна в viewer
                                    </div>
                                    <div className="rounded-2xl border border-black/10 bg-white/80 p-3">
                                        <ObjModelViewer
                                            objUrl={modelUrl}
                                            mtlUrl={materialUrl}
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
                            modelUrl &&
                            modelType &&
                            modelType !== "obj" && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Модель готова и доступна в viewer
                                    </div>
                                    <div className="rounded-2xl border border-black/10 bg-white/80 p-3">
                                        <HtmlModelViewer
                                            src={modelUrl}
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
                        {watcherStatus === "done" && !modelUrl && (
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
                                Поддерживаемые форматы: .obj, .glb, .gltf
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-5 text-sm text-secondary space-y-2">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            Интеграция watcher
                        </div>
                        <p>
                            Заглушка для будущей интеграции с программой
                            обработки. На проде watcher будет следить за
                            указанной папкой и автоматически обновлять превью.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}

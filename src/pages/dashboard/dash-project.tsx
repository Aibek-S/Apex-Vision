import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Globe, Lock } from "lucide-react";
import { Button } from "../../components/UI/button";
import { supabase } from "../../lib/supabase";
import type { Artifact } from "../../components/UI/artifact_card";
import { useAuth } from "../../contexts/useAuth";
import {
    createCaptureSession,
    getActiveSession,
    uploadSessionImage,
} from "../../services/captureService";

const PHOTO_BUCKET = "artifacts-images";

const resolveStoragePath = (value: string) => {
    if (!value) return value;
    if (value.startsWith("http")) {
        try {
            const url = new URL(value);
            const marker = "/storage/v1/object/";
            const idx = url.pathname.indexOf(marker);
            if (idx >= 0) {
                const tail = url.pathname.slice(idx + marker.length);
                const cleaned = tail
                    .replace(/^sign\//, "")
                    .replace(/^public\//, "");
                if (cleaned.startsWith(`${PHOTO_BUCKET}/`)) {
                    return cleaned.slice(PHOTO_BUCKET.length + 1);
                }
                return cleaned;
            }
        } catch {
            // fall through to raw value
        }
    }
    if (value.startsWith(`${PHOTO_BUCKET}/`)) {
        return value.slice(PHOTO_BUCKET.length + 1);
    }
    return value;
};

const statusLabels: Record<Artifact["status"], string> = {
    created: "Создан",
    processing: "В обработке",
    images_collected: "Изображения собраны",
    ready: "Готов",
    error: "Ошибка",
};

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString("ru-RU") : "—";

const formatDuration = (from?: string, to?: string | null) => {
    if (!from) return "—";
    const start = new Date(from);
    const end = to ? new Date(to) : new Date();
    const deltaMinutes = Math.max(
        0,
        Math.floor((end.getTime() - start.getTime()) / 1000 / 60)
    );
    if (deltaMinutes < 60) {
        return `${deltaMinutes} мин`;
    }
    const hours = Math.floor(deltaMinutes / 60);
    const minutes = deltaMinutes % 60;
    return `${hours} ч ${minutes} мин`;
};

type ProjectWithPublic = Omit<Artifact, "thumbnail_url"> & {
    is_public?: boolean;
    thumbnail_url?: string | null;
};

type MeasurementRecord = {
    cipher_id: string | null;
    dating: string | null;
    place_of_creation: string | null;
    publisher_name: string | null;
    length: number | null;
    width: number | null;
    height: number | null;
    weight: number | null;
    material: string | null;
    technique: string | null;
    cost: number | null;
    quantity: number | null;
    subject: string | null;
    legend: string | null;
    bibliography: string | null;
    report_author: string | null;
    condition_description: string | null;
    restoration_details: string | null;
};

const EMPTY_MEASUREMENT: MeasurementRecord = {
    cipher_id: null,
    dating: null,
    place_of_creation: null,
    publisher_name: null,
    length: null,
    width: null,
    height: null,
    weight: null,
    material: null,
    technique: null,
    cost: null,
    quantity: null,
    subject: null,
    legend: null,
    bibliography: null,
    report_author: null,
    condition_description: null,
    restoration_details: null,
};

export default function DashProject() {
    const { id: projectId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [project, setProject] = useState<ProjectWithPublic | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [measurement, setMeasurement] = useState<MeasurementRecord | null>(
        null
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingPublic, setUpdatingPublic] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const uploadInputRef = useRef<HTMLInputElement | null>(null);

    const fetchProject = useCallback(
        async (options?: { showLoading?: boolean }) => {
            if (!projectId) return;
            const shouldShowLoading = options?.showLoading !== false;
            if (shouldShowLoading) {
                setLoading(true);
            }
            const { data, error } = await supabase
                .from("artifacts")
                .select(
                    "id,name,status,created_at,updated_at,user_id,validation_status,image_count,last_capture_at,capture_mode,is_public,thumbnail_url"
                )
                .eq("id", projectId)
                .single();

            if (error) {
                setError(error.message);
            } else {
                setError(null);
                setProject(data ?? null);
            }

            if (!error) {
                const { data: measurementData } = await supabase
                    .from("artifact_measurements")
                    .select(
                        "cipher_id,dating,place_of_creation,publisher_name,length,width,height,weight,material,technique,cost,quantity,subject,legend,bibliography,report_author,condition_description,restoration_details"
                    )
                    .eq("artifact_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                setMeasurement(measurementData ?? null);
            }
            if (shouldShowLoading) {
                setLoading(false);
            }
        },
        [projectId]
    );

    useEffect(() => {
        fetchProject({ showLoading: true });
    }, [fetchProject]);

    useEffect(() => {
        if (!projectId) return;
        const channel = supabase
            .channel(`project-${projectId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "artifacts",
                    filter: `id=eq.${projectId}`,
                },
                () => {
                    fetchProject({ showLoading: false });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "artifact_measurements",
                    filter: `artifact_id=eq.${projectId}`,
                },
                () => {
                    fetchProject({ showLoading: false });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchProject, projectId]);

    const statusLabel = project
        ? statusLabels[project.status] ?? "Статус неизвестен"
        : "—";

    const handleBack = () => navigate(-1);
    const handleEdit = () => {
        if (!projectId) return;
        navigate(`/dashboard/projects/${projectId}/edit`);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        setSelectedFiles(files);
        setUploadError(null);
        setUploadSuccess(null);
    };

    const handleUploadImages = async () => {
        if (!projectId || !user || selectedFiles.length === 0) return;
        setUploading(true);
        setUploadError(null);
        setUploadSuccess(null);

        try {
            const activeSession = await getActiveSession(projectId);
            const session =
                activeSession ??
                (await createCaptureSession({
                    artifactId: projectId,
                    userId: user.id,
                    captureMode: "manual",
                    notes: "Manual upload from project page",
                }));

            for (const file of selectedFiles) {
                await uploadSessionImage({
                    file,
                    artifactId: projectId,
                    sessionId: session.id,
                    userId: user.id,
                });
            }

            setProject((prev) =>
                prev
                    ? {
                          ...prev,
                          image_count:
                              (prev.image_count ?? 0) + selectedFiles.length,
                          last_capture_at: new Date().toISOString(),
                          capture_mode: "manual",
                      }
                    : prev
            );
            setUploadSuccess(`Загружено изображений: ${selectedFiles.length}`);
            setSelectedFiles([]);
            if (uploadInputRef.current) {
                uploadInputRef.current.value = "";
            }
        } catch (err) {
            setUploadError(
                err instanceof Error
                    ? err.message
                    : "Не удалось загрузить изображения."
            );
        } finally {
            setUploading(false);
        }
    };

    const handleTogglePublic = async () => {
        if (!project || !projectId) return;

        // Only allow publishing if status is 'ready'
        if (project.status !== "ready" && !project.is_public) {
            alert(
                "Опубликовать можно только артефакты со статусом 'Готов'. Дождитесь завершения обработки."
            );
            return;
        }

        setUpdatingPublic(true);

        const newPublicState = !project.is_public;
        const { error } = await supabase
            .from("artifacts")
            .update({ is_public: newPublicState })
            .eq("id", projectId);

        if (error) {
            alert(`Ошибка обновления: ${error.message}`);
        } else {
            setProject({ ...project, is_public: newPublicState });
        }

        setUpdatingPublic(false);
    };

    const isOwner = user?.id === project?.user_id;
    const canPublish = project?.status === "ready";
    const measurementCurrent = measurement ?? EMPTY_MEASUREMENT;

    useEffect(() => {
        const loadThumbnail = async () => {
            if (!project?.thumbnail_url) {
                setThumbnailUrl(null);
                return;
            }
            if (project.thumbnail_url.startsWith("http")) {
                setThumbnailUrl(project.thumbnail_url);
                return;
            }
            const storagePath = resolveStoragePath(project.thumbnail_url);
            const { data, error } = await supabase.storage
                .from(PHOTO_BUCKET)
                .createSignedUrl(storagePath, 60 * 60);
            if (!error) {
                setThumbnailUrl(data.signedUrl);
            }
        };

        loadThumbnail();
    }, [project?.thumbnail_url]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<ArrowLeft className="w-4 h-4" />}
                    onClick={handleBack}
                >
                    Назад
                </Button>
                {project && (
                    <div className="flex flex-wrap gap-2 items-start">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEdit}
                        >
                            Редактировать карточку
                        </Button>
                    </div>
                )}
                <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        Детали проекта
                    </p>
                    <p className="text-sm text-secondary">
                        {project?.id ?? "Загрузка..."}
                    </p>
                </div>
            </div>

            {loading && (
                <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
                    <Clock3 className="h-4 w-4 animate-spin" />
                    Получаем данные проекта…
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    Не удалось загрузить проект: {error}
                </div>
            )}

            {!loading && project && (
                <div className="space-y-5 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Текущий артефакт
                            </p>
                            <h1 className="text-2xl font-black text-textDark">
                                {project.name || "Безымянный проект"}
                            </h1>
                        </div>

                        {isOwner && (
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-backgroundLight/60 px-3 py-2">
                                    {project.is_public ? (
                                        <>
                                            <Globe className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-primary">
                                                Публичный
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4 text-secondary" />
                                            <span className="text-xs font-bold text-secondary">
                                                Приватный
                                            </span>
                                        </>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleTogglePublic}
                                    disabled={
                                        updatingPublic ||
                                        (!canPublish && !project.is_public)
                                    }
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        project.is_public
                                            ? "bg-primary"
                                            : "bg-secondary/30"
                                    } ${
                                        updatingPublic ||
                                        (!canPublish && !project.is_public)
                                            ? "opacity-50 cursor-not-allowed"
                                            : "cursor-pointer"
                                    }`}
                                    title={
                                        !canPublish && !project.is_public
                                            ? "Опубликовать можно только готовые артефакты"
                                            : "Публиковать в галерее"
                                    }
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            project.is_public
                                                ? "translate-x-6"
                                                : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Статус
                            </p>
                            <p className="text-lg font-semibold text-textDark">
                                {statusLabel}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Время выполнения
                            </p>
                            <p className="text-lg font-semibold text-secondary">
                                {formatDuration(
                                    project.created_at,
                                    project.updated_at
                                )}
                            </p>
                        </div>
                    </div>

                    <dl className="flex flex-col gap-3 text-sm text-secondary">
                        <div className="flex justify-between">
                            <dt className="font-semibold text-textDark">
                                ID проекта
                            </dt>
                            <dd>{project.id}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="font-semibold text-textDark">
                                Создан
                            </dt>
                            <dd>{formatDate(project.created_at)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="font-semibold text-textDark">
                                Последнее обновление
                            </dt>
                            <dd>{formatDate(project.updated_at)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="font-semibold text-textDark">
                                Последняя съемка
                            </dt>
                            <dd>{formatDate(project.last_capture_at)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="font-semibold text-textDark">
                                Ответственный
                            </dt>
                            <dd>{project.user_id ?? "—"}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="font-semibold text-textDark">
                                Валидация
                            </dt>
                            <dd>{project.validation_status ?? "pending"}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="font-semibold text-textDark">
                                Фото
                            </dt>
                            <dd>{project.image_count ?? 0}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="font-semibold text-textDark">
                                Режим захвата
                            </dt>
                            <dd>{project.capture_mode ?? "—"}</dd>
                        </div>
                    </dl>
                </div>
            )}

            {!loading && project && (
                <div className="space-y-5 rounded-2xl border border-white/60 bg-white/70 p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Карточка артефакта
                            </p>
                            <h2 className="text-xl font-bold text-textDark">
                                Детали отчета
                            </h2>
                        </div>
                        {thumbnailUrl && (
                            <img
                                src={thumbnailUrl}
                                alt="Фото артефакта"
                                className="w-40 h-28 object-cover rounded-xl border border-black/10"
                            />
                        )}
                    </div>

                    {isOwner && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-black/5 bg-backgroundLight/60 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    ref={uploadInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    className="block text-sm text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-primary"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleUploadImages}
                                    disabled={
                                        uploading || selectedFiles.length === 0
                                    }
                                >
                                    Загрузить фото
                                </Button>
                                <span className="text-xs text-secondary/70">
                                    {selectedFiles.length > 0
                                        ? `Выбрано: ${selectedFiles.length}`
                                        : "Выберите изображения"}
                                </span>
                            </div>
                            {uploadError && (
                                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                    {uploadError}
                                </div>
                            )}
                            {uploadSuccess && (
                                <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                                    {uploadSuccess}
                                </div>
                            )}
                        </div>
                    )}

                    {!measurement && (
                        <p className="text-sm text-secondary/70">
                            Дополнительные поля отчета пока не заполнены.
                        </p>
                    )}

                    {measurement && (
                        <div className="grid gap-4 md:grid-cols-2 text-sm text-secondary">
                            <Detail
                                label="Шифр"
                                value={measurementCurrent.cipher_id}
                            />
                            <Detail
                                label="Датировка"
                                value={measurementCurrent.dating}
                            />
                            <Detail
                                label="Место изготовления"
                                value={measurementCurrent.place_of_creation}
                            />
                            <Detail
                                label="Шебер / издатель"
                                value={measurementCurrent.publisher_name}
                            />
                            <Detail
                                label="Длина (мм)"
                                value={measurementCurrent.length}
                            />
                            <Detail
                                label="Ширина (мм)"
                                value={measurementCurrent.width}
                            />
                            <Detail
                                label="Высота (мм)"
                                value={measurementCurrent.height}
                            />
                            <Detail
                                label="Вес (г)"
                                value={measurementCurrent.weight}
                            />
                            <Detail
                                label="Материал"
                                value={measurementCurrent.material}
                            />
                            <Detail
                                label="Техника"
                                value={measurementCurrent.technique}
                            />
                            <Detail
                                label="Стоимость"
                                value={measurementCurrent.cost}
                            />
                            <Detail
                                label="Количество"
                                value={measurementCurrent.quantity}
                            />
                            <Detail
                                label="Тема"
                                value={measurementCurrent.subject}
                            />
                            <Detail
                                label="Легенда"
                                value={measurementCurrent.legend}
                            />
                            <Detail
                                label="Библиография"
                                value={measurementCurrent.bibliography}
                            />
                            <Detail
                                label="Автор отчета"
                                value={measurementCurrent.report_author}
                            />
                            <Detail
                                label="Состояние"
                                value={measurementCurrent.condition_description}
                            />
                            <Detail
                                label="Реставрация"
                                value={measurementCurrent.restoration_details}
                            />
                        </div>
                    )}
                    <div className="pt-4 border-t border-black/5">
                        <Button
                            variant="ghost"
                            size="sm"
                            iconLeft={<ArrowLeft className="w-4 h-4" />}
                            onClick={handleBack}
                        >
                            Назад к списку
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

type DetailProps = {
    label: string;
    value?: string | number | null;
};

const formatDetailValue = (value?: string | number | null) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "number") return String(value);
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "—";
};

function Detail({ label, value }: DetailProps) {
    const [isOpen, setIsOpen] = useState(false);
    const displayValue = formatDetailValue(value);
    const isLongText = displayValue !== "—" && displayValue.length > 40;

    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-[0.2em] text-secondary/60">
                {label}
            </span>
            <div className="relative">
                {isLongText ? (
                    <>
                        <button
                            type="button"
                            className="w-full text-left text-sm text-textDark truncate cursor-pointer"
                            title={displayValue}
                            aria-expanded={isOpen}
                            onClick={() => setIsOpen((prev) => !prev)}
                            onBlur={() => setIsOpen(false)}
                            onKeyDown={(event) => {
                                if (event.key === "Escape") {
                                    setIsOpen(false);
                                }
                            }}
                        >
                            {displayValue}
                        </button>
                        {isOpen && (
                            <div className="absolute z-10 mt-2 max-w-sm rounded-lg border border-black/10 bg-white p-3 text-xs text-textDark shadow-lg">
                                {displayValue}
                            </div>
                        )}
                    </>
                ) : (
                    <span className="text-sm text-textDark">
                        {displayValue}
                    </span>
                )}
            </div>
        </div>
    );
}

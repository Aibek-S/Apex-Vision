import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Globe, Lock } from "lucide-react";
import { Button } from "../../components/UI/button";
import { supabase } from "../../lib/supabase";
import type { Artifact } from "../../components/UI/artifact_card";
import { useAuth } from "../../contexts/useAuth";

const statusLabels: Record<Artifact["status"], string> = {
    created: "Создан",
    processing: "В обработке",
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

type ProjectWithPublic = Artifact & {
    is_public?: boolean;
};

export default function DashProject() {
    const { id: projectId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [project, setProject] = useState<ProjectWithPublic | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingPublic, setUpdatingPublic] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from("artifacts")
                .select(
                    "id,name,status,created_at,updated_at,user_id,validation_status,image_count,last_capture_at,capture_mode,is_public"
                )
                .eq("id", projectId)
                .single();

            if (error) {
                setError(error.message);
            } else {
                setProject(data ?? null);
            }
            setLoading(false);
        };

        if (projectId) {
            fetchProject();
        }
    }, [projectId]);

    const statusLabel = project
        ? statusLabels[project.status] ?? "Статус неизвестен"
        : "—";

    const handleBack = () => navigate(-1);
    const handleCapture = () => {
        if (!projectId) return;
        navigate(`/dashboard/projects/${projectId}/capture`, {
            state: { artifactName: project?.name },
        });
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
                    <Button variant="primary" size="sm" onClick={handleCapture}>
                        Начать съемку
                    </Button>
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
        </div>
    );
}

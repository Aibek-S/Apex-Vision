import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Clock,
    AlertCircle,
    Loader2,
    CheckCircle2,
    ArrowRight,
    Camera,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

/**
 * Типы статусов артефакта, соответствующие значениям в таблице artifacts
 */
export type ArtifactStatus = "created" | "processing" | "error" | "ready";

/**
 * Интерфейс артефакта из Supabase
 */
export interface Artifact {
    id: string;
    name: string;
    status: ArtifactStatus;
    validation_status?: string;
    image_count?: number;
    created_at: string;
    updated_at?: string;
    user_id?: string;
    thumbnail_url?: string;
    last_capture_at?: string | null;
    capture_mode?: string | null;
}

interface ArtifactCardProps {
    artifact: Artifact;
    onClick?: (artifact: Artifact) => void;
    onCapture?: (artifact: Artifact) => void;
}

/**
 * Конфигурация отображения статусов
 */
const statusConfig = {
    created: {
        label: "Создан",
        color: "text-secondary bg-secondary/10 border-secondary/20",
        icon: <Box className="w-4 h-4" />,
    },
    processing: {
        label: "В обработке",
        color: "text-primary bg-primary/10 border-primary/20",
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
    },
    error: {
        label: "Ошибка",
        color: "text-red-500 bg-red-50/50 border-red-100",
        icon: <AlertCircle className="w-4 h-4" />,
    },
    ready: {
        label: "Готов",
        color: "text-emerald-600 bg-emerald-50 border-emerald-100",
        icon: <CheckCircle2 className="w-4 h-4" />,
    },
};

/**
 * Компонент карточки артефакта с поддержкой Realtime обновлений из базы
 */
export const ArtifactCard: React.FC<ArtifactCardProps> = ({
    artifact: initialArtifact,
    onClick,
    onCapture,
}) => {
    const navigate = useNavigate();
    // Используем локальный стейт, чтобы карточка могла обновляться в реальном времени
    const [artifact, setArtifact] = useState<Artifact>(initialArtifact);

    const config = statusConfig[artifact.status] || statusConfig.created;

    // Подписка на изменения конкретно этого артефакта в Supabase
    useEffect(() => {
        const channel = supabase
            .channel(`artifact-changes-${artifact.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "artifacts",
                    filter: `id=eq.${artifact.id}`,
                },
                (payload) => {
                    // Если данные в базе изменились (например, AI закончил обработку), обновляем карточку
                    setArtifact(payload.new as Artifact);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [artifact.id]);

    // Хелпер для форматирования времени
    const getTimeAgo = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor(
                (now.getTime() - date.getTime()) / 1000
            );
            if (diffInSeconds < 60) return "только что";
            if (diffInSeconds < 3600)
                return `${Math.floor(diffInSeconds / 60)} мин. назад`;
            if (diffInSeconds < 86400)
                return `${Math.floor(diffInSeconds / 3600)} ч. назад`;
            return date.toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
            });
        } catch {
            return "недавно";
        }
    };

    const handleClick = () => {
        if (onClick) {
            onClick(artifact);
        } else {
            navigate(`/artifacts/${artifact.id}`);
        }
    };

    return (
        <div
            onClick={handleClick}
            className="bg-white/80 backdrop-blur-md border border-white/60 rounded-3xl p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 group cursor-pointer flex flex-col gap-4"
        >
            {/* Thumbnail Placeholder/Image */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-backgroundLight border border-black/5">
                {artifact.thumbnail_url ? (
                    <img
                        src={artifact.thumbnail_url}
                        alt={artifact.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
                        <Box className="w-10 h-10 text-primary/20" />
                    </div>
                )}

                {/* Status Badge Overlay */}
                <div
                    className={`absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-black border shadow-sm backdrop-blur-md ${config.color}`}
                >
                    {config.icon}
                    {config.label}
                </div>
            </div>

            <div className="space-y-3 flex-1 px-1">
                <div className="space-y-1">
                    <h3 className="font-bold text-textDark text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                        {artifact.name || "Безымянный проект"}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-[11px] uppercase font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-black/5 text-secondary/70">
                            Валидация: {artifact.validation_status ?? "pending"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/5 text-secondary/70">
                            Фото: {artifact.image_count ?? 0}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-secondary/70 text-xs font-medium">
                        <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{getTimeAgo(artifact.created_at)}</span>
                        </div>
                        {artifact.updated_at && (
                            <div className="flex items-center gap-1 border-l border-secondary/20 pl-4">
                                <span>
                                    Обновлено:{" "}
                                    {new Date(
                                        artifact.updated_at
                                    ).toLocaleDateString("ru-RU")}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {onCapture && (
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onCapture(artifact);
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                    >
                        <Camera className="w-4 h-4" />
                        Начать съемку
                    </button>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                    <span className="text-[10px] text-secondary/50 uppercase font-bold tracking-widest">
                        Нажмите чтобы открыть
                    </span>
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                        <ArrowRight className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ArtifactCard;

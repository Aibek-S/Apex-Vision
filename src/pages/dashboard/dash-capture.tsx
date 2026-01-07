import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { Button } from "../../components/UI/button";
import { useAuth } from "../../contexts/useAuth";
import { useCapture } from "../../hooks/useCapture";
import type { Database } from "../../types/supabase";

type CaptureMode = Database["public"]["Enums"]["capture_mode"];

const modeOptions: {
    value: CaptureMode;
    label: string;
    description: string;
}[] = [
    {
        value: "manual",
        label: "Manual Upload",
        description: "Загружайте фотографии прямо с компьютера",
    },
    {
        value: "device",
        label: "Device Capture (ESP)",
        description:
            "Подключитесь к устройству и дождитесь завершения сканирования",
    },
];

export default function DashCapture() {
    const { id: artifactId } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedMode, setSelectedMode] = useState<CaptureMode>("manual");
    const [notes, setNotes] = useState("");

    const {
        session,
        images,
        loading,
        uploading,
        uploadQueue,
        error,
        hasSession,
        startSession,
        uploadFiles,
        finishSession,
        abortSession,
    } = useCapture({
        artifactId: artifactId ?? "",
        userId: user?.id,
    });

    const sessionStatus = useMemo(() => {
        if (!session) return "Сессия не начата";
        if (session.status === "completed") return "Сессия завершена";
        if (session.status === "failed") return "Сессия отменена";
        return "Сессия активна";
    }, [session]);

    const handleStartSession = async () => {
        await startSession(selectedMode, notes);
    };

    const artifactName =
        (location.state as { artifactName?: string } | undefined)
            ?.artifactName || "Артефакт";

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

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (!event.target.files) return;
        await uploadFiles(event.target.files);
        event.target.value = "";
    };

    const manualModeActive =
        session?.capture_mode === "manual" ||
        (!session && selectedMode === "manual");

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
                        {sessionStatus}
                    </p>
                    {session && (
                        <p className="text-secondary text-xs mt-0.5">
                            Загружено изображений: {session.uploaded_images}
                        </p>
                    )}
                </div>
            </header>

            <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                        Режимы
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                        {modeOptions.map((mode) => {
                            const isActive =
                                session?.capture_mode === mode.value ||
                                (!session && selectedMode === mode.value);
                            return (
                                <button
                                    type="button"
                                    key={mode.value}
                                    onClick={() => setSelectedMode(mode.value)}
                                    disabled={
                                        !!session &&
                                        session.capture_mode !== mode.value
                                    }
                                    className={`rounded-2xl border px-4 py-5 text-left transition-all ${
                                        isActive
                                            ? "border-primary/40 bg-primary/5 shadow-sm"
                                            : "border-black/10 hover:border-primary/20"
                                    }`}
                                >
                                    <p className="font-bold text-textDark">
                                        {mode.label}
                                    </p>
                                    <p className="text-sm text-secondary mt-1">
                                        {mode.description}
                                    </p>
                                    {mode.value === "device" && (
                                        <p className="mt-3 text-xs text-secondary/70">
                                            Заглушка: UI готов, интеграция с ESP
                                            в разработке.
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {!hasSession && (
                        <div className="space-y-3">
                            <label className="text-sm text-secondary flex flex-col gap-1">
                                <span>Комментарий (необязательно)</span>
                                <textarea
                                    rows={3}
                                    placeholder="Например, условия съемки"
                                    value={notes}
                                    onChange={(event) =>
                                        setNotes(event.target.value)
                                    }
                                    className="rounded-xl border border-black/5 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                                />
                            </label>
                            <Button
                                onClick={handleStartSession}
                                disabled={loading}
                            >
                                {loading && (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                )}
                                Запустить сессию
                            </Button>
                        </div>
                    )}

                    {manualModeActive && hasSession && (
                        <div className="mt-6 space-y-4">
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                                Upload images
                            </p>
                            <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-black/10 bg-backgroundLight/60 px-6 py-10 text-center cursor-pointer hover:border-primary/30 transition-all">
                                <UploadCloud className="w-10 h-10 text-primary" />
                                <div>
                                    <p className="font-semibold text-textDark">
                                        Перетащите фотографии сюда
                                    </p>
                                    <p className="text-sm text-secondary">
                                        .jpg, .png, .webp, до 10 МБ за файл
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            {uploading && (
                                <div className="flex items-center gap-3 text-sm text-secondary">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    Загружаем файлы ({uploadQueue})
                                </div>
                            )}
                        </div>
                    )}

                    {session && (
                        <div className="flex flex-wrap gap-3 mt-6">
                            <Button
                                variant="primary"
                                onClick={finishSession}
                                disabled={
                                    loading || session.status === "completed"
                                }
                            >
                                Завершить сессию
                            </Button>
                            <Button
                                variant="outline"
                                onClick={abortSession}
                                disabled={loading}
                            >
                                Отменить
                            </Button>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.3em] text-secondary">
                            История загрузок
                        </p>
                        {images.length === 0 ? (
                            <div className="py-10 text-center text-secondary/70">
                                <p>Пока нет изображений</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-black/5 mt-4">
                                {images.map((image) => (
                                    <li
                                        key={image.id}
                                        className="flex items-center justify-between py-3 text-sm"
                                    >
                                        <div>
                                            <p className="font-semibold text-textDark">
                                                {image.storage_path
                                                    .split("/")
                                                    .pop()}
                                            </p>
                                            <p className="text-xs text-secondary">
                                                Загружено:{" "}
                                                {new Date(
                                                    image.uploaded_at
                                                ).toLocaleString("ru-RU")}
                                            </p>
                                        </div>
                                        <p className="text-xs text-secondary/80">
                                            {(
                                                image.file_size /
                                                (1024 * 1024)
                                            ).toFixed(2)}{" "}
                                            МБ
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-5 text-sm text-secondary space-y-2">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                            <CheckCircle2 className="w-4 h-4" />
                            ESP-интеграция
                        </div>
                        <p>
                            Этот блок служит заглушкой: здесь появится статус
                            онлайн-устройства, лог загрузок и кнопка
                            подтверждения завершения сканирования.
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
